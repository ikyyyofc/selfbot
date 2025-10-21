import {
    jidNormalizedUser,
    downloadMediaMessage
} from "@whiskeysockets/baileys";
import Pino from "pino";

export default async function serialize(m, sock) {
    if (!m) return m;

    m.isGroup = m.key.remoteJid.endsWith("@g.us");
    m.isStatus = m.key.remoteJid.endsWith("@broadcast");
    m.chat = m.key.remoteJid;
    m.from = m.chat;
    let getJid = m.isGroup
        ? await sock.getJidParticipants(m.chat, m.key.participant)
        : m.chat;

    m.key = {
        remoteJid: m.key.remoteJid,
        fromMe: !m.isGroup
            ? m.key.fromMe
            : m.isStatus
            ? m.key.fromMe
            : jidNormalizedUser(sock.user.id) == getJid
            ? true
            : false,
        id: m.key.id,
        participant: m.isGroup
            ? m.key.participant
            : m.isStatus
            ? m.key.participant
            : m.chat,
        participantJid: m.isStatus ? m.key.participant : getJid
    };

    m.sender = jidNormalizedUser(
        m.key.fromMe
            ? sock.user.id
            : m.isGroup
            ? getJid
            : m.isStatus
            ? m.key.participant
            : m.chat
    );
    m.fromMe = m.key.fromMe;

    const type = Object.keys(m.message || {})[0];
    m.type = type;

    const msg = m.message?.[type] || {};
    m.msg = msg;

    m.text =
        m.message?.conversation ||
        msg?.text ||
        msg?.caption ||
        msg?.contentText ||
        msg?.selectedDisplayText ||
        msg?.title ||
        "";

    if (msg?.contextInfo?.quotedMessage) {
        const quoted = msg.contextInfo.quotedMessage;
        const quotedType = Object.keys(quoted)[0];
        const quotedMsg = quoted[quotedType];
        let getJidQuoted = m.chat.includes("@g.us")
            ? await sock.getJidParticipants(m.chat, msg.contextInfo.participant)
            : m.chat;

        m.quoted = {
            key: {
                remoteJid: m.chat,
                fromMe:
                    msg.contextInfo.participant ===
                    jidNormalizedUser(sock.user.id),
                id: msg.contextInfo.stanzaId,
                participant:
                    msg.contextInfo.participant ===
                        jidNormalizedUser(sock.user.id) &&
                    m.chat.includes("@g.us")
                        ? await sock.getLidParticipants(
                              m.chat,
                              msg.contextInfo.participant
                          )
                        : msg.contextInfo.participant,
                participantJid:
                    msg.contextInfo.participant ===
                        jidNormalizedUser(sock.user.id) &&
                    m.chat.includes("@g.us")
                        ? msg.contextInfo.participant
                        : getJidQuoted
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
            sender:
                msg.contextInfo.participant ===
                    jidNormalizedUser(sock.user.id) && m.chat.includes("@g.us")
                    ? msg.contextInfo.participant
                    : getJidQuoted,
            isGroup: m.chat.includes("@g.us"),

            isMedia: !!(
                quotedMsg?.mimetype ||
                quotedType === "imageMessage" ||
                quotedType === "videoMessage" ||
                quotedType === "audioMessage" ||
                quotedType === "stickerMessage" ||
                quotedType === "documentMessage"
            ),

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

    m.reply = async (content, options = {}) => {
        const message =
            typeof content === "string" ? { text: content, contextInfo: {
                externalAdReply: {
                    title: "IKYY - SELFBOT",
                    body: "Only User Bot",
                    thumbnailUrl: "https://ikyy-upload-file.hf.space/uploads/mh0qomst-cul6.jpg",
                  //  mediaType: 1,
                  mediaUrl: "https://github.com/ikyyyofc/selfbot",
                    showAdAttribution: false,
                    renderLargerThumbnail: true
                }
            } } : content;
        return await sock.sendMessage(m.chat, message, {
            quoted: m,
            ...options
        });
    };

    m.react = async emoji => {
        return await sock.sendMessage(m.chat, {
            react: { text: emoji, key: m.key }
        });
    };

    m.mentions = msg?.contextInfo?.mentionedJid || [];

    m.isMedia = !!(
        msg?.mimetype ||
        m.type === "imageMessage" ||
        m.type === "videoMessage" ||
        m.type === "audioMessage" ||
        m.type === "stickerMessage" ||
        m.type === "documentMessage"
    );

    m.timestamp = m.messageTimestamp;
    m.pushName = m.pushName || m.sender.split("@")[0];

    return m;
}
