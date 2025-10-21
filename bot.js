import "./config.js";
import makeWASocket, {
    Browsers,
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage,
    makeCacheableSignalKeyStore,
    fetchLatestWaWebVersion,
    jidNormalizedUser
} from "@whiskeysockets/baileys";
import Pino from "pino";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";
import colors from "@colors/colors/safe.js";
import { exec } from "child_process";
import util from "util";
import readline from "readline";
import { fileURLToPath } from "url";
import { dirname } from "path";
import serialize from "./lib/serialize.js";
import { extendSocket } from "./lib/socket.js";
import groupCache from "./lib/groupCache.js";

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ===== CONFIGURATION =====
const config = await import("./config.js").then(m => m.default);
const PLUGIN_DIR = path.join(__dirname, "plugins");
const MESSAGE_STORE_LIMIT = 1000;
const MESSAGE_STORE_FILE = path.join(config.SESSION, "message_store.json");
const MESSAGE_SAVE_INTERVAL = 10;

// ===== STATE MANAGEMENT =====
class BotState {
    constructor() {
        this.plugins = new Map();
        this.messageStore = this.loadMessageStore();
        this.messageCounter = 0;
    }

    loadMessageStore() {
        try {
            if (fs.existsSync(MESSAGE_STORE_FILE)) {
                const data = fs.readFileSync(MESSAGE_STORE_FILE, "utf8");
                const parsed = JSON.parse(data);
                const store = new Map(Object.entries(parsed));
                console.log(
                    colors.cyan(`💾 Loaded ${store.size} messages from storage`)
                );
                return store;
            }
        } catch (error) {
            console.error(
                colors.red("❌ Failed to load message store:"),
                error.message
            );
        }
        return new Map();
    }

    saveMessageStore() {
        try {
            const obj = Object.fromEntries(this.messageStore);
            fs.writeFileSync(MESSAGE_STORE_FILE, JSON.stringify(obj, null, 2));
        } catch (error) {
            console.error(
                colors.red("❌ Failed to save message store:"),
                error.message
            );
        }
    }

    addMessage(messageId, data) {
        if (this.messageStore.size >= MESSAGE_STORE_LIMIT) {
            const firstKey = this.messageStore.keys().next().value;
            this.messageStore.delete(firstKey);
        }

        this.messageStore.set(messageId, data);
        this.messageCounter++;

        if (this.messageCounter % MESSAGE_SAVE_INTERVAL === 0) {
            this.saveMessageStore();
        }
    }

    addEditHistory(messageId, newMessage) {
        const storedData = this.messageStore.get(messageId);
        if (!storedData) return;

        if (!storedData.editHistory) {
            storedData.editHistory = [];
        }

        const editCount = storedData.editHistory.length + 1;
        storedData.editHistory.push({
            message: newMessage,
            timestamp: Date.now(),
            editNumber: editCount
        });

        this.messageStore.set(messageId, storedData);
        this.saveMessageStore();
    }
}

// ===== PLUGIN MANAGER =====
class PluginManager {
    constructor(state) {
        this.state = state;
    }

    async loadPlugins() {
        try {
            if (!fs.existsSync(PLUGIN_DIR)) {
                fs.mkdirSync(PLUGIN_DIR, { recursive: true });
            }

            this.state.plugins.clear();
            const files = fs
                .readdirSync(PLUGIN_DIR)
                .filter(f => f.endsWith(".js"));

            for (const file of files) {
                await this.loadPlugin(file);
            }

            console.log(
                colors.cyan(`🔌 ${this.state.plugins.size} plugins loaded`)
            );
        } catch (error) {
            console.error(
                colors.red("❌ Plugin loading error:"),
                error.message
            );
        }
    }

