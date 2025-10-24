// plugins/claude.js
import axios from "axios";
import upload from "../lib/upload.js";
import fs from "fs";

async function read(file) {
    const readFile = await fs.readFileSync("./" + file + ".js", "utf8");
    return readFile;
}

export default async function ({ m, text, fileBuffer, reply }) {
    if (!text) {
        return reply(
            "Silakan berikan pertanyaan Anda setelah perintah. Contoh: .claude Apa kabar?"
        );
    }

    const payload = {
        text: text,
        systemPrompt: `package.json:
        ${await fs.readFileSync("./package.json", "utf8")}
        
        bot.js:
        ${await read("bot")}
        
        config.js:
        ${await read("config")}
        
        index.js:
        ${await read("index")}
        
        lib/AntiDeleteEditHandler.js:
        ${await read("lib/AntiDeleteEditHandler")}
        
        lib/BotState.js:
        ${await read("lib/BotState")}
        
        lib/ConnectionManager.js:
        ${await read("lib/ConnectionManager")}
        `
    };

    if (fileBuffer) {
        try {
            const imageUrl = await upload(fileBuffer);
            if (imageUrl) {
                payload.imageUrl = imageUrl;
            } else {
                // Jika gagal mengunggah, lanjutkan tanpa gambar.
                console.error("Gagal mengunggah gambar untuk Claude API.");
            }
        } catch (e) {
            console.error(
                "Terjadi kesalahan saat mengunggah gambar untuk Claude API:",
                e
            );
            // Lanjutkan tanpa gambar jika ada error saat upload
        }
    }

    try {
        const response = await axios.post(
            "https://api.nekolabs.my.id/ai/claude/sonnet-4",
            payload,
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        if (response.data && response.data.success) {
            await reply(response.data.result);
        } else {
            console.error(
                "Claude API mengembalikan kesalahan atau tidak ada hasil:",
                response.data
            );
            await reply(
                "Terjadi kesalahan dari API atau tidak ada hasil yang ditemukan."
            );
        }
    } catch (error) {
        console.error("Error saat memanggil Claude API:", error);
        await reply(
            `Terjadi kesalahan saat berkomunikasi dengan AI: ${error.message}`
        );
    }
}
