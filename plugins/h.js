export default {
  desc: "tag semua member",
    rules: {
        admin: true
    },
    async execute(context) {
        const { sock, m, text, groupCache } = context;

        if (!m.isGroup) {
            return m.reply("Fitur ini cuma buat di grup, bukan PC.");
        }

        try {
            const metadata = await groupCache.fetch(sock, m.chat, true);
            const participants = metadata.participants.map(p => p.id);

            const source = m.quoted || m;
            const caption = text.trim() || source.text || "";

            if (source.isMedia) {
                const buffer = await source.download();
                if (!buffer) {
                    return m.reply("Gagal download media, coba lagi nanti.");
                }

                const type = source.type;
                let message = {};

                if (
                    [
                        "imageMessage",
                        "videoMessage",
                        "documentMessage"
                    ].includes(type)
                ) {
                    if (type === "imageMessage") {
                        message.image = buffer;
                    } else if (type === "videoMessage") {
                        message.video = buffer;
                    } else {
                        message.document = buffer;
                        message.mimetype = source.msg.mimetype;
                        message.fileName = source.msg.fileName;
                    }
                    message.caption = caption;
                    message.mentions = participants;

                    await sock.sendMessage(m.chat, message);
                } else {
                    // For media without captions like sticker/audio
                    let mediaMessage = {};
                    if (type === "stickerMessage") {
                        mediaMessage.sticker = buffer;
                    } else if (type === "audioMessage") {
                        mediaMessage.audio = buffer;
                        mediaMessage.mimetype = "audio/mp4";
                    }

                    await sock.sendMessage(m.chat, mediaMessage);
                    await sock.sendMessage(m.chat, {
                        text: caption,
                        mentions: participants
                    });
                }
            } else {
                // Handle text-only hidetag
                if (!caption) {
                    return m.reply(
                        "Kasih teks atau reply pesan yang mau di-hidetag dong."
                    );
                }
                await sock.sendMessage(m.chat, {
                    text: caption,
                    mentions: participants
                });
            }
        } catch (e) {
            console.error("Error di plugin hidetag:", e);
            m.reply("Waduh, ada error. Coba cek log deh.");
        }
    }
};