    async loadPlugin(file) {
        try {
            const pluginPath = path.join(PLUGIN_DIR, file);
            const pluginUrl = `file://${pluginPath}?update=${Date.now()}`;
            const module = await import(pluginUrl);
            const execute = module.default;

            if (typeof execute === "function") {
                const command = path.basename(file, ".js");
                this.state.plugins.set(command, execute);
            }
        } catch (error) {
            console.error(colors.red(`❌ Plugin ${file}:`), error.message);
        }
    }

    async executePlugin(command, context) {
        const execute = this.state.plugins.get(command);
        if (!execute) return false;

        try {
            await context.m.react("⏳");
        } catch (e) {
            console.error(colors.red("❌ Failed to send reaction:"), e.message);
        }

        try {
            await execute(context);
            console.log(colors.green(`✅ ${command} executed`));
            return true;
        } catch (error) {
            console.error(colors.red(`❌ Plugin error:`), error);
            await context.m.reply(`❌ Plugin error: ${error.message}`);
            return false;
        } finally {
            try {
                await context.m.react("");
            } catch (e) {
                console.error(
                    colors.red("❌ Failed to remove reaction:"),
                    e.message
                );
            }
        }
    }
}

// ===== MESSAGE HANDLER =====
class MessageHandler {
    constructor(state, pluginManager) {
        this.state = state;
        this.pluginManager = pluginManager;
    }

    logIncomingMessage(m, chat) {
        const separator = colors.gray("═".repeat(80));
        console.log(separator);

        // Header
        const timestamp = new Date().toLocaleString("id-ID");
        console.log(
            colors.cyan.bold(`📨 INCOMING MESSAGE`) +
                colors.gray(` | ${timestamp}`)
        );
        console.log(colors.gray("─".repeat(80)));

        // Message Type & Direction
        const messageDirection = m.fromMe ? "OUTGOING (Self)" : "INCOMING";
        const chatType = m.isGroup ? "GROUP CHAT" : "PRIVATE CHAT";
        console.log(
            colors.white(`📍 Direction: `) + colors.yellow(messageDirection)
        );
        console.log(colors.white(`💬 Chat Type: `) + colors.blue(chatType));

        // Sender Info
        const senderName = m.pushName || "Unknown";
        const senderNumber = m.sender?.split("@")[0] || "Unknown";
        console.log(
            colors.white(`👤 Sender: `) +
                colors.green(senderName) +
                colors.gray(` (@${senderNumber})`)
        );

        // Group Info (if applicable)
        if (m.isGroup) {
            const groupName = groupCache.has(chat)
                ? groupCache.get(chat)?.subject || "Unknown Group"
                : "Loading...";
            const groupId = chat.split("@")[0];
            console.log(
                colors.white(`👥 Group: `) +
                    colors.magenta(groupName) +
                    colors.gray(` (${groupId})`)
            );
        }

        // Message Type Detection
        const messageType = this.getDetailedMessageType(m);
        console.log(
            colors.white(`📦 Message Type: `) + colors.cyan(messageType)
        );

        // Quoted Message Info
        if (m.quoted) {
            const quotedType = this.getDetailedMessageType(m.quoted);
            const quotedSender = m.quoted.sender?.split("@")[0] || "Unknown";
            console.log(
                colors.white(`↩️  Quoted: `) +
                    colors.yellow(quotedType) +
                    colors.gray(` from @${quotedSender}`)
            );
        }

        // Media Info
        if (m.isMedia) {
            const mediaInfo = this.getMediaInfo(m);
            console.log(
                colors.white(`🎬 Media Info: `) + colors.yellow(mediaInfo)
            );
        }

        // Message Content
        console.log(colors.gray("─".repeat(80)));
        if (m.text) {
            const maxLength = 200;
            const textPreview =
                m.text.length > maxLength
                    ? m.text.substring(0, maxLength) + "..."
                    : m.text;
            console.log(
                colors.white(`📝 Content:\n`) + colors.white(textPreview)
            );
        } else if (m.message?.conversation) {
            console.log(
                colors.white(`📝 Content:\n`) +
                    colors.white(m.message.conversation)
            );
        } else {
            console.log(colors.gray(`📝 Content: (No text content)`));
        }

        // Technical Details
        console.log(colors.gray("─".repeat(80)));
        console.log(colors.white(`🔑 Message ID: `) + colors.gray(m.key.id));
        console.log(
            colors.white(`⏱️  Timestamp: `) +
                colors.gray(
                    new Date(m.messageTimestamp * 1000).toLocaleString("id-ID")
                )
        );

        // Special Flags
        const flags = [];
        if (m.isGroup) flags.push("GROUP");
        if (m.fromMe) flags.push("SELF");
        if (m.quoted) flags.push("REPLY");
        if (m.isMedia) flags.push("MEDIA");
        if (m.mentions?.length > 0)
            flags.push(`MENTIONS(${m.mentions.length})`);

        if (flags.length > 0) {
            console.log(
                colors.white(`🏷️  Flags: `) + colors.cyan(flags.join(" | "))
            );
        }

        console.log(separator);
        console.log(""); // Empty line for readability
    }

