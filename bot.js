import "./config.js";
import makeWASocket, {
    Browsers,
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage,
    makeCacheableSignalKeyStore
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

// ===== STORAGE UNTUK ANTI-DELETE/EDIT =====
const MESSAGE_STORAGE_DIR = path.join(__dirname, config.SESSION, "message_store");
const MEDIA_STORAGE_DIR = path.join(__dirname, config.SESSION, "media_store");
const MESSAGE_INDEX_FILE = path.join(MESSAGE_STORAGE_DIR, "index.json");
const MAX_STORED_MESSAGES = 1000;

// Inisialisasi folder storage
function initStorage() {
    if (!fs.existsSync(MESSAGE_STORAGE_DIR)) {
        fs.mkdirSync(MESSAGE_STORAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(MEDIA_STORAGE_DIR)) {
        fs.mkdirSync(MEDIA_STORAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(MESSAGE_INDEX_FILE)) {
        fs.writeFileSync(MESSAGE_INDEX_FILE, JSON.stringify({}));
    }
}

// Load message index dari file
function loadMessageIndex() {
    try {
        const data = fs.readFileSync(MESSAGE_INDEX_FILE, "utf8");
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Save message index ke file
function saveMessageIndex(index) {
    try {
        fs.writeFileSync(MESSAGE_INDEX_FILE, JSON.stringify(index, null, 2));
    } catch (error) {
        console.error(colors.red("❌ Failed to save message index:"), error.message);
    }
}

// Simpan pesan ke storage
async function storeMessage(messageId, data) {
    try {
        const index = loadMessageIndex();
        
        // Batasi jumlah pesan yang disimpan
        const keys = Object.keys(index);
        if (keys.length >= MAX_STORED_MESSAGES) {
            const oldestKey = keys[0];
            const oldestData = index[oldestKey];
            
            // Hapus file lama
            const oldMessageFile = path.join(MESSAGE_STORAGE_DIR, `${oldestKey}.json`);
            if (fs.existsSync(oldMessageFile)) {
                fs.unlinkSync(oldMessageFile);
            }
            if (oldestData.mediaPath && fs.existsSync(oldestData.mediaPath)) {
                fs.unlinkSync(oldestData.mediaPath);
            }
            
            delete index[oldestKey];
        }

        // Simpan data pesan
        const messageFile = path.join(MESSAGE_STORAGE_DIR, `${messageId}.json`);
        fs.writeFileSync(messageFile, JSON.stringify(data, null, 2));
        
        // Update index
        index[messageId] = {
            timestamp: data.timestamp,
            from: data.from,
            hasMedia: !!data.mediaPath,
            mediaPath: data.mediaPath
        };
        
        saveMessageIndex(index);
    } catch (error) {
        console.error(colors.red("❌ Failed to store message:"), error.message);
    }
}

// Load pesan dari storage
function loadMessage(messageId) {
    try {
        const messageFile = path.join(MESSAGE_STORAGE_DIR, `${messageId}.json`);
        if (!fs.existsSync(messageFile)) return null;
        
        const data = fs.readFileSync(messageFile, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error(colors.red("❌ Failed to load message:"), error.message);
        return null;
    }
}

// Simpan media ke storage
async function saveMedia(messageId, buffer, mimeType) {
    try {
        const ext = mimeType.split("/")[1].split(";")[0];
        const mediaPath = path.join(MEDIA_STORAGE_DIR, `${messageId}.${ext}`);
        fs.writeFileSync(mediaPath, buffer);
        return mediaPath;
    } catch (error) {
        console.error(colors.red("❌ Failed to save media:"), error.message);
        return null;
    }
}

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
    initStorage();
    console.log(colors.green("Connecting..."));

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
        markOnlineOnConnect: false
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(
                    config.PAIRING_NUMBER
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

    // ===== EVENT: PESAN MASUK (SIMPAN KE STORAGE) =====
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const from = m.key.remoteJid;
        const messageId = m.key.id;
        
        // Ekstrak teks dari pesan
        let text =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            m.message?.documentMessage?.caption ||
            m.message?.audioMessage?.caption ||
            "";

        // Siapkan data untuk disimpan
        const messageData = {
            message: m,
            text: text,
            from: from,
            timestamp: Date.now(),
            sender: m.key.participant || m.key.remoteJid,
            pushName: m.pushName || "",
            mediaPath: null,
            mediaType: null
        };

        // Download dan simpan media jika ada
        try {
            let mediaBuffer = null;
            let mimeType = null;

            if (m.message?.imageMessage) {
                mediaBuffer = await downloadMediaMessage(m, "buffer", {}, {
                    logger: Pino({ level: "silent" }),
                    reuploadRequest: sock.updateMediaMessage
                });
                mimeType = m.message.imageMessage.mimetype;
                messageData.mediaType = "image";
            } else if (m.message?.videoMessage) {
                mediaBuffer = await downloadMediaMessage(m, "buffer", {}, {
                    logger: Pino({ level: "silent" }),
                    reuploadRequest: sock.updateMediaMessage
                });
                mimeType = m.message.videoMessage.mimetype;
                messageData.mediaType = "video";
            } else if (m.message?.audioMessage) {
                mediaBuffer = await downloadMediaMessage(m, "buffer", {}, {
                    logger: Pino({ level: "silent" }),
                    reuploadRequest: sock.updateMediaMessage
                });
                mimeType = m.message.audioMessage.mimetype;
                messageData.mediaType = "audio";
            } else if (m.message?.documentMessage) {
                mediaBuffer = await downloadMediaMessage(m, "buffer", {}, {
                    logger: Pino({ level: "silent" }),
                    reuploadRequest: sock.updateMediaMessage
                });
                mimeType = m.message.documentMessage.mimetype;
                messageData.mediaType = "document";
            }

            if (mediaBuffer && mimeType) {
                const mediaPath = await saveMedia(messageId, mediaBuffer, mimeType);
                messageData.mediaPath = mediaPath;
            }
        } catch (error) {
            console.error(colors.red("❌ Failed to download media:"), error.message);
        }

        // Simpan ke storage
        await storeMessage(messageId, messageData);

        const isGroup = from.endsWith("@g.us");
        // Self bot - hanya respon pesan dari bot sendiri
        if (!isGroup && !m.key.fromMe) return;
        if (
            isGroup &&
            m.key.participant !== sock.user.lid.split(":")[0] + "@lid"
        )
            return;

        text = text.trim();
        if (!text) return;

        // ===== PENGECEKAN EVAL/EXEC TANPA PREFIX =====
        // Eval dengan >
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
                    "loadMessage",
                    "storeMessage",
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
                    loadMessage,
                    storeMessage
                );
                const output = util.inspect(result, { depth: 2 });
                await sock.sendMessage(from, { text: output });
            } catch (error) {
                await sock.sendMessage(from, {
                    text: error.message
                });
            }
            return;
        }

        // Eval dengan return (=>)
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
                    "loadMessage",
                    "storeMessage",
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
                    loadMessage,
                    storeMessage
                );
                const output = util.inspect(result, { depth: 2 });
                await sock.sendMessage(from, { text: output });
            } catch (error) {
                await sock.sendMessage(from, {
                    text: error.message
                });
            }
            return;
        }

        // Exec dengan $
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

                await sock.sendMessage(from, {
                    text: output
                });
            } catch (error) {
                await sock.sendMessage(from, {
                    text: error.message
                });
            }
            return;
        }

        // ===== PENGECEKAN PREFIX UNTUK PLUGIN =====
        const prefixes = config.PREFIX || ["."];
        const prefix = prefixes.find(p => text.startsWith(p));
        if (!prefix) return;

        const args = text.slice(prefix.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        if (!command) return;

        console.log(colors.cyan(`📩 ${command}`));

        // Plugin execution
        if (plugins.has(command)) {
            // Kirim reaksi "wait" (⏳)
            try {
                await sock.sendMessage(from, {
                    react: {
                        text: "⏳",
                        key: m.key
                    }
                });
            } catch (e) {
                console.error(colors.red("❌ Failed to send reaction:"), e.message);
            }

            try {
                const execute = plugins.get(command);

                // Download media if available
                let fileBuffer = null;
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
                    } catch (e) {}
                }

                if (
                    !fileBuffer &&
                    (m.message?.imageMessage ||
                        m.message?.videoMessage ||
                        m.message?.documentMessage ||
                        m.message?.audioMessage)
                ) {
                    try {
                        fileBuffer = await downloadMediaMessage(
                            m,
                            "buffer",
                            {},
                            {
                                logger: Pino({ level: "silent" }),
                                reuploadRequest: sock.updateMediaMessage
                            }
                        );
                    } catch (e) {}
                }

                const context = {
                    sock,
                    from,
                    args,
                    text: args.join(" "),
                    message: m,
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
                // Hapus reaksi (kirim reaksi kosong)
                try {
                    await sock.sendMessage(from, {
                        react: {
                            text: "",
                            key: m.key
                        }
                    });
                } catch (e) {
                    console.error(colors.red("❌ Failed to remove reaction:"), e.message);
                }
            }
            return;
        }
    });

    // ===== EVENT: PESAN DI-UPDATE (HAPUS/EDIT) =====
    sock.ev.on("messages.update", async (updates) => {
        for (const update of updates) {
            const messageId = update.key.id;
            const stored = loadMessage(messageId);

            if (!stored) continue;

            // Cek apakah dari grup, jika ya, skip
            const isGroup = stored.from.endsWith("@g.us");
            if (isGroup) {
                console.log(colors.gray(`⏭️ Ignoring group message: ${messageId}`));
                continue;
            }

            // Pesan dihapus
            if (update.update.message === null || update.update.message === undefined) {
                console.log(colors.yellow(`🗑️ Message deleted: ${messageId}`));

                const senderName = stored.pushName || stored.sender.split("@")[0];
                const isStatus = stored.from === "status@broadcast";
                
                // Tentukan target pengiriman
                let targetJid = stored.from;
                if (isStatus) {
                    // Jika dari status, kirim ke nomor bot sendiri
                    targetJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
                }
                
                let responseText = isStatus 
                    ? `📸 *Anti-Delete Story/Status*\n\n`
                    : `🚫 *Anti-Delete Message*\n\n`;
                responseText += `👤 Sender: ${senderName}\n`;
                if (isStatus) {
                    responseText += `📱 Number: ${stored.sender.split("@")[0]}\n`;
                }
                responseText += `📝 Deleted ${isStatus ? "status" : "message"}:\n${stored.text || "(no text)"}`;

                try {
                    // Kirim teks
                    await sock.sendMessage(targetJid, {
                        text: responseText
                    });

                    // Kirim media jika ada
                    if (stored.mediaPath && fs.existsSync(stored.mediaPath)) {
                        const mediaBuffer = fs.readFileSync(stored.mediaPath);
                        
                        const mediaMessage = {};
                        if (stored.mediaType === "image") {
                            mediaMessage.image = mediaBuffer;
                            mediaMessage.caption = `🖼️ Deleted ${stored.mediaType}${isStatus ? " from status" : ""}`;
                        } else if (stored.mediaType === "video") {
                            mediaMessage.video = mediaBuffer;
                            mediaMessage.caption = `🎥 Deleted ${stored.mediaType}${isStatus ? " from status" : ""}`;
                        } else if (stored.mediaType === "audio") {
                            mediaMessage.audio = mediaBuffer;
                            mediaMessage.mimetype = "audio/mpeg";
                        } else if (stored.mediaType === "document") {
                            mediaMessage.document = mediaBuffer;
                            mediaMessage.mimetype = "application/octet-stream";
                            mediaMessage.fileName = `deleted_document_${messageId}`;
                        }

                        await sock.sendMessage(targetJid, mediaMessage);
                    }
                } catch (error) {
                    console.error(colors.red("❌ Failed to send anti-delete:"), error.message);
                }
            }

            // Pesan diedit
            if (update.update.editedMessage) {
                console.log(colors.yellow(`✏️ Message edited: ${messageId}`));

                const newText = 
                    update.update.editedMessage?.conversation ||
                    update.update.editedMessage?.extendedTextMessage?.text ||
                    "";

                const senderName = stored.pushName || stored.sender.split("@")[0];
                const isStatus = stored.from === "status@broadcast";
                
                // Tentukan target pengiriman
                let targetJid = stored.from;
                if (isStatus) {
                    // Jika dari status, kirim ke nomor bot sendiri
                    targetJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
                }

                let responseText = `✏️ *Anti-Edit Message*\n\n`;
                responseText += `👤 Sender: ${senderName}\n`;
                if (isStatus) {
                    responseText += `📱 Number: ${stored.sender.split("@")[0]}\n`;
                }
                responseText += `📝 Original message:\n${stored.text}\n\n`;
                responseText += `📝 Edited to:\n${newText}`;

                try {
                    await sock.sendMessage(targetJid, {
                        text: responseText
                    });
                } catch (error) {
                    console.error(colors.red("❌ Failed to send anti-edit:"), error.message);
                }
            }
        }
    });

    process.on("SIGINT", () => {
        console.log(colors.yellow("\n⏹️  Shutting down..."));
        console.log(colors.green("👋 Stopped\n"));
        process.exit(0);
    });
};

connect();
console.log(colors.cyan("🤖 Starting bot...\n"));