import axios from "axios";
import upload from "../lib/upload.js";

export default {
  desc: "edit gambar dengan ai",
    rules: {
        limit: 5
    },
    async execute({ sock, m, args, text, fileBuffer }) {
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

            const imageUrl = await upload(fileBuffer);
            if (!imageUrl) {
                return await m.reply("❌ Gagal mengupload gambar");
            }

            const response = await axios.get(
                "https://wudysoft.xyz/api/ai/nano-banana/v15",
                {
                    params: {
                        prompt: text,
                        imageUrl: imageUrl
                    },
                    timeout: 120000
                }
            );

            const data = response.data;

            if (data.code !== 0 || !data.data || !data.data.url) {
                return await m.reply("❌ Gagal mengedit gambar");
            }

            const resultUrl = data.data.url;

            await sock.sendMessage(
                m.chat,
                {
                    image: { url: resultUrl },
                    caption:
                        `✨ *Edit Gambar AI*\n\n` +
                        `📝 Prompt: ${text}\n` +
                        `✅ Berhasil diedit`
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
};