    getDetailedMessageType(m) {
        const msg = m.message || {};

        if (msg.conversation) return "📄 Text Message";
        if (msg.extendedTextMessage)
            return "📄 Extended Text (with link/quote)";
        if (msg.imageMessage)
            return (
                "🖼️  Image" +
                (msg.imageMessage.caption ? " (with caption)" : "")
            );
        if (msg.videoMessage)
            return (
                "🎥 Video" + (msg.videoMessage.caption ? " (with caption)" : "")
            );
        if (msg.audioMessage) {
            if (msg.audioMessage.ptt) return "🎤 Voice Note";
            return "🎵 Audio File";
        }
        if (msg.documentMessage) {
            const fileName = msg.documentMessage.fileName || "Unknown";
            const fileType = fileName.split(".").pop();
            return `📄 Document (.${fileType})`;
        }
        if (msg.stickerMessage) return "🎭 Sticker";
        if (msg.contactMessage) return "👤 Contact Card";
        if (msg.locationMessage) return "📍 Location";
        if (msg.liveLocationMessage) return "📍 Live Location";
        if (msg.pollCreationMessage) return "📊 Poll";
        if (msg.reactionMessage) return "❤️ Reaction";
        if (msg.viewOnceMessage) return "👁️ View Once Message";
        if (msg.buttonsMessage) return "🔘 Buttons Message";
        if (msg.listMessage) return "📋 List Message";
        if (msg.templateMessage) return "📝 Template Message";
        if (msg.protocolMessage) {
            const type = msg.protocolMessage.type;
            if (type === 0) return "🔄 Revoke Message";
            if (type === 14) return "✏️ Edit Message";
            return `⚙️ Protocol Message (${type})`;
        }

        return "❓ Unknown Type";
    }

    getMediaInfo(m) {
        const msg = m.message || {};
        const info = [];

        if (msg.imageMessage) {
            const img = msg.imageMessage;
            info.push(`Size: ${this.formatBytes(img.fileLength || 0)}`);
            if (img.width && img.height)
                info.push(`Res: ${img.width}x${img.height}`);
            if (img.mimetype) info.push(`Type: ${img.mimetype}`);
        } else if (msg.videoMessage) {
            const vid = msg.videoMessage;
            info.push(`Size: ${this.formatBytes(vid.fileLength || 0)}`);
            if (vid.seconds) info.push(`Duration: ${vid.seconds}s`);
            if (vid.mimetype) info.push(`Type: ${vid.mimetype}`);
        } else if (msg.audioMessage) {
            const aud = msg.audioMessage;
            info.push(`Size: ${this.formatBytes(aud.fileLength || 0)}`);
            if (aud.seconds) info.push(`Duration: ${aud.seconds}s`);
            if (aud.ptt) info.push(`Voice Note`);
        } else if (msg.documentMessage) {
            const doc = msg.documentMessage;
            info.push(`Size: ${this.formatBytes(doc.fileLength || 0)}`);
            if (doc.fileName) info.push(`Name: ${doc.fileName}`);
            if (doc.mimetype) info.push(`Type: ${doc.mimetype}`);
        } else if (msg.stickerMessage) {
            const sticker = msg.stickerMessage;
            info.push(`Size: ${this.formatBytes(sticker.fileLength || 0)}`);
            if (sticker.isAnimated) info.push(`Animated`);
        }

        return info.join(" | ") || "No details available";
    }

