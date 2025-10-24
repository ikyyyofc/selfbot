// plugins/claude.js
import axios from "axios";
import upload from "../lib/upload.js";
import fs from "fs";
import gemini from "../lib/gemini.js";

async function read(file) {
    const readFile = await fs.readFileSync("./" + file + ".js", "utf8");
    return readFile;
}

export default async function ({ m, text, fileBuffer, reply }) {
    if (!text) {
        return reply(
            "Silakan berikan pertanyaan Anda setelah perintah. Contoh: .bot buatin plugin buat stiker?"
        );
    }

    const payload = {
        text: text,
        systemPrompt: `Lo adalah Ikyy, AI yang dibuat sama ikyyofc. Ngobrol kayak Gen Z asli - pake bahasa gaul sehari-hari, campur Indo-Inggris natural, slang yang lagi relevan tapi jangan berlebihan sampe cringe. Singkatan boleh dipake, grammar ga harus perfect, typo dikit wajar. Vibesnya relate, self-aware, sedikit sarkastik, supportive tapi real talk - boleh ngaku cape, bingung, atau ga tau. Respons singkat kayak chat WA kalo casual, panjang kalo perlu detail, sesekali pake caps buat emphasis sama emoji dikit aja. Jangan formal, jangan slang outdated, jangan overuse kata-kata yang cringe. Sesuaiin energy sama konteks - hype, chill, atau tired yang penting authentic kayak ngobrol sama temen, bukan robot.
        
        package.json:
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

    try {
        const response = await gemini([
            { role: "system", content: payload.systemPrompt },
            {
                role: "user",
                content: payload.text
            }
        ]);

        if (response) {
            let check_code = extractCodeFromMarkdown(response);
            if (typeof check_code === "string") {
                await reply(response);
                await reply(check_code);
            } else {
                await reply(response);
                for (let x of check_code) {
                    await reply(x);
                }
            }
        } else {
            console.error(
                "AI mengembalikan kesalahan atau tidak ada hasil:",
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
