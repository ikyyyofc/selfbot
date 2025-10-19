import {
    jidNormalizedUser,
    downloadMediaMessage
} from "@whiskeysockets/baileys";
import Pino from "pino";

/**
 * Serialize WhatsApp message for easier access
 * @param {Object} m - Message object from Baileys
 * @param {Object} sock - Socket connection
 * @returns {Object} Serialized message
 */
export default async function serialize(m, sock) {
    if (!m) return m;

    // Basic message info
    m.isGroup = m.key.remoteJid.endsWith("@g.us");
    m.chat = m.key.remoteJid;
    m.from = m.chat; // Alias untuk kompatibilitas
    m.sender = jidNormalizedUser(
        m.key.fromMe
            ? sock.user.id
            : m.isGroup
            ? "gawok"
            : m.chat
    );
    m.fromMe = m.key.fromMe;
    m.tes =  (await sock.getGroupParticipants(m.chat)).filter(v => v.id == m.key.participant)

    // Message type detection
    const type = Object.keys(m.message || {})[0];
    m.type = type;

    const msg = m.message?.[type] || {};
    m.msg = msg;

    // Extract text content from various message types
    m.text =
        m.message?.conversation ||
        msg?.text ||
        msg?.caption ||
        msg?.contentText ||
        msg?.selectedDisplayText ||
        msg?.title ||
        "";

    // Quoted message handling
    m.quoted = null;
    if (msg?.contextInfo?.quotedMessage) {
        const quoted = msg.contextInfo.quotedMessage;
        const quotedType = Object.keys(quoted)[0];
        const quotedMsg = quoted[quotedType];

        m.quoted = {
            key: {
                remoteJid: msg.contextInfo.remoteJid || m.chat,
                fromMe:
                    msg.contextInfo.participant ===
                    jidNormalizedUser(sock.user.id),
                id: msg.contextInfo.stanzaId,
                participant: msg.contextInfo.participant
            },
            message: quoted,
            type: quotedType,
            msg: quotedMsg,
            text:
                quoted.conversation ||
                quotedMsg?.text ||
                quotedMsg?.caption ||
                quotedMsg?.contentText ||
                "",
            sender: jidNormalizedUser(msg.contextInfo.participant || m.chat),
            isGroup: (msg.contextInfo.participant || "").includes("@g.us"),

            // Check if quoted message is media
            isMedia: !!(
                quotedMsg?.mimetype ||
                quotedType === "imageMessage" ||
                quotedType === "videoMessage" ||
                quotedType === "audioMessage" ||
                quotedType === "stickerMessage" ||
                quotedType === "documentMessage"
            ),

            // Download quoted media
            download: async () => {
                try {
                    return await downloadMediaMessage(
                        { message: quoted, key: m.quoted.key },
                        "buffer",
                        {},
                        { logger: Pino({ level: "silent" }) }
                    );
                } catch (e) {
                    console.error(
                        "Failed to download quoted media:",
                        e.message
                    );
                    return null;
                }
            }
        };
    }

    // Download media function
    m.download = async () => {
        try {
            return await downloadMediaMessage(
                m,
                "buffer",
                {},
                { logger: Pino({ level: "silent" }) }
            );
        } catch (e) {
            console.error("Failed to download media:", e.message);
            return null;
        }
    };

    // Reply function
    m.reply = async (content, options = {}) => {
        const message =
            typeof content === "string" ? { text: content } : content;
        return await sock.sendMessage(m.chat, message, {
            quoted: m,
            ...options
        });
    };

    // React function
    m.react = async emoji => {
        return await sock.sendMessage(m.chat, {
            react: { text: emoji, key: m.key }
        });
    };

    // Mentions
    m.mentions = msg?.contextInfo?.mentionedJid || [];

    // Media info
    m.isMedia = !!(
        msg?.mimetype ||
        m.type === "imageMessage" ||
        m.type === "videoMessage" ||
        m.type === "audioMessage" ||
        m.type === "stickerMessage" ||
        m.type === "documentMessage"
    );

    // Message metadata
    m.timestamp = m.messageTimestamp;
    m.pushName = m.pushName || "Unknown";

    return m;
}