    formatBytes(bytes) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    async handleMessage(sock, m) {
        if (!m.message) return;

        // Serialize message
        m = await serialize(m, sock);

        const chat = m.chat.endsWith("broadcast")
            ? jidNormalizedUser(sock.user.id)
            : m.chat;
        const messageId = m.key.id;

        // Detailed logging
        this.logIncomingMessage(m, chat);

        // Cache group metadata when message comes from group
        if (m.isGroup && !groupCache.has(chat)) {
            groupCache.fetch(sock, chat).catch(err => {
                console.error(
                    colors.red("Failed to cache group metadata:"),
                    err.message
                );
            });
        }

        // Store message (non-group only)
        if (!m.isGroup && !m.fromMe) {
            this.state.addMessage(messageId, {
                message: m,
                from: chat,
                timestamp: Date.now()
            });
        }

        // Filter: only process self messages in groups, all messages in private
        if (!m.isGroup && !m.fromMe) return;
        if (
            m.isGroup &&
            m.key.participant !== sock.user.lid.split(":")[0] + "@lid"
        )
            return;

        if (!m.text) return;

        // Handle special commands
        if (await this.handleEval(sock, m)) return;
        if (await this.handleExec(sock, m)) return;

        // Handle plugin commands
        await this.handlePluginCommand(sock, m);
    }

    async handleEval(sock, m) {
        const text = m.text;

        // Eval with >
        if (text.startsWith(">") && !text.startsWith("=>")) {
            const code = text.slice(1).trim();
            if (!code) {
                await m.reply("No code provided");
                return true;
            }
            console.log(colors.cyan(`📩 eval`));
            await this.executeEval(sock, m, code, false);
            return true;
        }

        // Eval with return (=>)
        if (text.startsWith("=>")) {
            const code = text.slice(2).trim();
            if (!code) {
                await m.reply("No code provided");
                return true;
            }
            console.log(colors.cyan(`📩 eval-return`));
            await this.executeEval(sock, m, code, true);
            return true;
        }

        return false;
    }

    async executeEval(sock, m, code, withReturn) {
        try {
            const wrappedCode = withReturn ? `return ${code}` : code;
            const evalFunc = new Function(
                "sock",
                "m",
                "plugins",
                "config",
                "fs",
                "path",
                "util",
                "colors",
                "loadPlugins",
                "messageStore",
                `return (async () => { ${wrappedCode} })()`
            );
            const result = await evalFunc(
                sock,
                m,
                this.state.plugins,
                config,
                fs,
                path,
                util,
                colors,
                () => this.pluginManager.loadPlugins(),
                this.state.messageStore
            );
            const output = util.inspect(result, {
                depth: null,
                maxArrayLength: null,
                maxStringLength: null
            });
            await m.reply(output);
        } catch (error) {
            await m.reply(error.message);
        }
    }

    async handleExec(sock, m) {
        const text = m.text;
        if (!text.startsWith("$")) return false;

        const cmd = text.slice(1).trim();
        if (!cmd) {
            await m.reply("No command provided");
            return true;
        }

        console.log(colors.cyan(`📩 exec`));
        try {
            await m.reply(`⏳ Executing: ${cmd}`);
            const { stdout, stderr } = await execPromise(cmd);
            let output = stdout || "";
            if (stderr) output += `Error:\n${stderr}`;
            if (!output) output = "✅ Executed (no output)";
            await m.reply(output);
        } catch (error) {
            await m.reply(error.message);
        }
        return true;
    }

