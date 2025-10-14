import "./config.js";
import makeWASocket, {
    Browsers,
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage,
    makeCacheableSignalKeyStore,
    fetchLatestWaWebVersion
} from "@whiskeysockets/baileys";
import Pino from "pino";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";
import colors from "@colors/colors/safe.js";
import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = await import("./config.js").then(m => m.default);

const plugins = new Map();
const PLUGIN_DIR = path.join(__dirname, "plugins");

// ===== STORAGE UNTUK ANTI-DELETE, ANTI-EDIT & ANTI-VIEWONCE =====
const MESSAGE_STORE_LIMIT = 1000;
const MESSAGE_STORE_FILE = path.join(config.SESSION, "message_store.json");

function loadMessageStore() {
    try {
        if (fs.existsSync(MESSAGE_STORE_FILE)) {
            const data = fs.readFileSync(MESSAGE_STORE_FILE, "utf8");
            const parsed = JSON.parse(data);
            return new Map(Object.entries(parsed));
        }
    } catch (error) {
        console.error(
            colors.red("❌ Failed to load message store:"),
            error.message
        );
    }
    return new Map();
}

function saveMessageStore(messageStore) {
    try {
        const obj = Object.fromEntries(messageStore);
        fs.writeFileSync(MESSAGE_STORE_FILE, JSON.stringify(obj, null, 2));
    } catch (error) {
        console.error(
            colors.red("❌ Failed to save message store:"),
            error.message
        );
    }
}

let messageStore = loadMessageStore();
console.log(
    colors.cyan(`💾 Loaded ${messageStore.size} messages from storage`)
);

async function loadPlugins() {
    try {
        if (!fs.existsSync(PLUGIN_DIR)) {
            fs.mkdirSync(PLUGIN_DIR);
        }

        plugins.clear();
        const files = fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith(".js"));

        for (const file of files) {
            try {
                const pluginPath = path.join(PLUGIN_DIR, file);
                const pluginUrl = `file://${pluginPath}?update=${Date.now()}`;
                const execute = await import(pluginUrl).then(m => m.default);

                if (typeof execute === "function") {
                    const command = path.basename(file, ".js");
                    plugins.set(command, execute);
                }
            } catch (error) {
                console.error(colors.red(`❌ Plugin ${file}:`), error.message);
            }
        }

        console.log(colors.cyan(`🔌 ${plugins.size} plugins loaded`));
    } catch (error) {
        console.error(colors.red("❌ Plugin error:"), error);
    }
}

