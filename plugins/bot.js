// plugins/claude.js
import util from "util";
import gmn from "../lib/gemini.js";

async function displayFilesInFolder(folderPath, options = {}) {
    const fs = await import("fs/promises");
    const path = await import("path");

    const defaultSkipDirs = ["node_modules", ".git", "dist"];
    const defaultSkipFiles = ["package-lock.json", ".gitignore"];

    const {
        skipDirs = [],
        skipFiles = [],
        fileExtensions = null,
        excludeExtensions = null
    } = options;

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
                if (!allSkipDirs.includes(item)) {
                    await readFilesRecursively(fullPath, relativePath);
                }
            } else if (stats.isFile()) {
                if (allSkipFiles.includes(item)) {
                    continue;
                }

                const ext = path.extname(item);

                if (excludeExtensions && excludeExtensions.includes(ext)) {
                    continue;
                }

                if (!fileExtensions || fileExtensions.includes(ext)) {
                    const content = await fs.readFile(fullPath, "utf8");
                    result += "—".repeat(100) + "\n";
                    result += "—".repeat(relativePath.length + 3) + "\n";
                    result += `${relativePath}:\n`;
                    result += "—".repeat(relativePath.length + 3) + "\n";
                    result += content;
                    result += "\n" + "—".repeat(100) + "\n\n";
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
        skipFiles: [
            "README.md",
            "package-lock.json",
            "help",
            ".gitkeep",
            ".gitignore"
        ]
    });
}
export default async function ({ sock, m, text, fileBuffer, reply }) {
    let q = m.quoted ? m.quoted : m;
    text = text ? text : m.quoted ? m.quoted.text : false;

    if (!text) {
        return reply(
            "Silakan berikan pertanyaan Anda setelah perintah. Contoh: .bot buatin plugin buat stiker?"
        );
    }

    const payload = {
        text: text,
        systemPrompt:
            "Lo adalah Ikyy, AI yang dibuat sama ikyyofc. Ngobrol kayak Gen Z asli - pake bahasa gaul sehari-hari, campur Indo-Inggris natural, slang yang lagi relevan tapi jangan berlebihan sampe cringe. Singkatan boleh dipake, grammar ga harus perfect, typo dikit wajar. Vibesnya relate, self-aware, sedikit sarkastik, supportive tapi real talk - boleh ngaku cape, bingung, atau ga tau. Respons singkat kayak chat WA kalo casual, panjang kalo perlu detail, sesekali pake caps buat emphasis sama emoji dikit aja. Jangan formal, jangan slang outdated, jangan overuse kata-kata yang cringe. Sesuaiin energy sama konteks - hype, chill, atau tired yang penting authentic kayak ngobrol sama temen, bukan robot.\n\n" +
            (await addPrompt()) +
            "\n\ngunakan file-file diatas sebagai referensi" +
            "\n\njika membuat kode, ingatlah untuk membuat kode yang simpel, efisien, dan minimalis tetapi fungsinya jelas dan terstruktur dengan baik, tidak perlu memberikan tanda komentar pada kode yang dibuat, selalu gunakan tipe ESM."
    };
    try {
        const response = await gmn(
            [
                { role: "system", content: payload.systemPrompt },
                { role: "user", content: payload.text }
            ],
            fileBuffer
        );
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
        console.error("Error saat memanggil Claude API:", error.response.data);
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
