import axios from "axios";
import upload from "../lib/upload.js";

export default {
    desc: "edit gambar dengan ai",
    rules: {
        limit: 5
    },
    async execute({ sock, m, args, text, getFile }) {
        try {
            if (!text) {
                return await m.reply(
                    "❌ *Penggunaan:*\n" +
                    ".edit <prompt>\n\n" +
                    "*Contoh:*\n" +
                    ".edit tambahkan gadis cantik\n\n" +
                    "⚠️ Kirim/reply gambar dengan caption"
                );
            }

            const fileBuffer = await getFile();
            if (!fileBuffer) {
                return await m.reply(
                    "❌ Kirim/reply gambar dengan caption:\n" +
                    ".edit <prompt>"
                );
            }

            await m.reply("⏳ Sedang mengedit gambar...");

            const imageUrl = await upload(fileBuffer);
            if (!imageUrl) {
                return await m.reply("❌ Gagal upload gambar");
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

            if (data.code !== 0 || !data.data?.url) {
                return await m.reply("❌ Gagal edit gambar");
            }

            await sock.sendMessage(
                m.chat,
                {
                    image: { url: data.data.url },
                    caption:
                        `✨ *Edit Gambar AI*\n\n` +
                        `📝 Prompt: ${text}\n` +
                        `✅ Berhasil diedit`
                },
                { quoted: m }
            );
        } catch (error) {
            console.error("Error edit:", error);
            await m.reply(
                `❌ Error:\n${error.message || "Unknown error"}`
            );
        }
    }
};