const connect = async () => {
    await loadPlugins();
    console.log(colors.green("Connecting..."));

    const { version, isLatest } = await fetchLatestWaWebVersion();

    console.log(colors.green(`Using version: ${version}\nLatest: ${isLatest}`));

    const { state, saveCreds } = await useMultiFileAuthState(config.SESSION);

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                Pino().child({ level: "fatal", stream: "store" })
            )
        },
        browser: Browsers.ubuntu("Chrome"),
        logger: Pino({ level: "silent" }),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        version
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(
                    config.PAIRING_NUMBER,
                    config.PAIRING_CODE
                );
                console.log(
                    colors.green(`Pairing Code: `) + colors.yellow(code)
                );
            } catch (err) {
                console.error(`Failed to get pairing code: ${err}`);
            }
        }, 3000);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async update => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log(
                colors.green("✅ Connected as ") + colors.cyan(sock.user.name)
            );
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const boom = new Boom(lastDisconnect?.error);
            const statusCode = boom?.output?.statusCode;

            if (reason === DisconnectReason.loggedOut || statusCode === 401) {
                console.log(colors.red("❌ Logged out"));
                fs.rmSync(`./${config.SESSION}`, {
                    recursive: true,
                    force: true
                });
                await connect();
                return;
            }

            switch (statusCode) {
                case 403:
                    console.warn(colors.red("⚠️ Account banned"));
                    fs.rmSync(`./${config.SESSION}`, {
                        recursive: true,
                        force: true
                    });
                    await connect();
                    break;
                case 405:
                    console.warn(colors.yellow("⚠️ Not logged in"));
                    fs.rmSync(`./${config.SESSION}`, {
                        recursive: true,
                        force: true
                    });
                    await connect();
                    break;
                default:
                    console.log(colors.yellow("🔄 Reconnecting..."));
                    await connect();
                    break;
            }
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
    const m = messages[0];
    console.log(m)
    if (!m.message) return;

    const from = m.key.remoteJid;
    const messageId = m.key.id;

    // ===== ANTI-VIEWONCE DETECTION =====
    const isViewOnce = m.message?.viewOnceMessageV2 || m.message?.viewOnceMessage;
    let viewOnceText = "";
    let processedViewOnce = false; // Flag untuk track apakah ViewOnce sudah diproses
    
    if (isViewOnce) {
        const isGroup = from.endsWith("@g.us");
        
        // Skip jika dari grup
        if (isGroup) {
            return;
        }
        
        // Jika dari diri sendiri, skip anti-viewonce tapi lanjut ke command processing
        if (m.key.fromMe) {
            // Set flag dan lanjutkan tanpa proses anti-viewonce
            processedViewOnce = false;
        } else {
            console.log(colors.blue(`👁️ ViewOnce message detected`));
            
            const sender = m.key.participant || m.key.remoteJid;
            const senderName = m.pushName || sender.split("@")[0];

            try {
                // Extract viewOnce message
                let viewOnceMsg = null;
                if (m.message.viewOnceMessageV2) {
                    viewOnceMsg = m.message.viewOnceMessageV2.message;
                } else if (m.message.viewOnceMessage) {
                    viewOnceMsg = m.message.viewOnceMessage.message;
                }

                if (!viewOnceMsg) {
                    console.log(colors.yellow("⚠️ Could not extract ViewOnce message"));
                    return;
                }

                // Deteksi tipe media
                let mediaType = null;
                let caption = "";
                
                if (viewOnceMsg.imageMessage) {
                    mediaType = "image";
                    caption = viewOnceMsg.imageMessage.caption || "";
                } else if (viewOnceMsg.videoMessage) {
                    mediaType = "video";
                    caption = viewOnceMsg.videoMessage.caption || "";
                } else if (viewOnceMsg.audioMessage) {
                    mediaType = "audio";
                }

                // Simpan caption untuk proses command nanti
                viewOnceText = caption;

                let antiViewOnceMsg = `👁️ *VIEWONCE TERDETEKSI*\n\n`;
                antiViewOnceMsg += `👤 Pengirim: ${senderName}\n`;
                antiViewOnceMsg += `📱 Nomor: ${sender.split("@")[0]}\n`;
                antiViewOnceMsg += `⏰ Waktu: ${new Date(m.messageTimestamp * 1000).toLocaleString("id-ID")}\n`;
                
                if (mediaType === "image") {
                    antiViewOnceMsg += `📦 Tipe: 🖼️ Gambar ViewOnce\n`;
                } else if (mediaType === "video") {
                    antiViewOnceMsg += `📦 Tipe: 🎥 Video ViewOnce\n`;
                } else if (mediaType === "audio") {
                    antiViewOnceMsg += `📦 Tipe: 🎵 Audio ViewOnce\n`;
                }

                if (caption) {
                    antiViewOnceMsg += `\n📝 Caption:\n${caption}`;
                }

                // Kirim notifikasi anti-viewonce
                await sock.sendMessage(from, { text: antiViewOnceMsg });

                // Download dan kirim ulang media
                try {
                    // Create modified message untuk download
                    const modifiedMsg = {
                        ...m,
                        message: viewOnceMsg
                    };

                    const buffer = await downloadMediaMessage(
                        modifiedMsg,
                        "buffer",
                        {},
                        {
                            logger: Pino({ level: "silent" }),
                            reuploadRequest: sock.updateMediaMessage
                        }
                    );

                    if (mediaType === "image") {
                        await sock.sendMessage(from, {
                            image: buffer,
                            caption: caption ? `Caption: ${caption}` : "🖼️ Gambar ViewOnce"
                        });
                    } else if (mediaType === "video") {
                        await sock.sendMessage(from, {
                            video: buffer,
                            caption: caption ? `Caption: ${caption}` : "🎥 Video ViewOnce"
                        });
                    } else if (mediaType === "audio") {
                        await sock.sendMessage(from, {
                            audio: buffer,
                            mimetype: "audio/mp4"
                        });
                    }

                    console.log(colors.green(`✅ ViewOnce media forwarded successfully`));
                    processedViewOnce = true;
                } catch (downloadError) {
                    console.error(colors.red("❌ Failed to download ViewOnce media:"), downloadError.message);
                    await sock.sendMessage(from, {
                        text: "❌ Gagal mengunduh media ViewOnce"
                    });
                }

            } catch (error) {
                console.error(colors.red("❌ Anti-ViewOnce error:"), error.message);
                console.error(error.stack);
            }
        }
        
        // JANGAN return di sini, lanjutkan untuk cek command
    }

    // Simpan pesan ke store (kecuali viewonce yang sudah diproses)
    if (!processedViewOnce) {
        if (messageStore.size >= MESSAGE_STORE_LIMIT) {
            const firstKey = messageStore.keys().next().value;
            messageStore.delete(firstKey);
        }

        messageStore.set(messageId, {
            message: m,
            from: from,
            timestamp: Date.now()
        });

        if (messageStore.size % 10 === 0) {
            saveMessageStore(messageStore);
        }
    }

    // ===== CEK APAKAH DARI GROUP/PRIVATE =====
    const isGroup = from.endsWith("@g.us");
    if (!isGroup && !m.key.fromMe) return;
    if (
        isGroup &&
        m.key.participant !== sock.user.lid.split(":")[0] + "@lid"
    )
        return;

    // ===== EXTRACT TEXT DARI BERBAGAI SUMBER =====
    let text =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        m.message?.documentMessage?.caption ||
        viewOnceText || // Text dari viewonce caption
        "";

    text = text.trim();
    if (!text) return;

    // ===== EVAL DENGAN > =====
    if (text.startsWith(">") && !text.startsWith("=>")) {
        const code = text.slice(1).trim();
        if (!code) {
            await sock.sendMessage(from, { text: "No code provided" });
            return;
        }
        console.log(colors.cyan(`📩 eval`));
        try {
            const evalFunc = new Function(
                "sock",
                "from",
                "m",
                "plugins",
                "config",
                "fs",
                "path",
                "util",
                "colors",
                "loadPlugins",
                "isGroup",
                "messageStore",
                `return (async () => { ${code} })()`
            );
            const result = await evalFunc(
                sock,
                from,
                m,
                plugins,
                config,
                fs,
                path,
                util,
                colors,
                loadPlugins,
                isGroup,
                messageStore
            );
            const output = util.inspect(result, { depth: 2 });
            await sock.sendMessage(from, { text: output });
        } catch (error) {
            await sock.sendMessage(from, { text: error.message });
        }
        return;
    }

    // ===== EVAL DENGAN => =====
    if (text.startsWith("=>")) {
        const code = text.slice(2).trim();
        if (!code) {
            await sock.sendMessage(from, { text: "No code provided" });
            return;
        }
        console.log(colors.cyan(`📩 eval-return`));
        try {
            const evalFunc = new Function(
                "sock",
                "from",
                "m",
                "plugins",
                "config",
                "fs",
                "path",
                "util",
                "colors",
                "loadPlugins",
                "isGroup",
                "messageStore",
                `return (async () => { return ${code} })()`
            );
            const result = await evalFunc(
                sock,
                from,
                m,
                plugins,
                config,
                fs,
                path,
                util,
                colors,
                loadPlugins,
                isGroup,
                messageStore
            );
            const output = util.inspect(result, { depth: 2 });
            await sock.sendMessage(from, { text: output });
        } catch (error) {
            await sock.sendMessage(from, { text: error.message });
        }
        return;
    }

    // ===== EXEC DENGAN $ =====
    if (text.startsWith("$")) {
        const cmd = text.slice(1).trim();
        if (!cmd) {
            await sock.sendMessage(from, { text: "No command provided" });
            return;
        }
        console.log(colors.cyan(`📩 exec`));
        try {
            await sock.sendMessage(from, { text: `⏳ Executing: ${cmd}` });
            const { stdout, stderr } = await execPromise(cmd);
            let output = "";
            if (stdout) output += stdout;
            if (stderr) output += `${stderr}:\n\n${stdout}`;
            if (!output) output = "✅ Executed (no output)";
            await sock.sendMessage(from, { text: output });
        } catch (error) {
            await sock.sendMessage(from, { text: error.message });
        }
        return;
    }

    // ===== PLUGIN COMMAND PROCESSING =====
    const prefixes = config.PREFIX || ["."];
    const prefix = prefixes.find(p => text.startsWith(p));
    if (!prefix) return;

    const args = text.slice(prefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();
    if (!command) return;

    console.log(colors.cyan(`📩 ${command}`));

    if (plugins.has(command)) {
        try {
            await sock.sendMessage(from, {
                react: { text: "⏳", key: m.key }
            });
        } catch (e) {
            console.error(
                colors.red("❌ Failed to send reaction:"),
                e.message
            );
        }

        try {
            const execute = plugins.get(command);

            let fileBuffer = null;
            
            // Cek quoted message untuk media
            const quotedMsg =
                m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (
                quotedMsg?.imageMessage ||
                quotedMsg?.videoMessage ||
                quotedMsg?.documentMessage ||
                quotedMsg?.audioMessage
            ) {
                try {
                    fileBuffer = await downloadMediaMessage(
                        { message: quotedMsg },
                        "buffer",
                        {},
                        {
                            logger: Pino({ level: "silent" }),
                            reuploadRequest: sock.updateMediaMessage
                        }
                    );
                } catch (e) {
                    console.error(colors.yellow("⚠️ Failed to download quoted media"), e.message);
                }
            }

            // Cek media di pesan saat ini (termasuk ViewOnce)
            if (!fileBuffer) {
                let targetMessage = m.message;
                
                // Jika ViewOnce, extract message dari dalamnya
                if (isViewOnce) {
                    if (m.message.viewOnceMessageV2) {
                        targetMessage = m.message.viewOnceMessageV2.message;
                    } else if (m.message.viewOnceMessage) {
                        targetMessage = m.message.viewOnceMessage.message;
                    }
                }

                if (
                    targetMessage?.imageMessage ||
                    targetMessage?.videoMessage ||
                    targetMessage?.documentMessage ||
                    targetMessage?.audioMessage
                ) {
                    try {
                        const modifiedMsg = {
                            ...m,
                            message: targetMessage
                        };
                        
                        fileBuffer = await downloadMediaMessage(
                            modifiedMsg,
                            "buffer",
                            {},
                            {
                                logger: Pino({ level: "silent" }),
                                reuploadRequest: sock.updateMediaMessage
                            }
                        );
                        console.log(colors.green("✅ Media from ViewOnce extracted for command"));
                    } catch (e) {
                        console.error(colors.yellow("⚠️ Failed to download media"), e.message);
                    }
                }
            }

            const context = {
                sock,
                from,
                args,
                text: args.join(" "),
                m,
                fileBuffer,
                reply: async content => {
                    if (typeof content === "string") {
                        return await sock.sendMessage(from, {
                            text: content
                        });
                    }
                    return await sock.sendMessage(from, content);
                }
            };

            await execute(context);
            console.log(colors.green(`✅ ${command} executed`));
        } catch (error) {
            console.error(colors.red(`❌ Plugin error:`), error);
            await sock.sendMessage(from, {
                text: `❌ Plugin error: ${error.message}`
            });
        } finally {
            try {
                await sock.sendMessage(from, {
                    react: { text: "", key: m.key }
                });
            } catch (e) {
                console.error(
                    colors.red("❌ Failed to remove reaction:"),
                    e.message
                );
            }
        }
        return;
    }
});

    // ===== EVENT: ANTI-DELETE & ANTI-EDIT =====
    sock.ev.on("messages.update", async updates => {
        for (const update of updates) {
            try {
                const messageId = update.key.id;
                const from = update.key.remoteJid.startsWith("status")
                    ? sock.user.id.split("@")[0] + "@s.whatsapp.net"
                    : update.key.remoteJid;

                const isGroup = from.endsWith("@g.us");
                if (isGroup) continue;

                const storedData = messageStore.get(messageId);
                if (!storedData) continue;

                const storedMessage = storedData.message;
                if (storedMessage.key.fromMe) continue;

                // Skip jika pesan adalah viewonce (sudah dihandle)
                if (storedData.isViewOnce) continue;

                // ===== ANTI-DELETE =====
                if (
                    update.update?.message === null ||
                    update.update?.messageStubType === 68
                ) {
                    console.log(colors.magenta(`🗑️ Message deleted detected`));

                    const sender =
                        storedMessage.key.participant ||
                        storedMessage.key.remoteJid;
                    const senderName =
                        storedMessage.pushName || sender.split("@")[0];

                    const lastMessage = storedData.editHistory
                        ? storedData.editHistory[
                              storedData.editHistory.length - 1
                          ].message
                        : storedMessage.message;

                    let deletedContent =
                        lastMessage?.conversation ||
                        lastMessage?.extendedTextMessage?.text ||
                        lastMessage?.imageMessage?.caption ||
                        lastMessage?.videoMessage?.caption ||
                        lastMessage?.documentMessage?.caption ||
                        "";

                    const hasSticker = storedMessage.message?.stickerMessage;
                    const hasImage = storedMessage.message?.imageMessage;
                    const hasVideo = storedMessage.message?.videoMessage;
                    const hasAudio = storedMessage.message?.audioMessage;
                    const hasDocument = storedMessage.message?.documentMessage;

                    let antiDeleteMsg = `🚫 *PESAN DIHAPUS*\n\n`;
                    antiDeleteMsg += `👤 Pengirim: ${senderName}\n`;
                    antiDeleteMsg += `📱 Nomor: ${sender.split("@")[0]}\n`;
                    antiDeleteMsg += `⏰ Waktu: ${new Date(
                        storedMessage.messageTimestamp * 1000
                    ).toLocaleString("id-ID")}\n`;

                    if (
                        storedData.editHistory &&
                        storedData.editHistory.length > 0
                    ) {
                        antiDeleteMsg += `\n📝 *Riwayat Edit (${storedData.editHistory.length}x):*\n`;
                        storedData.editHistory.forEach((edit, index) => {
                            const content =
                                edit.message?.conversation ||
                                edit.message?.extendedTextMessage?.text ||
                                edit.message?.imageMessage?.caption ||
                                edit.message?.videoMessage?.caption ||
                                edit.message?.documentMessage?.caption ||
                                "(media/sticker)";
                            antiDeleteMsg += `\n${
                                index + 1
                            }. ${content}\n   ⏰ ${new Date(
                                edit.timestamp
                            ).toLocaleString("id-ID")}`;
                        });
                        antiDeleteMsg += `\n`;
                    } else {
                        antiDeleteMsg += `\n`;
                    }

                    if (deletedContent) {
                        antiDeleteMsg += `📝 *Pesan Terakhir:*\n${deletedContent}`;
                    } else if (hasSticker) {
                        antiDeleteMsg += `🎭 Tipe: Stiker`;
                    } else if (hasImage) {
                        antiDeleteMsg += `🖼️ Tipe: Gambar`;
                    } else if (hasVideo) {
                        antiDeleteMsg += `🎥 Tipe: Video`;
                    } else if (hasAudio) {
                        antiDeleteMsg += `🎵 Tipe: Audio`;
                    } else if (hasDocument) {
                        antiDeleteMsg += `📄 Tipe: Dokumen`;
                    }

                    await sock.sendMessage(from, { text: antiDeleteMsg });

                    const originalMessage = storedMessage.message;

                    if (originalMessage?.stickerMessage) {
                        try {
                            const buffer = await downloadMediaMessage(
                                storedMessage,
                                "buffer",
                                {},
                                {
                                    logger: Pino({ level: "silent" }),
                                    reuploadRequest: sock.updateMediaMessage
                                }
                            );
                            await sock.sendMessage(from, { sticker: buffer });
                        } catch (e) {
                            console.error(
                                colors.red("❌ Failed to resend sticker:"),
                                e.message
                            );
                        }
                    } else if (originalMessage?.imageMessage) {
                        try {
                            const buffer = await downloadMediaMessage(
                                storedMessage,
                                "buffer",
                                {},
                                {
                                    logger: Pino({ level: "silent" }),
                                    reuploadRequest: sock.updateMediaMessage
                                }
                            );
                            await sock.sendMessage(from, {
                                image: buffer,
                                caption: "🖼️ Gambar yang dihapus"
                            });
                        } catch (e) {
                            console.error(
                                colors.red("❌ Failed to resend image:"),
                                e.message
                            );
                        }
                    } else if (originalMessage?.videoMessage) {
                        try {
                            const buffer = await downloadMediaMessage(
                                storedMessage,
                                "buffer",
                                {},
                                {
                                    logger: Pino({ level: "silent" }),
                                    reuploadRequest: sock.updateMediaMessage
                                }
                            );
                            await sock.sendMessage(from, {
                                video: buffer,
                                caption: "🎥 Video yang dihapus"
                            });
                        } catch (e) {
                            console.error(
                                colors.red("❌ Failed to resend video:"),
                                e.message
                            );
                        }
                    } else if (originalMessage?.audioMessage) {
                        try {
                            const buffer = await downloadMediaMessage(
                                storedMessage,
                                "buffer",
                                {},
                                {
                                    logger: Pino({ level: "silent" }),
                                    reuploadRequest: sock.updateMediaMessage
                                }
                            );
                            await sock.sendMessage(from, {
                                audio: buffer,
                                mimetype: "audio/mp4"
                            });
                        } catch (e) {
                            console.error(
                                colors.red("❌ Failed to resend audio:"),
                                e.message
                            );
                        }
                    } else if (originalMessage?.documentMessage) {
                        try {
                            const buffer = await downloadMediaMessage(
                                storedMessage,
                                "buffer",
                                {},
                                {
                                    logger: Pino({ level: "silent" }),
                                    reuploadRequest: sock.updateMediaMessage
                                }
                            );
                            await sock.sendMessage(from, {
                                document: buffer,
                                mimetype:
                                    originalMessage.documentMessage.mimetype,
                                fileName:
                                    originalMessage.documentMessage.fileName,
                                caption: "📄 Dokumen yang dihapus"
                            });
                        } catch (e) {
                            console.error(
                                colors.red("❌ Failed to resend document:"),
                                e.message
                            );
                        }
                    }
                }

                // ===== ANTI-EDIT =====
                else if (
                    update.update?.message?.editedMessage ||
                    update.update?.message?.protocolMessage?.type === 14
                ) {
                    console.log(colors.yellow(`✏️ Message edited detected`));

                    const sender =
                        storedMessage.key.participant ||
                        storedMessage.key.remoteJid;
                    const senderName =
                        storedMessage.pushName || sender.split("@")[0];

                    let oldContent = "";
                    if (
                        storedData.editHistory &&
                        storedData.editHistory.length > 0
                    ) {
                        const lastEdit =
                            storedData.editHistory[
                                storedData.editHistory.length - 1
                            ];
                        oldContent =
                            lastEdit.message?.conversation ||
                            lastEdit.message?.extendedTextMessage?.text ||
                            lastEdit.message?.imageMessage?.caption ||
                            lastEdit.message?.videoMessage?.caption ||
                            lastEdit.message?.documentMessage?.caption ||
                            "(kosong)";
                    } else {
                        oldContent =
                            storedMessage.message?.conversation ||
                            storedMessage.message?.extendedTextMessage?.text ||
                            storedMessage.message?.imageMessage?.caption ||
                            storedMessage.message?.videoMessage?.caption ||
                            storedMessage.message?.documentMessage?.caption ||
                            "(kosong)";
                    }

                    let newContent = "";
                    let newMessageObj = null;

                    if (update.update.message?.editedMessage) {
                        const editedMsg =
                            update.update.message.editedMessage.message;
                        if (editedMsg) {
                            newMessageObj = editedMsg;
                            newContent =
                                editedMsg.conversation ||
                                editedMsg.extendedTextMessage?.text ||
                                editedMsg.imageMessage?.caption ||
                                editedMsg.videoMessage?.caption ||
                                editedMsg.documentMessage?.caption ||
                                "(kosong)";
                        } else {
                            newContent = "(kosong)";
                        }
                    } else if (update.update.message?.protocolMessage) {
                        const editedMsg =
                            update.update.message.protocolMessage.editedMessage;
                        if (editedMsg) {
                            newMessageObj = editedMsg;
                            newContent =
                                editedMsg.conversation ||
                                editedMsg.extendedTextMessage?.text ||
                                editedMsg.imageMessage?.caption ||
                                editedMsg.videoMessage?.caption ||
                                editedMsg.documentMessage?.caption ||
                                "(kosong)";
                        } else {
                            newContent = "(kosong)";
                        }
                    } else {
                        newContent = "(kosong)";
                    }

                    const originalMsg = storedMessage.message;
                    let messageType = "teks";
                    if (originalMsg?.imageMessage) messageType = "🖼️ Gambar";
                    else if (originalMsg?.videoMessage)
                        messageType = "🎥 Video";
                    else if (originalMsg?.documentMessage)
                        messageType = "📄 Dokumen";
                    else if (originalMsg?.audioMessage)
                        messageType = "🎵 Audio";
                    else if (originalMsg?.stickerMessage)
                        messageType = "🎭 Stiker";

                    let antiEditMsg = `✏️ *PESAN DIEDIT*\n\n`;
                    antiEditMsg += `👤 Pengirim: ${senderName}\n`;
                    antiEditMsg += `📱 Nomor: ${sender.split("@")[0]}\n`;

                    if (messageType !== "teks") {
                        antiEditMsg += `📦 Tipe: ${messageType}\n`;
                    }

                    antiEditMsg += `⏰ Waktu Original: ${new Date(
                        storedMessage.messageTimestamp * 1000
                    ).toLocaleString("id-ID")}\n`;
                    antiEditMsg += `⏰ Waktu Edit: ${new Date().toLocaleString(
                        "id-ID"
                    )}\n\n`;

                    const editCount = (storedData.editHistory?.length || 0) + 1;
                    antiEditMsg += `🔢 Edit ke-${editCount}\n\n`;

                    if (messageType !== "teks") {
                        antiEditMsg += `📝 Caption Lama:\n${oldContent}\n\n`;
                        antiEditMsg += `✨ Caption Baru:\n${newContent}`;
                    } else {
                        antiEditMsg += `📝 Pesan Lama:\n${oldContent}\n\n`;
                        antiEditMsg += `✨ Pesan Baru:\n${newContent}`;
                    }

                    await sock.sendMessage(from, { text: antiEditMsg });

                    if (!storedData.editHistory) {
                        storedData.editHistory = [];
                    }

                    storedData.editHistory.push({
                        message: newMessageObj,
                        timestamp: Date.now(),
                        editNumber: editCount
                    });

                    messageStore.set(messageId, {
                        message: storedMessage,
                        from: from,
                        timestamp: storedData.timestamp,
                        editHistory: storedData.editHistory,
                        isViewOnce: storedData.isViewOnce
                    });

                    saveMessageStore(messageStore);
                }
            } catch (error) {
                console.error(
                    colors.red("❌ Anti-delete/edit error:"),
                    error.message
                );
                console.error(error.stack);
            }
        }
    });

    process.on("SIGINT", () => {
        console.log(colors.yellow("\n⏹️  Shutting down..."));
        saveMessageStore(messageStore);
        console.log(colors.green("💾 Message store saved"));
        console.log(colors.green("👋 Stopped\n"));
        process.exit(0);
    });
};

connect();
console.log(colors.cyan("🤖 Starting bot...\n"));