import colors from "@colors/colors/safe.js";
import groupCache from "./groupCache.js";

class MessageLogger {
    constructor() {
        this.separator = colors.gray("═".repeat(80));
        this.thinLine = colors.gray("─".repeat(80));
    }

    /**
     * Log detailed information about incoming message
     * @param {Object} m - Serialized message object
     * @param {string} chat - Chat ID
     */
    logIncomingMessage(m, chat) {
        console.log(this.separator);
        this.logHeader(m);
        this.logMessageInfo(m, chat);
        this.logMessageContent(m);
        this.logTechnicalDetails(m);
        this.logFlags(m);
        console.log(this.separator);
        console.log(""); // Empty line for readability
    }

    /**
     * Log header with timestamp
     */
    logHeader(m) {
        const timestamp = new Date().toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta"
        });
        console.log(
            colors.cyan.bold(`📨 INCOMING MESSAGE`) +
                colors.gray(` | ${timestamp}`)
        );
        console.log(this.thinLine);
    }

    /**
     * Log message direction, type and sender info
     */
    logMessageInfo(m, chat) {
        // Message Type & Direction
        const messageDirection = m.fromMe ? "OUTGOING (Self)" : "INCOMING";
        const chatType = m.isGroup
            ? "GROUP CHAT"
            : m.isChannel
            ? "FROM CHANNEL"
            : "PRIVATE CHAT";
        console.log(
            colors.white(`📍 Direction: `) + colors.yellow(messageDirection)
        );
        console.log(colors.white(`💬 Chat Type: `) + colors.blue(chatType));

        // Sender Info
        const senderName = m.isChannel
            ? "(ADMIN CHANNEL)"
            : m.pushName || "Unknown";
        const senderNumber = m.isChannel
            ? "ADMIN CHANNEL"
            : m.sender?.split("@")[0] || "Unknown";
        console.log(
            colors.white(`👤 Sender: `) +
                colors.green(senderName) +
                colors.gray(` (${senderNumber})`)
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
        if (m.isChannel) {
            const channelName = m.channelName;
            const channelId = m.chat.split("@")[0];
            console.log(
                colors.white(`📱 Channel: `) +
                    colors.magenta(channelName) +
                    colors.gray(` (${channelId})`)
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
    }

    /**
     * Log message content
     */
    logMessageContent(m) {
        console.log(this.thinLine);
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
    }

    /**
     * Log technical details (ID, timestamp)
     */
    logTechnicalDetails(m) {
        console.log(this.thinLine);
        console.log(colors.white(`🔑 Message ID: `) + colors.gray(m.key.id));
        console.log(
            colors.white(`⏱️  Timestamp: `) +
                colors.gray(
                    new Date(m.messageTimestamp * 1000).toLocaleString(
                        "id-ID",
                        {
                            timeZone: "Asia/Jakarta"
                        }
                    )
                )
        );
    }

    /**
     * Log special flags
     */
    logFlags(m) {
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
    }

    /**
     * Get detailed message type description
     * @param {Object} m - Message object
     * @returns {string} Message type description
     */
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

    /**
     * Get media information
     * @param {Object} m - Message object
     * @returns {string} Media information string
     */
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

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes to format
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }
}

// Export singleton instance
export default new MessageLogger();
