import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import makeWASocket, {
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    fetchLatestWaWebVersion,
    Browsers,
    DisconnectReason
} from "@whiskeysockets/baileys";
import Pino from "pino";
import { Boom } from "@hapi/boom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const activeSessions = new Map();

export default async ({ sock, m, args, reply }) => {
    const targetNumber = args[0];

    if (!targetNumber) {
        return await reply(
            "format salah bro\n\n.getsession <nomor>\n\ncontoh:\n.getsession 628123456789"
        );
    }

    const cleanNumber = targetNumber.replace(/[^0-9]/g, "");

    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
        return await reply("nomor ga valid deh");
    }

    if (activeSessions.has(cleanNumber)) {
        return await reply(
            "eh udah ada sesi aktif, tunggu yg sebelumnya kelar dulu"
        );
    }

    const tempSessionDir = path.join(
        __dirname,
        "..",
        "temp_sessions",
        `session_${Date.now()}`
    );

    if (!fs.existsSync(path.dirname(tempSessionDir))) {
        fs.mkdirSync(path.dirname(tempSessionDir), { recursive: true });
    }

    await reply(`mulai koneksi ke ${cleanNumber}\ntunggu bentar ya...`);

    activeSessions.set(cleanNumber, true);

    let tempSock = null;
    let connectionTimeout = null;
    let pairingTimeout = null;

    try {
        const { version } = await fetchLatestWaWebVersion();
        const { state, saveCreds } = await useMultiFileAuthState(
            tempSessionDir
        );

        tempSock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    Pino().child({ level: "fatal" })
                )
            },
            browser: Browsers.ubuntu("Chrome"),
            logger: Pino({ level: "silent" }),
            syncFullHistory: false,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true,
            version
        });

        tempSock.ev.on("creds.update", saveCreds);

        connectionTimeout = setTimeout(async () => {
            if (tempSock) {
                tempSock.end();
            }
            activeSessions.delete(cleanNumber);
            cleanupSession(tempSessionDir);
            await reply("waktu habis bro, coba lagi deh");
        }, 120000);

        tempSock.ev.on("connection.update", async update => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                clearTimeout(connectionTimeout);
                if (pairingTimeout) clearTimeout(pairingTimeout);

                await reply(
                    `koneksi sukses!\n\nkirim file session dalam 5 detik...`
                );

                setTimeout(async () => {
                    try {
                        const credsPath = path.join(
                            tempSessionDir,
                            "creds.json"
                        );

                        if (!fs.existsSync(credsPath)) {
                            throw new Error("creds.json ga ketemu");
                        }

                        const targetJid = `${cleanNumber}@s.whatsapp.net`;

                        await sock.sendMessage(targetJid, {
                            document: fs.readFileSync(credsPath),
                            fileName: "creds.json",
                            mimetype: "application/json",
                            caption: `session bot kamu\n\nnomor: ${cleanNumber}\nwaktu: ${new Date().toLocaleString(
                                "id-ID",
                                { timeZone: "Asia/Jakarta" }
                            )}\n\nJANGAN SHARE FILE INI!!!`
                        });

                        await reply(
                            `done! session udah dikirim ke ${cleanNumber}\n\njangan share ke siapapun ya!`
                        );

                        tempSock.end();
                        activeSessions.delete(cleanNumber);
                        cleanupSession(tempSessionDir);
                    } catch (error) {
                        await reply(
                            `gagal kirim session: ${error.message}`
                        );
                        tempSock.end();
                        activeSessions.delete(cleanNumber);
                        cleanupSession(tempSessionDir);
                    }
                }, 5000);
            }

            if (connection === "close") {
                clearTimeout(connectionTimeout);
                if (pairingTimeout) clearTimeout(pairingTimeout);
                
                const statusCode = new Boom(lastDisconnect?.error)?.output
                    ?.statusCode;

                let errorMsg = "koneksi putus, coba lagi";

                if (statusCode === 401) {
                    errorMsg = "sesi invalid, hapus session dulu";
                } else if (statusCode === 403) {
                    errorMsg = "diblokir/dibanned, ga bisa lanjut";
                } else if (statusCode === 515) {
                    errorMsg = "perlu restart, coba lagi";
                }

                if (
                    statusCode !== 401 &&
                    statusCode !== 403 &&
                    statusCode !== 515
                ) {
                    await reply(errorMsg);
                }

                activeSessions.delete(cleanNumber);
                cleanupSession(tempSessionDir);
            }
        });

        if (!tempSock.authState.creds.registered) {
            pairingTimeout = setTimeout(async () => {
                try {
                    const code = await tempSock.requestPairingCode(
                        cleanNumber
                    );

                    await reply(
                        `pairing code kamu:\n\n${code}\n\nmasukkin di wa:\n1. buka whatsapp\n2. menu > linked devices\n3. link a device\n4. link with phone number instead\n5. masukkin kode: ${code}\n\nkode berlaku 2 menit!`
                    );
                } catch (error) {
                    await reply(
                        `gagal dapetin pairing code: ${error.message}`
                    );
                    if (tempSock) {
                        tempSock.end();
                    }
                    activeSessions.delete(cleanNumber);
                    cleanupSession(tempSessionDir);
                }
            }, 3000);
        }
    } catch (error) {
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (pairingTimeout) clearTimeout(pairingTimeout);
        await reply(`error: ${error.message}`);
        if (tempSock) {
            tempSock.end();
        }
        activeSessions.delete(cleanNumber);
        cleanupSession(tempSessionDir);
    }
};

function cleanupSession(sessionDir) {
    try {
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
    } catch (error) {
        console.error("cleanup gagal:", error.message);
    }
}