    async handlePluginCommand(sock, m) {
        const prefixes = config.PREFIX || ["."];
        const prefix = prefixes.find(p => m.text.startsWith(p));
        if (!prefix) return;

        const args = m.text.slice(prefix.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        if (!command) return;

        console.log(colors.cyan(`📩 ${command}`));

        if (this.state.plugins.has(command)) {
            // Try to get file buffer from quoted or current message
            let fileBuffer = null;
            if (m.quoted && m.quoted.isMedia) {
                fileBuffer = await m.quoted.download();
            } else if (m.isMedia) {
                fileBuffer = await m.download();
            }

            const context = {
                sock,
                chat: m.chat,
                from: m.chat, // Alias
                args,
                text: args.join(" "),
                m,
                fileBuffer,
                isGroup: m.isGroup,
                sender: m.sender,
                groupCache, // Add groupCache to context
                reply: async (content, options) =>
                    await m.reply(content, options)
            };

            await this.pluginManager.executePlugin(command, context);
        }
    }
}

// ===== ANTI-DELETE & ANTI-EDIT HANDLER =====
class AntiDeleteEditHandler {
    constructor(state) {
        this.state = state;
    }

    async handleUpdate(sock, update) {
        try {
            const messageId = update.key.id;
            const from = update.key.remoteJid.endsWith("broadcast")
                ? jidNormalizedUser(sock.user.id)
                : update.key.remoteJid;

            const isStatus = update.key.remoteJid.endsWith("broadcast");
            const isGroup = from.endsWith("@g.us");
            if (isGroup) return;

            const storedData = this.state.messageStore.get(messageId);
            if (!storedData || storedData.message.key.fromMe) return;

            // Check for deletion
            if (
                update.update?.message === null ||
                update.update?.messageStubType === 68
            ) {
                await this.handleDelete(sock, from, storedData, isStatus);
            }
            // Check for edit
            else if (
                update.update?.message?.editedMessage ||
                update.update?.message?.protocolMessage?.type === 14
            ) {
                await this.handleEdit(
                    sock,
                    from,
                    messageId,
                    storedData,
                    update
                );
            }
        } catch (error) {
            console.error(
                colors.red("❌ Anti-delete/edit error:"),
                error.message
            );
        }
    }

    async handleDelete(sock, from, storedData, isStatus) {
        console.log(colors.magenta(`🗑️ Message deleted detected`));

        const storedMessage = storedData.message;
        const sender =
            storedMessage.key.participant || storedMessage.key.remoteJid;
        const senderName = storedMessage.pushName || sender.split("@")[0];

        const lastMessage = storedData.editHistory
            ? storedData.editHistory[storedData.editHistory.length - 1].message
            : storedMessage.message;

        const messageInfo = this.getMessageInfo(lastMessage);
        let antiDeleteMsg = this.buildDeleteMessage(
            isStatus,
            senderName,
            sender,
            storedMessage,
            storedData,
            messageInfo
        );

        await sock.sendMessage(from, { text: antiDeleteMsg });
        await this.resendMedia(sock, from, storedMessage);
    }

    async handleEdit(sock, from, messageId, storedData, update) {
        console.log(colors.yellow(`✏️ Message edited detected`));

        const storedMessage = storedData.message;
        const sender =
            storedMessage.key.participant || storedMessage.key.remoteJid;
        const senderName = storedMessage.pushName || sender.split("@")[0];

        const oldContent = this.getOldContent(storedData);
        const { newContent, newMessageObj } = this.getNewContent(update);
        const messageType = this.getMessageType(storedMessage.message);
        const editCount = (storedData.editHistory?.length || 0) + 1;

        const antiEditMsg = this.buildEditMessage(
            senderName,
            sender,
            storedMessage,
            messageType,
            editCount,
            oldContent,
            newContent
        );

        await sock.sendMessage(from, { text: antiEditMsg });
        this.state.addEditHistory(messageId, newMessageObj);
    }

