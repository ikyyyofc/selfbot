import { Sticker } from "wa-sticker-formatter";

export default async function ({ sock, m, text, fileBuffer }) {
    try {
        let buffer = fileBuffer;

        // Jika tidak ada file di message saat ini, cek quoted message
        if (!buffer && m.quoted?.isMedia) {
            await m.reply("⏳ Downloading media...");
            buffer = await m.quoted.download();
        }

        // Jika masih tidak ada buffer
        if (!buffer) {
            return await m.reply(
                "❌ Kirim/Reply gambar, video, atau GIF dengan caption .sticker\n\n" +
                "Contoh:\n" +
                "• Kirim gambar + caption: .sticker\n" +
                "• Reply gambar: .sticker\n" +
                "• Dengan teks: .sticker Nama | Author"
            );
        }

        // Parse pack name dan author dari text
        let packname = "Sticker";
        let author = "Selfbot";

        if (text) {
            const parts = text.split("|").map(p => p.trim());
            if (parts[0]) packname = parts[0];
            if (parts[1]) author = parts[1];
        }

        await m.reply("⏳ Membuat sticker...");

        // Buat sticker menggunakan wa-sticker-formatter
        const sticker = new Sticker(buffer, {
            pack: packname,
            author: author,
            type: "full",
            quality: 50
        });

        const stickerBuffer = await sticker.toBuffer();

        // Kirim sticker
        await sock.sendMessage(m.chat, {
            sticker: stickerBuffer
        });

    } catch (error) {
        console.error("Sticker error:", error);
        await m.reply(`❌ Gagal membuat sticker: ${error.message}`);
    }
}