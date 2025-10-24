import makeWASocket, {
    Browsers,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    jidNormalizedUser,
    fetchLatestWaWebVersion
} from "@whiskeysockets/baileys";
import Pino from "pino";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const JADIBOT_DIR = path.join(__dirname, "..", "jadibot_sessions");

const activeBots = new Map();

export default async function ({ sock, m, args, reply }) {
    const command = args[0]?.toLowerCase();

    if (!fs.existsSync(JADIBOT_DIR)) {
        fs.mkdirSync(JADIBOT_DIR, { recursive: true });
    }

    if (!command || command === "help") {
        const help = `*📱 JADIBOT COMMANDS*

*Pengguna:*
• .jadibot start - Mulai jadi bot
• .jadibot stop - Stop bot
• .jadibot status - Cek status bot

*Owner:*
• .jadibot list - List semua bot aktif
• .jadibot stopall - Stop semua bot`;

        return await reply(help);
    }

    const userId = m.sender;
    const sessionPath = path.join(JADIBOT_DIR, userId.split("@")[0]);

    switch (command) {
        case "start":
            if (activeBots.has(userId)) {
                return await reply("❌ Bot kamu sudah aktif!");
            }

            try {
                await reply("⏳ Memulai jadibot...");
                await startJadibot(userId, sessionPath, sock, m);
            } catch (error) {
                await reply(`❌ Gagal start: ${error.message}`);
            }
            break;

        case "stop":
            if (!activeBots.has(userId)) {
                return await reply("❌ Bot kamu tidak aktif!");
            }

            try {
                const botData = activeBots.get(userId);
                if (botData.socket) {
                    await botData.socket.logout();
                    botData.socket.end();
                }
                activeBots.delete(userId);
                await reply("✅ Bot berhasil dihentikan!");
            } catch (error) {
                await reply(`❌ Gagal stop: ${error.message}`);
            }
            break;

        case "status":
            const isActive = activeBots.has(userId);
            const status = isActive
                ? "🟢 *Bot Aktif*\n\nBot kamu sedang berjalan"
                : "🔴 *Bot Tidak Aktif*\n\nGunakan .jadibot start untuk memulai";
            await reply(status);
            break;

        case "list":
            if (userId !== jidNormalizedUser(sock.user.id)) {
                return await reply("❌ Perintah khusus owner!");
            }

            if (activeBots.size === 0) {
                return await reply("📭 Tidak ada bot aktif");
            }

            let list = `*📱 BOT AKTIF (${activeBots.size})*\n\n`;
            let no = 1;
            for (const [id, data] of activeBots) {
                const name = data.pushName || id.split("@")[0];
                list += `${no}. ${name}\n   @${id.split("@")[0]}\n\n`;
                no++;
            }
            await reply(list);
            break;

        case "stopall":
            if (userId !== jidNormalizedUser(sock.user.id)) {
                return await reply("❌ Perintah khusus owner!");
            }

            if (activeBots.size === 0) {
                return await reply("📭 Tidak ada bot aktif");
            }

            let stopped = 0;
            for (const [id, data] of activeBots) {
                try {
                    if (data.socket) {
                        await data.socket.logout();
                        data.socket.end();
                    }
                    activeBots.delete(id);
                    stopped++;
                } catch (e) {}
            }

            await reply(`✅ ${stopped} bot berhasil dihentikan!`);
            break;

        default:
            await reply("❌ Perintah tidak dikenal. Gunakan .jadibot help");
    }
}

async function startJadibot(userId, sessionPath, parentSock, m) {
    try {
        const { version } = await fetchLatestWaWebVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const botSocket = makeWASocket({
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

        if (!botSocket.authState.creds.registered) {
            const phoneNumber = userId.split("@")[0];
            
            try {
                const code = await botSocket.requestPairingCode(phoneNumber);
                
                await parentSock.sendMessage(
                    m.chat,
                    {
                        text: `📱 *PAIRING CODE*\n\n🔑 Kode: *${code}*\n\nMasukkan kode ini di WhatsApp kamu:\n1. Buka WhatsApp\n2. Tap titik tiga > Perangkat Tertaut\n3. Tap Tautkan Perangkat\n4. Tap "Tautkan dengan Nomor Telepon"\n5. Masukkan kode di atas`
                    },
                    { quoted: m }
                );
            } catch (error) {
                throw new Error(`Gagal generate pairing code: ${error.message}`);
            }
        }

        botSocket.ev.on("creds.update", saveCreds);

            if (connection === "open") {
                const botName = botSocket.user.name || "Bot";
                activeBots.set(userId, {
                    socket: botSocket,
                    pushName: botName,
                    connectedAt: Date.now()
                });

                await parentSock.sendMessage(
                    m.chat,
                    {
                        text: `✅ *BOT CONNECTED*\n\n👤 Nama: ${botName}\n⏰ Waktu: ${new Date().toLocaleString(
                            "id-ID"
                        )}`
                    },
                    { quoted: m }
                );
            }

            if (connection === "close") {
                const reason = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = reason !== DisconnectReason.loggedOut;

                if (reason === DisconnectReason.loggedOut) {
                    activeBots.delete(userId);
                    if (fs.existsSync(sessionPath)) {
                        fs.rmSync(sessionPath, { recursive: true, force: true });
                    }
                    await parentSock.sendMessage(
                        m.chat,
                        { text: "❌ Bot logout, session dihapus" },
                        { quoted: m }
                    );
                } else if (shouldReconnect) {
                    setTimeout(() => {
                        startJadibot(userId, sessionPath, parentSock, m);
                    }, 3000);
                }
            }
        });

        botSocket.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const text =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                "";
            const from = msg.key.remoteJid;

            if (text === ".ping") {
                await botSocket.sendMessage(from, { text: "🏓 Pong!" });
            }
        });
    } catch (error) {
        throw error;
    }
}