import axios from "axios";
import upload from "../lib/upload.js";

export default {
    rules: {
        limit: 5, // Biaya 5 limit per penggunaan
        premium: false,
        owner: false,
        group: false,
        private: false,
    },
    execute: async (context) => {
        const { m, text, reply, getFile, sock, chat } = context;

        const supportedMedia = ["imageMessage"];
        const isMedia = m.type === "imageMessage" || m.quoted?.type === "imageMessage";
        const prompt = text.trim();

        if (!isMedia) {
            return await reply("❌ Gambarnya mana? Reply atau kirim gambar dengan caption.");
        }
        if (!prompt) {
            return await reply("❌ Mau diedit jadi apa gambarnya? Kasih prompt dong.\n\nContoh: .aiedit change the background to beach");
        }

        await reply("⏳ Bentar, AI lagi mikir...");

        try {
            const imageBuffer = await getFile();
            if (!imageBuffer) {
                return await reply("❌ Gagal dapetin gambar, coba lagi.");
            }

            const imageUrl = await upload(imageBuffer);
            if (!imageUrl) {
                return await reply("❌ Gagal upload gambar, servernya lagi down kayaknya.");
            }

            const { data } = await axios.post("https://api.nekolabs.web.id/ai/gemini/nano-banana/v1", {
                prompt: prompt,
                imageUrl: imageUrl,
            }, {
                headers: { "Content-Type": "application/json" }
            });

            if (!data.success || !data.result) {
                console.error("API Error:", data);
                return await reply("❌ Gagal ngedit gambar, AI-nya lagi pusing.");
            }

            await sock.sendMessage(chat, {
                image: { url: data.result },
                caption: `✅ Nih hasilnya:\n\n"${prompt}"`
            }, { quoted: m });

        } catch (error) {
            console.error("Plugin Error (aiedit):", error);
            await reply(`❌ Oops, ada error: ${error.message}`);
        }
    },
    help: "Untuk mengedit gambar menggunakan AI. Balas (reply) sebuah gambar atau kirim gambar dengan caption `.aiedit <prompt>`.\nContoh: `.aiedit change clothes to red`."
};