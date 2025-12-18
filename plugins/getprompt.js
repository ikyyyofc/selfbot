import util from "util";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

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

    // Helper function untuk convert glob pattern ke regex
    function globToRegex(pattern) {
        // Escape special regex characters kecuali * dan ?
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replace(/\*/g, ".*") // * = match any characters
            .replace(/\?/g, "."); // ? = match single character
        return new RegExp(`^${escaped}$`);
    }

    // Helper function untuk check apakah nama match dengan patterns
    function matchesPattern(name, patterns) {
        return patterns.some(pattern => {
            // Kalau pattern mengandung * atau ?, treat sebagai glob pattern
            if (pattern.includes("*") || pattern.includes("?")) {
                const regex = globToRegex(pattern);
                return regex.test(name);
            }
            // Kalau tidak, exact match
            return name === pattern;
        });
    }

    let result = "";

    async function readFilesRecursively(dir, basePath = "") {
        const items = await fs.readdir(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relativePath = path.join(basePath, item);
            const stats = await fs.stat(fullPath);

            if (stats.isDirectory()) {
                if (!matchesPattern(item, allSkipDirs)) {
                    await readFilesRecursively(fullPath, relativePath);
                }
            } else if (stats.isFile()) {
                if (matchesPattern(item, allSkipFiles)) {
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
        skipDirs: ["session", "plugins", ".*", "tmp", "temp", "src"],
        excludeExtensions: [".md", ".gitignore", ".gitkeep", ".py", ".db"],
        skipFiles: [
            "README.md",
            "package-lock.json",
            "help",
            ".gitkeep",
            ".gitignore"
        ]
    });
}

export default {
    desc: "mendapatkan prompt bot",
    rules: {
        owner: true
    },
    async execute({ sock, m, text, fileBuffer, reply }) {
        const systemPrompt =
            "Ikyy, AI buatan ikyyofc. Ngobrol kayak Gen Z asli: santai, Indo-Inggris campur, slang relevan tapi ga cringe. Grammar ga harus perfect, typo wajar. Vibe-nya relate, self-aware, kadang sarkas tapi tetap supportive & real talk. Respons singkat kayak chat WA, panjang kalau butuh detail. Boleh caps buat emphasis & emoji dikit. Jangan formal, jangan kaku, energy disesuaiin sama konteks (hype/chill/tired).\n\n" +
            (await addPrompt()) +
            "\n\ngunakan file-file diatas sebagai referensi dan selalu cek dokumentasi terbaru dari https://www.npmjs.com/package/@whiskeysockets/baileys?activeTab=readme versi 7.x.x dan https://baileys.wiki/docs/migration/to-v7.0.0\npastikan selalu update dan sesuai dengan dokumentasi terbaru\n\n" +
            "jika membuat kode, ingatlah untuk membuat kode yang simpel, efisien, dan minimalis tetapi fungsinya jelas dan terstruktur dengan baik, tidak perlu memberikan tanda komentar pada kode yang dibuat, selalu gunakan tipe ESM.\n\n";

        const buttonData = {
            text: "Klik tombol di bawah buat nyalin kode promptnya!",
            footer: "Powered by Ikyy",
            buttons: [
                {
                    name: "cta_copy",

                    buttonParamsJson: JSON.stringify({
                        display_text: "Prompt Developer",
                        copy_code: systemPrompt
                    })
                }
            ]
        };

        sock.sendButtons(m.chat, buttonData);
    }
};
