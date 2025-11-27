import {
    generateWAMessageFromContent
} from "@whiskeysockets/baileys";

export default {
    desc: "Bikin reply palsu buat fitnah. Seru-seruan aja, jangan baperan.",
    rules: {
        group: true,
        limit: 1
    },
    execute: async (context) => {
        const {
            sock,
            m,
            text,
            reply
        } = context;

        if (!m.quoted) {
            return await reply("❌ Bro, quote dulu pesan orang yang mau difitnah.");
        }

        const args = text.trim().split("|");
        if (args.length < 2) {
            return await reply("⚠️ Format salah! \n\nContoh: .fitnah @target|pesan fitnahnya");
        }

        const targetArg = args[0].trim();
        const fakeText = args.slice(1).join("|").trim();

        if (!fakeText) {
            return await reply("❌ Pesan fitnahnya jangan kosong dong, ntar ga seru.");
        }

        let targetJid;
        if (m.mentions && m.mentions.length > 0) {
            targetJid = m.mentions[0];
        } else {
            const number = targetArg.replace(/\D/g, "");
            if (!number) {
                return await reply("❌ Targetnya siapa? Tag orangnya atau masukin nomornya.");
            }
            targetJid = `${number}@s.whatsapp.net`;
        }

        try {
            // Kita pinjem 'key' dari pesan yang di-quote, tapi ganti partisipannya
            const fakeQuotedKey = {
                remoteJid: m.chat,
                fromMe: targetJid === sock.user.id.split(":")[0] + "@s.whatsapp.net",
                id: m.quoted.id,
                participant: targetJid,
            };

            // Bangun pesan palsunya
            const fakeMessage = generateWAMessageFromContent(
                m.chat, {
                    extendedTextMessage: {
                        text: fakeText,
                    },
                }, {
                    userJid: sock.user.id,
                    quoted: {
                        key: fakeQuotedKey,
                        message: m.quoted.message
                    },
                }
            );

            // Kirim drama ke grup!
            await sock.relayMessage(m.chat, fakeMessage.message, {
                messageId: fakeMessage.key.id
            });

        } catch (e) {
            console.error(e);
            await reply(`Gagal bikin fitnah, keknya ada error: ${e.message}`);
        }
    }
};