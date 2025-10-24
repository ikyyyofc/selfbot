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
        
        lib/gemini.js:
        ${await read("lib/gemini")}
        
        lib/groupCache.js:
        ${await read("lib/groupCache")}
        
        lib/MessageHandler.js:
        ${await read("lib/MessageHandler")}
        
        lib/messageLogger.js:
        ${await read("lib/messageLogger")}
        
        lib/PluginManager.js:
        ${await read("lib/PluginManager")}
        
        lib/serialize.js:
        ${await read("lib/serialize")}
        
        lib/SessionCleaner.js:
        ${await read("lib/SessionCleaner")}
        
        lib/socket.js:
        ${await read("lib/socket")}
        
        lib/upload.js:
        ${await read("lib/upload")}
        
        gunakan file-file diatas sebagai referensi
        
        jika membuat kode, ingatlah untuk membuat kode yang simpel, efisien, dan minimalis tetapi fungsinya jelas dan terstruktur dengan baik, tidak perlu memberikan tanda komentar pada kode yang dibuat, selalu gunakan tipe ESM.
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
            let check_code = extractCodeFromMarkdown(response.data.result);
            if (typeof check_code === "string") {
                await reply(response.data.result);
                await reply(check_code);
            } else {
                await reply(response.data.result);
                for (let x of check_code) {
                    await reply(x);
                }
            }
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

function extractCodeFromMarkdown(text) {
    // Regex untuk menangkap kode di dalam markdown code block
    const regex = /```(?:javascript|js)?\s*\n([\s\S]*?)```/g;

    // Ambil semua kode yang ditemukan
    const matches = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        matches.push(match[1].trim());
    }

    // Jika hanya ada satu code block, return string
    // Jika lebih dari satu, return array
    return matches.length === 1 ? matches[0] : matches;
}
