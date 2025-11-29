import { Sticker, StickerTypes } from "wa-sticker-formatter";
import config from "../config.js";

export default {
    desc: "Membuat stiker dari gambar atau video.",
    rules: {
        limit: 1, // Menggunakan 1 limit per pembuatan stiker
    },
    async execute(context) {
        const { m, sock, reply } = context;

        // Cek apakah ada media (gambar/video) di pesan atau di pesan yang dibalas
        const isMedia = m.isMedia || (m.quoted && m.quoted.isMedia);
        if (!isMedia) {
            await reply("❌ Kirim/balas gambar, video, atau gif dengan caption `.sticker`");
            return;
        }

        // Kasih reaksi "loading"
        await m.react("⏳");

        try {
            // Ambil buffer media
            const buffer = m.quoted ? await m.quoted.download() : await m.download();
            if (!buffer) {
                throw new Error("Gagal mengunduh media.");
            }

            // Opsi untuk stiker
            const stickerOptions = {
                pack: config.BOT_NAME || "Ikyy Bot",
                author: config.OWNER_NAME || "IkyyOFC",
                type: StickerTypes.FULL, // Tipe stiker (bisa juga ROUNDED)
                quality: 70, // Kualitas stiker (0-100)
            };

            // Buat stiker
            const sticker = new Sticker(buffer, stickerOptions);

            // Kirim stiker sebagai pesan
            await sock.sendMessage(m.chat, await sticker.toMessage(), { quoted: m });

            // Kasih reaksi "sukses"
            await m.react("✅");
        } catch (error) {
            console.error("Sticker creation error:", error);
            await reply(`❌ Gagal membuat stiker. Pastikan file media tidak rusak.\n\nError: ${error.message}`);
            // Kasih reaksi "gagal"
            await m.react("❌");
        }
    },
};