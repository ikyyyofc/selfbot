import util from "util";
import gmn from "../lib/gemini.js";
import axios from "axios";
import up from "../lib/upload.js";
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
        excludeExtensions: [".md", ".gitignore", ".gitkeep", ".py"],
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
    desc: "ai seputar bot",
    rules: {
        owner: true
    },
    async execute({ sock, m, text, getFile, reply }) {
        let q = m.quoted ? m.quoted : m;
        text = text ? text : m.quoted ? m.quoted.text : false;

        if (!text) {
            return reply(
                "Silakan berikan pertanyaan Anda setelah perintah. Contoh: .bot buatin plugin buat stiker?"
            );
        }

        const promptSystem =
            "Ikyy, AI buatan ikyyofc. Ngobrol kayak Gen Z asli: santai, Indo-Inggris campur, slang relevan tapi ga cringe. Grammar ga harus perfect, typo wajar. Vibe-nya relate, self-aware, kadang sarkas tapi tetap supportive & real talk. Respons singkat kayak chat WA, panjang kalau butuh detail. Boleh caps buat emphasis & emoji dikit. Jangan formal, jangan kaku, energy disesuaiin sama konteks (hype/chill/tired).\n\n" +
            (await addPrompt()) +
            "\n\ngunakan file-file diatas sebagai referensi dan selalu cek dokumentasi terbaru dari https://www.npmjs.com/package/@whiskeysockets/baileys?activeTab=readme versi 7.x.x dan https://baileys.wiki/docs/migration/to-v7.0.0\npastikan selalu update dan sesuai dengan dokumentasi terbaru" +
            "\n\njika membuat kode, ingatlah untuk membuat kode yang simpel, efisien, dan minimalis tetapi fungsinya jelas dan terstruktur dengan baik, tidak perlu memberikan tanda komentar dan feedback ke user pada kode yang dibuat, selalu gunakan blok markdown (```<kode>```) pada kode yang dibuat dan kode yang dibuat harus tipe ESM.";

        const payload = {
            text: promptSystem + "\n\n\n\n" + text,
            systemPrompt: promptSystem
        };

        const fileBuffer = q.isMedia ? await getFile() : null;

        if (fileBuffer) {
            payload.imageUrl = await up(fileBuffer);
        }

        m.react("💦");
        try {
            /* const response = await gmn(
                [
                    { role: "system", content: payload.systemPrompt },
                    { role: "user", content: payload.text }
                ],
                fileBuffer
            );*/
            /*const response = (
                await axios.post(
                    "https://api.nekolabs.web.id/text-generation/claude/opus-4.5",
                    payload
                )
            ).data.result.response;*/
            const response = ( await axios.post(
            "https://api.nekolabs.web.id/text-generation/perplexity",
            {
                query: query,
                web: true,
                academic: false,
                social: false,
                finance: false,
            }
        )).data.result.response.answer;
            let copy = [];

            if (response) {
                let code = extractAllCodeBlocks(response);
                if (code.length) {
                    for (let i in code) {
                        await copy.push({
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "Kode ke-" + (parseInt(i) + 1),
                                copy_code: code[i]
                            })
                        });
                    }
                }

                sock.sendInteractiveMessage(
                    m.chat,
                    {
                        text: jsonFormat(response),
                        footer: "AI ini dibuat khusus untuk pengembangan bot",
                        interactiveButtons: copy.length
                            ? copy
                            : [
                                  {
                                      name: "cta_url",
                                      buttonParamsJson: JSON.stringify({
                                          display_text:
                                              "Gada code yang mau di copy",
                                          url: "https://lynk.id/ikyyofc"
                                      })
                                  }
                              ]
                    },
                    {
                        quoted: m
                    }
                );
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
};

/**
 * Fungsi buat nge-extract SEMUA blok kode dari dalem backtick (```).
 * @param {string} text - Teks lengkap yang mengandung satu atau lebih blok kode.
 * @returns {string[]} - Mengembalikan array berisi string kode. Kalo ga ada, array-nya kosong.
 */
function extractAllCodeBlocks(text) {
    const regex = /```(.*?)```/gs;
    const matches = text.matchAll(regex);

    const allCode = [...matches].map(match => {
        let code = match[1].trim();

        // Cek baris pertama, kalo cuma 1 kata (biasanya nama bahasa) hapus
        const lines = code.split("\n");
        const firstLine = lines[0].trim();

        // Kalo baris pertama cuma 1 kata tanpa spasi dan ga ada simbol kode,
        // anggep itu nama bahasa, hapus
        if (
            lines.length > 1 &&
            firstLine &&
            !firstLine.includes(" ") &&
            !firstLine.includes("(") &&
            !firstLine.includes("{") &&
            !firstLine.includes("=") &&
            !firstLine.includes(";")
        ) {
            // Hapus baris pertama, ambil sisanya
            return lines.slice(1).join("\n").trim();
        }

        return code;
    });

    return allCode;
}