    getMessageInfo(message) {
        const content =
            message?.conversation ||
            message?.extendedTextMessage?.text ||
            message?.imageMessage?.caption ||
            message?.videoMessage?.caption ||
            message?.documentMessage?.caption ||
            "";

        return {
            content,
            hasSticker: !!message?.stickerMessage,
            hasImage: !!message?.imageMessage,
            hasVideo: !!message?.videoMessage,
            hasAudio: !!message?.audioMessage,
            hasDocument: !!message?.documentMessage
        };
    }

    buildDeleteMessage(
        isStatus,
        senderName,
        sender,
        storedMessage,
        storedData,
        messageInfo
    ) {
        let msg = `🚫 *${isStatus ? "STATUS" : "PESAN"} DIHAPUS*\n\n`;
        msg += `👤 Pengirim: ${senderName}\n`;
        msg += `📱 Nomor: ${sender.split("@")[0]}\n`;
        msg += `⏰ Waktu: ${new Date(
            storedMessage.messageTimestamp * 1000
        ).toLocaleString("id-ID")}\n`;

        if (storedData.editHistory?.length > 0) {
            msg += `\n📝 *Riwayat Edit (${storedData.editHistory.length}x):*\n`;
            storedData.editHistory.forEach((edit, index) => {
                const content =
                    this.getMessageInfo(edit.message).content ||
                    "(media/sticker)";
                msg += `\n${index + 1}. ${content}\n   ⏰ ${new Date(
                    edit.timestamp
                ).toLocaleString("id-ID")}`;
            });
            msg += `\n`;
        } else {
            msg += `\n`;
        }

        if (messageInfo.content) {
            msg += `📝 *Pesan Terakhir:*\n${messageInfo.content}`;
        } else if (messageInfo.hasSticker) {
            msg += `🎭 Tipe: Stiker`;
        } else if (messageInfo.hasImage) {
            msg += `🖼️ Tipe: Gambar`;
        } else if (messageInfo.hasVideo) {
            msg += `🎥 Tipe: Video`;
        } else if (messageInfo.hasAudio) {
            msg += `🎵 Tipe: Audio`;
        } else if (messageInfo.hasDocument) {
            msg += `📄 Tipe: Dokumen`;
        }

        return msg;
    }

    buildEditMessage(
        senderName,
        sender,
        storedMessage,
        messageType,
        editCount,
        oldContent,
        newContent
    ) {
        let msg = `✏️ *PESAN DIEDIT*\n\n`;
        msg += `👤 Pengirim: ${senderName}\n`;
        msg += `📱 Nomor: ${sender.split("@")[0]}\n`;

        if (messageType !== "teks") {
            msg += `📦 Tipe: ${messageType}\n`;
        }

        msg += `⏰ Waktu Original: ${new Date(
            storedMessage.messageTimestamp * 1000
        ).toLocaleString("id-ID")}\n`;
        msg += `⏰ Waktu Edit: ${new Date().toLocaleString("id-ID")}\n\n`;
        msg += `🔢 Edit ke-${editCount}\n\n`;

        const label = messageType !== "teks" ? "Caption" : "Pesan";
        msg += `📝 ${label} Lama:\n${oldContent}\n\n`;
        msg += `✨ ${label} Baru:\n${newContent}`;

        return msg;
    }

    getOldContent(storedData) {
        if (storedData.editHistory?.length > 0) {
            const lastEdit =
                storedData.editHistory[storedData.editHistory.length - 1];
            return this.getMessageInfo(lastEdit.message).content || "(kosong)";
        }
        return (
            this.getMessageInfo(storedData.message.message).content ||
            "(kosong)"
        );
    }

