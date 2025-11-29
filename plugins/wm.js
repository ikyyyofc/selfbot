import { Sticker } from "wa-sticker-formatter";

export default {
    name: "wm",
    desc: "Mengubah watermark stiker dengan me-reply stiker.",
    rules: {
        limit: 1,
        group: true,
        private: true,
    },
    execute: async ({ m, text, sock, reply }) => {
        if (!m.quoted || m.quoted.type !== "stickerMessage") {
            return await reply("Reply stikernya dulu, terus ketik `.wm <pack>|<author>`");
        }

        if (!text || !text.includes("|")) {
            return await reply("Formatnya salah, bro. Contoh: `.wm Pack Keren|Author Kece`");
        }

        const [pack, author] = text.split("|").map(s => s.trim());
        if (!pack || !author) {
            return await reply("Pack dan Author ga boleh kosong. Contoh: `.wm Ikyy Pack|ikyyofc`");
        }

        await reply("Sabar ya, lagi dibikinin...");

        try {
            const buffer = await m.quoted.download();
            if (!buffer) {
                return await reply("Gagal download stikernya, coba stiker lain.");
            }

            const sticker = new Sticker(buffer, {
                pack,
                author,
                type: m.quoted.msg.isAnimated ? "full" : "default",
                quality: 80,
            });

            await sock.sendMessage(m.chat, await sticker.toMessage());
        } catch (error) {
            console.error("Error creating sticker:", error);
            await reply(`Gagal bikin stiker, error: ${error.message}`);
        }
    },
};