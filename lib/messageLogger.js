import colors from "@colors/colors/safe.js";

const config = await import("../config.js").then(m => m.default);

class MessageLogger {
    constructor() {
        this.verbose = process.env.LOG_VERBOSE === "true";
    }

    logIncomingMessage(m, chat) {
        if (!this.verbose) {
            this.logSimple(m);
            return;
        }
        this.logDetailed(m, chat);
    }

    logSimple(m) {
        const direction = m.fromMe ? "➡️" : "⬅️";
        const type = m.isGroup ? "👥" : m.isChannel ? "📱" : "💬";
        const name = m.pushName || m.sender.split("@")[0];
        const content = m.text ? m.text.substring(0, 50) : this.getMessageType(m);
        
        console.log(
            colors.gray(`${direction} ${type} `) +
            colors.cyan(name) +
            colors.gray(": ") +
            colors.white(content)
        );
    }

    logDetailed(m, chat) {
        const timestamp = new Date().toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta"
        });
        
        console.log(colors.cyan(`\n📨 ${timestamp}`));
        console.log(colors.gray("─".repeat(60)));
        
        const direction = m.fromMe ? "OUTGOING" : "INCOMING";
        const chatType = m.isGroup ? "GROUP" : m.isChannel ? "CHANNEL" : "PRIVATE";
        console.log(
            colors.white(`${direction} | ${chatType} | `) +
            colors.cyan(m.pushName || m.sender.split("@")[0])
        );
        
        if (m.text) {
            const preview = m.text.length > 100 ? m.text.substring(0, 100) + "..." : m.text;
            console.log(colors.white(`📝 ${preview}`));
        } else {
            console.log(colors.yellow(`📦 ${this.getMessageType(m)}`));
        }
        
        if (m.quoted) {
            console.log(colors.gray(`↩️  Reply to: ${this.getMessageType(m.quoted)}`));
        }
        
        console.log(colors.gray("─".repeat(60) + "\n"));
    }

    getMessageType(m) {
        const msg = m.message || {};

        if (msg.conversation) return "Text";
        if (msg.extendedTextMessage) return "Text+Link";
        if (msg.imageMessage) return "Image";
        if (msg.videoMessage) return "Video";
        if (msg.audioMessage) return msg.audioMessage.ptt ? "Voice" : "Audio";
        if (msg.documentMessage) return "Document";
        if (msg.stickerMessage) return "Sticker";
        if (msg.contactMessage) return "Contact";
        if (msg.locationMessage) return "Location";
        if (msg.pollCreationMessage) return "Poll";
        if (msg.reactionMessage) return "Reaction";

        return "Unknown";
    }
}

export default new MessageLogger();