import axios from "axios";
import upload from "../lib/upload.js";

export default async function ({ sock, m, args, text, fileBuffer }) {
    try {
        if (!text) {
            return await m.reply(
                "❌ *Penggunaan:*\n" +
                ".editimg <prompt>\n\n" +
                "*Contoh:*\n" +
                ".editimg tambahkan gadis cantik\n\n" +
                "⚠️ Pastikan reply/kirim gambar dengan caption"
            );
        }

        if (!fileBuffer) {
            return await m.reply(
                "❌ Kirim/reply gambar dengan caption:\n" +
                ".editimg <prompt>"
            );
        }

        await m.reply("⏳ Mengupload gambar...");

        const imageUrl = await upload(fileBuffer);
        if (!imageUrl) {
            return await m.reply("❌ Gagal mengupload gambar");
        }

        await m.reply("🎨 Memproses edit gambar...");

        const response = await axios.get(
            "https://wudysoft.xyz/api/ai/nano-banana/v20",
            {
                params: {
                    prompt: text,
                    imageUrl: imageUrl
                },
                timeout: 120000
            }
        );

        const data = response.data;

        if (!data.ok || !data.images || data.images.length === 0) {
            return await m.reply("❌ Gagal mengedit gambar");
        }

        const resultUrl = data.images[0].url;
        const description = data.description || "Hasil edit gambar";

        await sock.sendMessage(
            m.chat,
            {
                image: { url: resultUrl },
                caption:
                    `✨ *Edit Gambar AI*\n\n` +
                    `📝 Prompt: ${text}\n` +
                    `💬 ${description}\n` +
                    `🆔 Request ID: ${data.requestId}`
            },
            { quoted: m }
        );
    } catch (error) {
        console.error("Error editimg:", error);
        await m.reply(
            `❌ Terjadi kesalahan:\n${error.message || "Unknown error"}`
        );
    }
}