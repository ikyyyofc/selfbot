import { Sticker, StickerTypes } from "wa-sticker-formatter";
import config from "../config.js";

const plugin = {
    rules: {
        limit: 1,
        desc: "Ubah watermark stiker dengan pack dan author baru.",
        usage: "Balas stiker dengan perintah .wm [pack|author]",
        example: ".wm Stiker Keren | Oleh Saya"
    },
    execute: async (context) => {
        const { m, text, reply, sock, chat } = context;

        try {
            const isQuotedSticker = m.quoted && m.quoted.type === "stickerMessage";
            const isSticker = m.type === "stickerMessage";

            if (!isQuotedSticker && !isSticker) {
                await reply("☝️ Reply stiker yang mau diubah atau kirim stiker dengan caption perintah ini.");
                return;
            }

            await m.react("⏳");

            const media = isQuotedSticker ? await m.quoted.download() : await m.download();
            if (!media) {
                await reply("Gagal download stikernya, coba lagi.");
                await m.react("❌");
                return;
            }

            let [pack, author] = text.split("|").map(s => s.trim());

            pack = pack || config.BOT_NAME;
            author = author || config.OWNER_NAME;

            const sticker = new Sticker(media, {
                pack: pack,
                author: author,
                type: StickerTypes.FULL,
                quality: 80,
            });

            const stickerMessage = await sticker.toMessage();
            await sock.sendMessage(chat, stickerMessage, { quoted: m });

            await m.react("✅");

        } catch (error) {
            console.error("Error creating sticker with new WM:", error);
            await reply(`Gagal, kayaknya ada error: ${error.message}`);
            await m.react("❌");
        }
    },
};

export default plugin;