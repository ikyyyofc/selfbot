// plugins/claude.js
import axios from "axios";
import upload from "../lib/upload.js";
import util from "util";

async function displayFilesInFolder(folderPath, options = {}) {
    const fs = await import("fs/promises");
    const path = await import("path");

    const defaultSkipDirs = ["node_modules", ".git", "dist"];
    const defaultSkipFiles = ["package-lock.json", ".gitignore"];

    const {
        skipDirs = [],
        skipFiles = [],
        fileExtensions = null, // ['.js', '.json'] = hanya tampilkan ini
        excludeExtensions = null // ['.md', '.txt'] = jangan tampilkan ini
    } = options;

    // Gabungkan default dengan custom
    const allSkipDirs = [...new Set([...defaultSkipDirs, ...skipDirs])];
    const allSkipFiles = [...new Set([...defaultSkipFiles, ...skipFiles])];

    let result = "";

    async function readFilesRecursively(dir, basePath = "") {
        const items = await fs.readdir(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relativePath = path.join(basePath, item);
            const stats = await fs.stat(fullPath);

            if (stats.isDirectory()) {
                // Skip folder yang tidak diinginkan
                if (!allSkipDirs.includes(item)) {
                    await readFilesRecursively(fullPath, relativePath);
                }
            } else if (stats.isFile()) {
                // Skip file yang tidak diinginkan
                if (allSkipFiles.includes(item)) {
                    continue;
                }

                const ext = path.extname(item);

                // Skip file dengan ekstensi yang di-exclude
                if (excludeExtensions && excludeExtensions.includes(ext)) {
                    continue;
                }

                // Filter berdasarkan ekstensi jika ditentukan (whitelist)
                if (!fileExtensions || fileExtensions.includes(ext)) {
                    const content = await fs.readFile(fullPath, "utf8");
                    result += `${relativePath}:\n`;
                    result += content;
                    result += "\n\n";
                }
            }
        }
    }

    try {
        await readFilesRecursively(folderPath);
        return result;
    } catch (error) {
        throw new Error(`Error reading folder: ${error.message}`);
    }
}

async function addPrompt() {
  return await displayFilesInFolder("./", {
            skipDirs: ["session", "plugins"],
            excludeExtensions: [".md", ".gitignore", ".gitkeep"],
            skipFiles: ["package-lock.json", "help"]
        })
}
export default async function ({ sock, m, text, fileBuffer, reply }) {
    let q = m.quoted ? m.quoted : m;
    text = m.quoted ? m.quoted.text : text ? text : false;

    if (!text) {
        return reply(
            "Silakan berikan pertanyaan Anda setelah perintah. Contoh: .bot buatin plugin buat stiker?"
        );
    }

    const payload = {
        text: text,
        systemPrompt: `Lo adalah Ikyy, AI yang dibuat sama ikyyofc. Ngobrol kayak Gen Z asli - pake bahasa gaul sehari-hari, campur Indo-Inggris natural, slang yang lagi relevan tapi jangan berlebihan sampe cringe. Singkatan boleh dipake, grammar ga harus perfect, typo dikit wajar. Vibesnya relate, self-aware, sedikit sarkastik, supportive tapi real talk - boleh ngaku cape, bingung, atau ga tau. Respons singkat kayak chat WA kalo casual, panjang kalo perlu detail, sesekali pake caps buat emphasis sama emoji dikit aja. Jangan formal, jangan slang outdated, jangan overuse kata-kata yang cringe. Sesuaiin energy sama konteks - hype, chill, atau tired yang penting authentic kayak ngobrol sama temen, bukan robot.
        
        ${await addPrompt()}
        
        gunakan file-file diatas sebagai referensi
        
        message object (m) saat ini:
        ${util.inspect(m, {
            depth: null,
            maxArrayLength: null,
            maxStringLength: null
        })}
        
        jika membuat kode, ingatlah untuk membuat kode yang simpel, efisien, dan minimalis tetapi fungsinya jelas dan terstruktur dengan baik, tidak perlu memberikan tanda komentar pada kode yang dibuat, selalu gunakan tipe ESM.
        `
    };

    if (q.type.includes("image") && fileBuffer) {
        let img = await upload(fileBuffer);
        payload.imageUrl = img;
    }

    try {
        const response = (
            await axios.post(
                "https://api.nekolabs.web.id/ai/claude/sonnet-4",
                payload
            )
        ).data.result;

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



perbaiki kode ini