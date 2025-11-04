
import axios from "axios";
import upload from "../lib/upload.js";

export default {
    desc: "Meningkatkan kualitas gambar melalui 3 tahap.",
    rules: {
        limit: 1,
        premium: true
    },
    execute: async ({ m, reply, getFile }) => {
        try {
            const file = await getFile();
            if (!file) {
                return await reply(
                    "Mana gambarnya? Reply atau kirim gambar dengan caption .hd"
                );
            }

            await reply("Sabar ya, lagi proses upscale gambar kamu...");

            const initialUrl = await upload(file);
            if (!initialUrl) {
                return await reply("Gagal upload gambar, coba lagi nanti.");
            }

            const API_BASE = "https://api.nekolabs.web.id/tools/pxpic";
            const steps = [
                {
                    name: "restore",
                    message: "Tahap 1 dari 3: Memulihkan detail gambar..."
                },
                {
                    name: "upscale",
                    message: "Tahap 2 dari 3: Meningkatkan resolusi..."
                },
                { name: "enhance", message: "Tahap 3 dari 3: Finishing..." }
            ];

            let currentUrl = initialUrl;

            for (const step of steps) {
                await reply(step.message);
                const response = await axios.get(
                    `${API_BASE}/${step.name}?imageUrl=${encodeURIComponent(
                        currentUrl
                    )}`
                );

                if (!response.data || !response.data.success) {
                    throw new Error(`Gagal pada tahap ${step.name}.`);
                }
                currentUrl = response.data.result;
            }

            await m.reply({
                image: { url: currentUrl },
                caption: "Nih hasilnya, udah HD kan? ✨"
            });
        } catch (error) {
            console.error("HD plugin error:", error);
            await reply(`Waduh, ada error nih: ${error.message}. Coba lagi bentar ya.`);
        }
    }
};