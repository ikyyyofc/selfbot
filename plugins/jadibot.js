export default async ({ sock, m, args, text }) => {
    const { jidNormalizedUser } = await import("@whiskeysockets/baileys");
    const config = (await import("../config.js")).default;
    const fs = await import("fs");
    const path = await import("path");

    const jadibotDir = path.join("jadibot_sessions");
    const activeSessions = new Map();

    if (!fs.existsSync(jadibotDir)) {
        fs.mkdirSync(jadibotDir, { recursive: true });
    }

    const command = args[0]?.toLowerCase();

    if (!command || command === "help") {
        const helpText = `*JADIBOT PANEL*

Available Commands:
• ${config.PREFIX[0]}jadibot start - Start jadibot session
• ${config.PREFIX[0]}jadibot stop - Stop jadibot session  
• ${config.PREFIX[0]}jadibot list - List active sessions
• ${config.PREFIX[0]}jadibot delete - Delete session data

Status: ${activeSessions.size} active session(s)`;
        return m.reply(helpText);
    }

    if (command === "start") {
        const userSession = path.join(jadibotDir, m.sender.split("@")[0]);
        
        if (activeSessions.has(m.sender)) {
            return m.reply("❌ Kamu sudah punya sesi aktif!");
        }

        if (fs.existsSync(userSession)) {
            return m.reply("⚠️ Sesi sudah ada! Ketik `.jadibot delete` untuk hapus session lama");
        }

        try {
            await m.reply("⏳ Memulai jadibot session...");

            const { default: makeWASocket, useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore, fetchLatestWaWebVersion } = await import("@whiskeysockets/baileys");
            const Pino = (await import("pino")).default;

            const { version } = await fetchLatestWaWebVersion();
            const { state, saveCreds } = await useMultiFileAuthState(userSession);

            const jadibotSock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, Pino().child({ level: "fatal" }))
                },
                browser: Browsers.ubuntu("Chrome"),
                logger: Pino({ level: "silent" }),
                version,
                syncFullHistory: false,
                markOnlineOnConnect: false
            });

            if (!jadibotSock.authState.creds.registered) {
                const code = await jadibotSock.requestPairingCode(m.sender.split("@")[0]);
                await m.reply(`✅ *PAIRING CODE*\n\n\`\`\`${code}\`\`\`\n\nMasukkan kode ini di WhatsApp kamu untuk jadi bot`);
            }

            jadibotSock.ev.on("creds.update", saveCreds);

            jadibotSock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    activeSessions.set(m.sender, jadibotSock);
                    await sock.sendMessage(m.chat, { 
                        text: `✅ Jadibot berhasil tersambung!\n\nNomor: ${jadibotSock.user.name}\nStatus: Online` 
                    });
                }

                if (connection === "close") {
                    const { Boom } = await import("@hapi/boom");
                    const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;

                    if (statusCode === 401 || statusCode === 403) {
                        fs.rmSync(userSession, { recursive: true, force: true });
                        await sock.sendMessage(m.chat, { text: "❌ Session invalid, silakan start ulang" });
                    }

                    activeSessions.delete(m.sender);
                }
            });

            jadibotSock.ev.on("messages.upsert", async ({ messages }) => {
                const msg = messages[0];
                if (!msg.message || msg.key.fromMe) return;

                const serialize = (await import("../lib/serialize.js")).default;
                const serialized = await serialize(msg, jadibotSock);

                if (serialized.text?.startsWith(config.PREFIX[0])) {
                    await sock.sendMessage(m.chat, { 
                        text: `📨 Pesan dari jadibot:\n\nDari: ${serialized.pushName}\nPesan: ${serialized.text}` 
                    });
                }
            });

        } catch (error) {
            await m.reply(`❌ Error: ${error.message}`);
        }
    }

    if (command === "stop") {
        const session = activeSessions.get(m.sender);
        
        if (!session) {
            return m.reply("❌ Tidak ada sesi aktif");
        }

        try {
            await session.logout();
            activeSessions.delete(m.sender);
            await m.reply("✅ Jadibot session dihentikan");
        } catch (error) {
            await m.reply(`❌ Error: ${error.message}`);
        }
    }

    if (command === "list") {
        if (activeSessions.size === 0) {
            return m.reply("📊 Tidak ada sesi aktif");
        }

        let list = "*ACTIVE JADIBOT SESSIONS*\n\n";
        let index = 1;

        for (const [user, session] of activeSessions) {
            const number = user.split("@")[0];
            const name = session.user?.name || "Unknown";
            list += `${index}. @${number}\n   Name: ${name}\n   Status: Online\n\n`;
            index++;
        }

        await m.reply(list);
    }

    if (command === "delete") {
        const userSession = path.join(jadibotDir, m.sender.split("@")[0]);

        if (activeSessions.has(m.sender)) {
            return m.reply("⚠️ Stop session dulu dengan `.jadibot stop`");
        }

        if (!fs.existsSync(userSession)) {
            return m.reply("❌ Tidak ada session data");
        }

        try {
            fs.rmSync(userSession, { recursive: true, force: true });
            await m.reply("✅ Session data berhasil dihapus");
        } catch (error) {
            await m.reply(`❌ Error: ${error.message}`);
        }
    }
};