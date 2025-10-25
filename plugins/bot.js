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
        fileExtensions = null,
        excludeExtensions = null
    } = options;

    const allSkipDirs = [...new Set([...defaultSkipDirs, ...skipDirs])];
    const allSkipFiles = [...new Set([...defaultSkipFiles, ...skipFiles])];

    let result = "";

    async function readFilesRecursively(dir, basePath = "") {
        try {
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
                    if (allSkipFiles.includes(item)) continue;

                    const ext = path.extname(item);

                    if (excludeExtensions?.includes(ext)) continue;
                    if (fileExtensions && !fileExtensions.includes(ext))
                        continue;

                    try {
                        const content = await fs.readFile(fullPath, "utf8");
                        result += `${relativePath}:\n${content}\n\n`;
                    } catch (err) {
                        console.error(
                            `Error reading file ${relativePath}:`,
                            err.message
                        );
                    }
                }
            }
        } catch (err) {
            console.error(`Error reading directory ${dir}:`, err.message);
        }
    }

    await readFilesRecursively(folderPath);
    return result;
}

async function addPrompt() {
    try {
        return await displayFilesInFolder("./", {
            skipDirs: ["session", "plugins"],
            excludeExtensions: [".md", ".gitignore", ".gitkeep"],
            skipFiles: ["package-lock.json", "help"]
        });
    } catch (error) {
        console.error("Error generating prompt:", error.message);
        return "";
    }
}

export default async function ({ sock, m, text, fileBuffer, reply }) {
    const q = m.quoted || m;
    text = m.quoted?.text || text;

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
${util.inspect(m, { depth: null, maxArrayLength: null, maxStringLength: null })}

jika membuat kode, ingatlah untuk membuat kode yang simpel, efisien, dan minimalis tetapi fungsinya jelas dan terstruktur dengan baik, tidak perlu memberikan tanda komentar pada kode yang dibuat, selalu gunakan tipe ESM.`
    };

    if (q.type?.includes("image") && fileBuffer) {
        try {
            payload.imageUrl = await upload(fileBuffer);
        } catch (error) {
            console.error("Error uploading image:", error.message);
        }
    }

    try {
        const response = await axios.post(
            "https://api.nekolabs.my.id/ai/claude/sonnet-4",
            payload
        );

        const result = response.data?.result;

        if (!result) {
            console.error("AI mengembalikan respons kosong:", response.data);
            return reply(
                "Terjadi kesalahan dari API atau tidak ada hasil yang ditemukan."
            );
        }

        const codeBlocks = extractCodeFromMarkdown(result);

        await reply(result);

        if (codeBlocks.length > 0) {
            for (const code of codeBlocks) {
                await reply(code);
            }
        }
    } catch (error) {
        console.error("Error saat memanggil Claude API:", error);
        await reply(
            `Terjadi kesalahan saat berkomunikasi dengan AI: ${error.message}`
        );
    }
}

function extractCodeFromMarkdown(text) {
    const regex = /```(?:javascript|js)?\s*\n([\s\S]*?)```/g;
    const matches = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        matches.push(match[1].trim());
    }

    return matches;
}