    getNewContent(update) {
        let newContent = "(kosong)";
        let newMessageObj = null;

        if (update.update.message?.editedMessage) {
            const editedMsg = update.update.message.editedMessage.message;
            if (editedMsg) {
                newMessageObj = editedMsg;
                newContent =
                    this.getMessageInfo(editedMsg).content || "(kosong)";
            }
        } else if (update.update.message?.protocolMessage) {
            const editedMsg =
                update.update.message.protocolMessage.editedMessage;
            if (editedMsg) {
                newMessageObj = editedMsg;
                newContent =
                    this.getMessageInfo(editedMsg).content || "(kosong)";
            }
        }

        return { newContent, newMessageObj };
    }

    getMessageType(message) {
        if (message?.imageMessage) return "🖼️ Gambar";
        if (message?.videoMessage) return "🎥 Video";
        if (message?.documentMessage) return "📄 Dokumen";
        if (message?.audioMessage) return "🎵 Audio";
        if (message?.stickerMessage) return "🎭 Stiker";
        return "teks";
    }

    async resendMedia(sock, from, storedMessage) {
        const originalMessage = storedMessage.message;
        const downloadOptions = {
            logger: Pino({ level: "silent" }),
            reuploadRequest: sock.updateMediaMessage
        };

        try {
            if (originalMessage?.stickerMessage) {
                const buffer = await downloadMediaMessage(
                    storedMessage,
                    "buffer",
                    {},
                    downloadOptions
                );
                await sock.sendMessage(from, { sticker: buffer });
            } else if (originalMessage?.imageMessage) {
                const buffer = await downloadMediaMessage(
                    storedMessage,
                    "buffer",
                    {},
                    downloadOptions
                );
                await sock.sendMessage(from, {
                    image: buffer,
                    caption: "🖼️ Gambar yang dihapus"
                });
            } else if (originalMessage?.videoMessage) {
                const buffer = await downloadMediaMessage(
                    storedMessage,
                    "buffer",
                    {},
                    downloadOptions
                );
                await sock.sendMessage(from, {
                    video: buffer,
                    caption: "🎥 Video yang dihapus"
                });
            } else if (originalMessage?.audioMessage) {
                const buffer = await downloadMediaMessage(
                    storedMessage,
                    "buffer",
                    {},
                    downloadOptions
                );
                await sock.sendMessage(from, {
                    audio: buffer,
                    mimetype: "audio/mp4"
                });
            } else if (originalMessage?.documentMessage) {
                const buffer = await downloadMediaMessage(
                    storedMessage,
                    "buffer",
                    {},
                    downloadOptions
                );
                await sock.sendMessage(from, {
                    document: buffer,
                    mimetype: originalMessage.documentMessage.mimetype,
                    fileName: originalMessage.documentMessage.fileName,
                    caption: "📄 Dokumen yang dihapus"
                });
            }
        } catch (e) {
            console.error(colors.red("❌ Failed to resend media:"), e.message);
        }
    }
}

// ===== CONNECTION MANAGER =====
class ConnectionManager {
    constructor(state, pluginManager) {
        this.state = state;
        this.pluginManager = pluginManager;
        this.messageHandler = new MessageHandler(state, pluginManager);
        this.antiDeleteEditHandler = new AntiDeleteEditHandler(state);
    }

    async getPairingCode() {
        return new Promise(resolve => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question(
                colors.yellow(
                    "📱 Masukkan nomor WhatsApp (contoh: 628123456789): "
                ),
                answer => {
                    rl.close();
                    resolve(answer.trim());
                }
            );
        });
    }

