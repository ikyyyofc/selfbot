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
            "❌ *Format salah!*\n\n📱 Gunakan: .getsession <nomor>\n\n*Contoh:*\n.getsession 628123456789"
        );
    }

    const cleanNumber = targetNumber.replace(/[^0-9]/g, "");

    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
        return await reply("❌ *Nomor tidak valid!*\n\nPastikan nomor yang dimasukkan benar.");
    }

    if (activeSessions.has(m.sender)) {
        return await reply(
            "⚠️ *Kamu sudah memiliki sesi aktif!*\n\nTunggu hingga sesi sebelumnya selesai."
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

    await reply(
        `🔄 *Memulai koneksi...*\n\n📱 Nomor: ${cleanNumber}\n⏳ Tunggu sebentar...`
    );

    activeSessions.set(m.sender, true);

    let tempSock = null;
    let connectionTimeout = null;

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
            version
        });

        tempSock.ev.on("creds.update", saveCreds);

        connectionTimeout = setTimeout(async () => {
            if (tempSock) {
                tempSock.end();
            }
            activeSessions.delete(m.sender);
            cleanupSession(tempSessionDir);
            await reply("⏰ *Waktu koneksi habis!*\n\nSilakan coba lagi.");
        }, 120000);

        tempSock.ev.on("connection.update", async update => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                clearTimeout(connectionTimeout);

                await reply(
                    `✅ *Koneksi berhasil!*\n\n⏳ Mengirim file session dalam 5 detik...`
                );

                setTimeout(async () => {
                    try {
                        const credsPath = path.join(
                            tempSessionDir,
                            "creds.json"
                        );

                        if (!fs.existsSync(credsPath)) {
                            throw new Error("File creds.json tidak ditemukan");
                        }

                        const targetJid = `${cleanNumber}@s.whatsapp.net`;

                        await sock.sendMessage(targetJid, {
                            document: fs.readFileSync(credsPath),
                            fileName: "creds.json",
                            mimetype: "application/json",
                            caption: `✅ *Session Bot WhatsApp*\n\n📱 Nomor: ${cleanNumber}\n⏰ ${new Date().toLocaleString(
                                "id-ID",
                                { timeZone: "Asia/Jakarta" }
                            )}\n\n⚠️ *JANGAN SHARE FILE INI KE SIAPAPUN!*`
                        });

                        await reply(
                            `✅ *Session berhasil dikirim!*\n\n📱 Dikirim ke: ${cleanNumber}\n📄 File: creds.json\n\n⚠️ Jangan share file tersebut ke siapapun!`
                        );

                        tempSock.end();
                        activeSessions.delete(m.sender);
                        cleanupSession(tempSessionDir);
                    } catch (error) {
                        await reply(
                            `❌ *Gagal mengirim session!*\n\nError: ${error.message}`
                        );
                        tempSock.end();
                        activeSessions.delete(m.sender);
                        cleanupSession(tempSessionDir);
                    }
                }, 5000);
            }

            if (connection === "close") {
                clearTimeout(connectionTimeout);
                const statusCode = new Boom(lastDisconnect?.error)?.output
                    ?.statusCode;

                if (
                    statusCode !== 401 &&
                    statusCode !== 403 &&
                    statusCode !== 515
                ) {
                    await reply(
                        "❌ *Koneksi terputus!*\n\nSilakan coba lagi."
                    );
                }

                activeSessions.delete(m.sender);
                cleanupSession(tempSessionDir);
            }
        });

        if (!tempSock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    const code = await tempSock.requestPairingCode(
                        cleanNumber
                    );

                    await reply(
                        `📱 *Pairing Code*\n\n🔑 Kode: *${code}*\n\n⏰ Masukkan kode ini di WhatsApp kamu:\n1. Buka WhatsApp\n2. Tap Menu (⋮) > Linked Devices\n3. Tap "Link a Device"\n4. Tap "Link with phone number instead"\n5. Masukkan kode: *${code}*\n\n⚠️ Kode berlaku 2 menit!`
                    );
                } catch (error) {
                    await reply(
                        `❌ *Gagal mendapatkan pairing code!*\n\nError: ${error.message}`
                    );
                    if (tempSock) {
                        tempSock.end();
                    }
                    activeSessions.delete(m.sender);
                    cleanupSession(tempSessionDir);
                }
            }, 3000);
        }
    } catch (error) {
        clearTimeout(connectionTimeout);
        await reply(`❌ *Terjadi kesalahan!*\n\nError: ${error.message}`);
        if (tempSock) {
            tempSock.end();
        }
        activeSessions.delete(m.sender);
        cleanupSession(tempSessionDir);
    }
};

function cleanupSession(sessionDir) {
    try {
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
    } catch (error) {
        console.error("Failed to cleanup session:", error.message);
    }
}