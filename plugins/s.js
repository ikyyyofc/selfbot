import { Sticker, StickerTypes } from "wa-sticker-formatter";

export default {
  desc: "membuat stiker",
    rules: {
        limit: 1
    },
    async execute({ m, fileBuffer, reply }) {
        try {
            let buffer = fileBuffer;

            if (!buffer && m.quoted?.isMedia) {
                buffer = await m.quoted.download();
            }

            if (!buffer && m.isMedia) {
                buffer = await m.download();
            }

            if (!buffer) {
                return await reply(
                    "❌ Kirim foto/video atau reply media dengan caption .stiker"
                );
            }

            const mediaType = m.quoted?.type || m.type;

            if (!["imageMessage", "videoMessage"].includes(mediaType)) {
                return await reply("❌ Cuma bisa foto atau video doang!");
            }

            const sticker = new Sticker(buffer, {
                pack: "IKYY",
                author: "SELFBOT",
                type: StickerTypes.FULL,
                categories: ["🤖", "🎭"],
                id: Date.now().toString(),
                quality: 50
            });

            const stickerBuffer = await sticker.toBuffer();

            await m.reply({ sticker: stickerBuffer });
        } catch (error) {
            console.error("Sticker error:", error);
            await reply(`❌ Gagal bikin stiker: ${error.message}`);
        }
    }
};