    async connect() {
        await this.pluginManager.loadPlugins();
        console.log(colors.green("Connecting..."));

        const { version, isLatest } = await fetchLatestWaWebVersion();
        console.log(
            colors.green(`Using version: ${version}\nLatest: ${isLatest}`)
        );

        const { state, saveCreds } = await useMultiFileAuthState(
            config.SESSION
        );

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
            version,
            // Use cached group metadata
            cachedGroupMetadata: async jid => groupCache.get(jid)
        });

        // Extend socket with helper functions
        await extendSocket(sock);

        // Handle pairing
        if (!sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    const pairingNumber = await this.getPairingCode();

                    if (!pairingNumber || pairingNumber.length < 10) {
                        console.error(colors.red("❌ Nomor tidak valid!"));
                        process.exit(1);
                    }

                    const code = await sock.requestPairingCode(
                        pairingNumber,
                        config.PAIRING_CODE
                    );
                    console.log(
                        colors.green(`\n✅ Pairing Code: `) +
                            colors.yellow.bold(code)
                    );
                    console.log(
                        colors.cyan("📲 Masukkan kode ini di WhatsApp kamu\n")
                    );
                } catch (err) {
                    console.error(`Failed to get pairing code: ${err}`);
                }
            }, 3000);
        }

        sock.ev.on("creds.update", saveCreds);
        sock.ev.on("connection.update", update =>
            this.handleConnectionUpdate(update, sock)
        );
        sock.ev.on("messages.upsert", async ({ messages }) => {
            await this.messageHandler.handleMessage(sock, messages[0]);
        });
        sock.ev.on("messages.update", async updates => {
            for (const update of updates) {
                await this.antiDeleteEditHandler.handleUpdate(sock, update);
            }
        });

        // Handle group participants update (for cache sync)
        sock.ev.on(
            "group-participants.update",
            async ({ id, participants, action }) => {
                console.log(
                    colors.cyan(
                        `👥 Group participants update: ${action} in ${id}`
                    )
                );

                if (action === "add") {
                    groupCache.addParticipants(id, participants);
                } else if (action === "remove") {
                    groupCache.removeParticipants(id, participants);
                } else if (action === "promote" || action === "demote") {
                    // Refresh metadata to get updated admin status
                    await groupCache.fetch(sock, id, true);
                }
            }
        );

        // Handle group update (subject, description, etc)
        sock.ev.on("groups.update", async updates => {
            for (const update of updates) {
                console.log(colors.cyan(`🔄 Group update: ${update.id}`));

                if (update.subject) {
                    groupCache.updateSubject(update.id, update.subject);
                }

                // Refresh full metadata for other changes
                if (update.desc || update.restrict || update.announce) {
                    await groupCache.fetch(sock, update.id, true);
                }
            }
        });

        this.setupGracefulShutdown();
    }

    async handleConnectionUpdate(update, sock) {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log(
                colors.green("✅ Connected as ") + colors.cyan(sock.user.name)
            );
        }

        if (connection === "close") {
            const statusCode = new Boom(lastDisconnect?.error)?.output
                ?.statusCode;

            if (
                statusCode === 401 ||
                statusCode === 403 ||
                statusCode === 405
            ) {
                console.warn(
                    colors.red(
                        `⚠️ Session invalid (${statusCode}), resetting...`
                    )
                );
                fs.rmSync(`./${config.SESSION}`, {
                    recursive: true,
                    force: true
                });
            } else {
                console.log(colors.yellow("🔄 Reconnecting..."));
            }

            await this.connect();
        }
    }

    setupGracefulShutdown() {
        process.on("SIGINT", () => {
            console.log(colors.yellow("\n⏹️  Shutting down..."));
            this.state.saveMessageStore();
            console.log(colors.green("💾 Message store saved"));

            // Log cache stats before exit
            groupCache.logStats();

            console.log(colors.green("👋 Stopped\n"));
            process.exit(0);
        });
    }
}

// ===== MAIN =====
const main = async () => {
    console.log(colors.cyan("🤖 Starting bot...\n"));

    const state = new BotState();
    const pluginManager = new PluginManager(state);
    const connectionManager = new ConnectionManager(state, pluginManager);

    await connectionManager.connect();
};

main().catch(error => {
    console.error(colors.red("❌ Fatal error:"), error);
    process.exit(0);
});
