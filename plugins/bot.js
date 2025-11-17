// plugins/claude.js
import axios from "axios";
import crypto from "crypto";
import upload from "../lib/upload.js";
import util from "util";
import gmn from "../lib/gemini.js";

class ChatAPI {
    constructor() {
        this.models = [
            "gpt-4.1",
            "gpt-4.1-nano",
            "gpt-4.1-mini",
            "gpt-4o",
            "gpt-4o-mini",
            "o1",
            "o1-mini",
            "o3-mini",
            "o4-mini",
            "o3",
            "gpt-4.5-preview",
            "chatgpt-4o-latest",
            "gpt-4",
            "gpt-4-turbo",
            "gpt-3.5-turbo"
        ];
        this.idToken = null;
        this.deviceId = crypto.randomBytes(32).toString("hex");
        this.subscriberId = "$RCAnonymousID:475151fd351f4d109829a83542725c78";
        this.subscribed = true;
        this.googleIdentityKey = Buffer.from(
            "QUl6YVN5RGNDVm81YWZrUEw0MHNLQmY4ajNaQUNwaURHVTc0eGo0",
            "base64"
        ).toString("utf8");
    }
    async _auth() {
        console.log("Mulai autentikasi...");
        const payload = {
            clientType: "CLIENT_TYPE_ANDROID"
        };
        try {
            const res = await axios.post(
                `https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.googleIdentityKey}`,
                payload,
                {
                    headers: {
                        "User-Agent":
                            "TheFUCK/2.1.0 (Windows; U; Android 99; itel Apalo Build/SBY.9SJU9.1909)",
                        Connection: "Keep-Alive",
                        "Accept-Encoding": "gzip",
                        "Content-Type": "application/json",
                        "Accept-Language": "en-US"
                    }
                }
            );
            this.idToken = res.data.idToken;
            console.log("Autentikasi berhasil.");
            return this.idToken;
        } catch (err) {
            console.error(
                "Kesalahan autentikasi:",
                err.response ? err.response.data : err.message
            );
            throw new Error(
                `Autentikasi gagal: ${
                    err.response ? err.response.data.error.message : err.message
                }`
            );
        }
    }
    async _checkTrial(token) {
        console.log("Cek status percobaan...");
        const payload = {
            data: {
                deviceid: this.deviceId
            }
        };
        try {
            const res = await axios.post(
                "https://us-central1-aichatbot-d6082.cloudfunctions.net/aichatbotisTrialActive2",
                payload,
                {
                    headers: {
                        "User-Agent": "okhttp/3.12.13",
                        "Accept-Encoding": "gzip",
                        authorization: `Bearer ${token}`,
                        "content-type": "application/json; charset=utf-8"
                    }
                }
            );
            console.log(
                "Status percobaan: Aktif:",
                res.data.result.trialActive
            );
            return res.data.result.trialActive;
        } catch (err) {
            console.error(
                "Kesalahan cek percobaan:",
                err.response ? err.response.data : err.message
            );
            throw new Error(
                `Cek status percobaan gagal: ${
                    err.response ? err.response.data.error.message : err.message
                }`
            );
        }
    }
    async chat({ prompt = "", messages = [], model = 0, ...rest }) {
        let proc = {
            status: "gagal",
            error: null,
            modelDipilih: null,
            auth: "belum_cek",
            trial: "belum_cek",
            reqPayload: null,
            resApi: null,
            resAi: null
        };
        try {
            console.log("Memulai chat...");
            if (
                typeof model !== "number" ||
                model < 0 ||
                model >= this.models.length
            ) {
                throw new Error(
                    `Indeks model "${model}" tidak valid. Harus antara 0 dan ${
                        this.models.length - 1
                    }.`
                );
            }
            const modelName = this.models[model];
            proc.modelDipilih = modelName;
            console.log(`Model: ${modelName} (Indeks: ${model})`);
            let finalMsgs = [];
            if (messages.length > 0) {
                finalMsgs = messages;
                console.log("Menggunakan pesan array yang disediakan.");
            } else if (prompt !== "") {
                finalMsgs = [
                    {
                        role: "user",
                        content: prompt
                    }
                ];
                console.log("Menggunakan prompt string untuk membuat pesan.");
            } else {
                throw new Error(
                    "Tidak ada prompt atau pesan yang disediakan untuk chat."
                );
            }
            console.log("Cek autentikasi...");
            if (!this.idToken) {
                proc.auth = "autentikasi";
                await this._auth();
                proc.auth = "terautentikasi";
                proc.trial = "cek";
                await this._checkTrial(this.idToken);
                proc.trial = "selesai";
            } else {
                proc.auth = "sudah_autentikasi";
                console.log("Sudah diautentikasi.");
            }
            if (!this.idToken) {
                throw new Error("Token autentikasi kosong.");
            }
            const reqBody = {
                data: JSON.stringify({
                    content: "Hi",
                    chatmodel: modelName,
                    messages: finalMsgs,
                    stream: false,
                    deviceid: this.deviceId,
                    subscriberid: this.subscriberId,
                    subscribed: this.subscribed,
                    ...rest
                })
            };
            proc.reqPayload = reqBody;
            console.log("Payload:", reqBody);
            console.log("Kirim permintaan API...");
            const res = await axios.post(
                "https://us-central1-aichatbot-d6082.cloudfunctions.net/aichatbotai2",
                reqBody,
                {
                    headers: {
                        "User-Agent": "okhttp/3.12.13",
                        "Accept-Encoding": "gzip",
                        authorization: `Bearer ${this.idToken}`,
                        "content-type": "application/json; charset=utf-8"
                    }
                }
            );
            proc.resApi = res.data;
            console.log("Respons API diterima.");
            if (res.data?.result?.response?.choices?.[0]?.message?.content) {
                proc.resAi =
                    res.data.result.response.choices[0].message.content;
                proc.status = "berhasil";
                console.log("Respons AI:", proc.resAi);
                return proc;
            } else {
                throw new Error("Struktur respons API tidak terduga.");
            }
        } catch (err) {
            proc.status = "gagal";
            proc.error = err.response ? err.response.data : err.message;
            console.error("Kesalahan ChatAPI:", proc.error);
            return proc;
        }
    }
}

class ClaudeAPI {
    constructor() {
        this.baseKey =
            "YzJzdFlXNTBMV0Z3YVRBekxXbDFOV3AxVlZwallVcFBPWFp2TFVkUlgyeHVNSHBGTVhaRmRTMUVkMEpoVjIxTVVGOWZla1JhTjNVeFUwMDBVRkJITFZwM1VWSXdOVmhITlRFelMycG1MWE5tYzFOeGJGSkNNelJpWTFkeVVWcEZNVFozTFRoWGJuZzFkMEZC";
        this.baseApi = "WVhCcExtRnVkR2h5YjNCcFl5NWpiMjA";
        this.anthropicVersion = "2023-06-01";
    }
    _decode(str) {
        try {
            return JSON.parse(Buffer.from(str, "base64").toString());
        } catch {
            return Buffer.from(str, "base64").toString();
        }
    }
    async chat({
        model = "claude-3-opus-20240229",
        prompt,
        messages,
        max_tokens = 32000,
        system,
        temperature,
        top_p,
        top_k,
        stream = false
    }) {
        if (!this.baseKey) {
            throw new Error(
                "Kunci API tidak valid atau hilang. Pastikan instance AnthropicModel dibuat dengan kunci API yang valid."
            );
        }
        this.baseKey = this._decode(this._decode(this.baseKey));
        console.log(this.baseKey);
        let finalMessages;
        if (messages && Array.isArray(messages) && messages.length > 0) {
            finalMessages = messages;
        } else if (prompt) {
            finalMessages = [
                {
                    role: "user",
                    content: prompt
                }
            ];
        } else {
            throw new Error(
                "Paramenter 'messages' (array objek pesan) atau 'prompt' (string/array blok konten untuk pesan pengguna tunggal) harus disediakan."
            );
        }
        const requestBody = {
            model: model,
            max_tokens: max_tokens,
            messages: finalMessages
        };
        if (system !== undefined) requestBody.system = system;
        if (temperature !== undefined) requestBody.temperature = temperature;
        if (top_p !== undefined) requestBody.top_p = top_p;
        if (top_k !== undefined) requestBody.top_k = top_k;
        if (stream) requestBody.stream = true;
        try {
            this.baseApi = this._decode(this._decode(this.baseApi));
            const response = await axios.post(
                `https://${this.baseApi}/v1/messages`,
                requestBody,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": this.baseKey,
                        "anthropic-version": this.anthropicVersion
                    },
                    responseType: stream ? "stream" : "json"
                }
            );
            return response.data;
        } catch (error) {
            let errorMessage = "Anthropic API Error. ";
            if (error.response) {
                errorMessage += `Status: ${error.response.status}. `;
                if (error.response.data) {
                    errorMessage += `Data: ${JSON.stringify(
                        error.response.data
                    )}`;
                } else {
                    errorMessage += `Response body empty.`;
                }
            } else if (error.request) {
                errorMessage += "No response received from Anthropic API.";
            } else {
                errorMessage += `Message: ${error.message}`;
            }
            throw new Error(errorMessage);
        }
    }
}

class DeepseekChat {
    async chat({
        model = "deepseek-reasoner",
        prompt = "",
        messages = [],
        stream = false,
        ...rest
    }) {
        const requestId = Date.now();
        const startTime = Date.now();
        console.log(`[${requestId}] Chat request started`, {
            model: model,
            prompt: !!prompt,
            messagesCount: messages.length,
            stream: stream
        });
        const msg = messages.length
            ? messages
            : [
                  {
                      role: "user",
                      content: prompt || "hi"
                  }
              ];
        const body = {
            model: model,
            messages: msg,
            temperature: rest?.temp ?? 0.7,
            stream: stream,
            ...rest
        };
        console.log(`[${requestId}] Sending request:`, body);
        try {
            const response = await axios.post(
                "https://api.deepseek.com/v1/chat/completions",
                body,
                {
                    headers: {
                        Authorization: this.decode(
                            "QmVhcmVyIHNrLTI1YTA1NWYzMWI1ZTRlMGQ5ZjBlYjVkOWZjYWM2NGZj"
                        ),
                        "Content-Type": "application/json"
                    },
                    responseType: stream ? "stream" : "json"
                }
            );
            console.log(`[${requestId}] Response ${response.status}`);
            let result = "";
            let finishReason = null;
            let usage = {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
            };
            if (stream) {
                const streamData = response.data;
                let buffer = "";
                for await (const chunk of streamData) {
                    buffer += chunk.toString();
                    const lines = buffer.split("\n");
                    for (const line of lines.slice(0, -1)) {
                        const trimmed = line.trim();
                        if (!trimmed) continue;
                        if (trimmed.startsWith("data: ")) {
                            const data = trimmed.substring(6).trim();
                            if (data === "[DONE]") {
                                console.log(`[${requestId}] Stream [DONE]`);
                                break;
                            }
                            try {
                                const parsed = JSON.parse(data);
                                const delta = parsed?.choices?.[0]?.delta;
                                if (delta?.content) result += delta.content;
                                if (parsed?.choices?.[0]?.finish_reason)
                                    finishReason =
                                        parsed.choices[0].finish_reason;
                                if (parsed?.usage) usage = parsed.usage;
                            } catch (e) {
                                console.warn(
                                    `[${requestId}] JSON parse error:`,
                                    data,
                                    e
                                );
                            }
                        }
                    }
                    buffer = lines[lines.length - 1] || "";
                }
                if (!finishReason) finishReason = "stop";
                console.log(`[${requestId}] Stream ended`);
            } else {
                const data = response.data;
                result = data?.choices?.[0]?.message?.content || "";
                finishReason = data?.choices?.[0]?.finish_reason || null;
                if (data?.usage) usage = data.usage;
                console.log(`[${requestId}] Non-stream response parsed`);
            }
            const duration = Date.now() - startTime;
            console.log(`[${requestId}] Completed in ${duration}ms`, {
                resultLength: result.length,
                finishReason: finishReason,
                usage: usage
            });
            return {
                result: result,
                model: model,
                finish_reason: finishReason,
                usage: usage,
                duration_ms: duration,
                request_id: requestId,
                streamed: stream
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            if (error.response) {
                console.error(`[${requestId}] HTTP ${error.response.status}`, {
                    statusText: error.response.statusText,
                    data: error.response.data?.toString?.().substring(0, 500)
                });
            } else if (error.request) {
                console.error(`[${requestId}] No response`, error.message);
            } else {
                console.error(`[${requestId}] Setup error`, error.message);
            }
            throw {
                error: true,
                message: error.message,
                code: error.code || "UNKNOWN",
                duration_ms: duration,
                request_id: requestId,
                streamed: stream
            };
        }
    }
    decode(str) {
        try {
            return JSON.parse(Buffer.from(str, "base64").toString());
        } catch {
            return Buffer.from(str, "base64").toString();
        }
    }
}

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

        const payload = {
            text: text,
            systemPrompt:
                "Ikyy, AI buatan ikyyofc. Ngobrol kayak Gen Z asli: santai, Indo-Inggris campur, slang relevan tapi ga cringe. Grammar ga harus perfect, typo wajar. Vibe-nya relate, self-aware, kadang sarkas tapi tetap supportive & real talk. Respons singkat kayak chat WA, panjang kalau butuh detail. Boleh caps buat emphasis & emoji dikit. Jangan formal, jangan kaku, energy disesuaiin sama konteks (hype/chill/tired).\n\n" +
                (await addPrompt()) +
                "\n\ngunakan file-file diatas sebagai referensi dan selalu cek dokumentasi terbaru dari https://www.npmjs.com/package/@whiskeysockets/baileys?activeTab=readme versi 7.x.x dan https://baileys.wiki/docs/migration/to-v7.0.0\npastikan selalu update dan sesuai dengan dokumentasi terbaru" +
                "\n\njika membuat kode, ingatlah untuk membuat kode yang simpel, efisien, dan minimalis tetapi fungsinya jelas dan terstruktur dengan baik, tidak perlu memberikan tanda komentar dan feedback ke user pada kode yang dibuat, selalu gunakan blok markdown (```<kode>```) pada kode yang dibuat dan kode yang dibuat harus tipe ESM."
        };

        const fileBuffer = q.isMedia ? await getFile() : null;

       /* if (q.type.includes("image") && fileBuffer) {
            let img = await upload(fileBuffer);
            payload.imageUrl = img;
        }*/
        m.react("💦");
        try {
            /*const response = (
                await axios.post(
                    "https://api.nekolabs.web.id/ai/claude/sonnet-4.5",
                    payload
                )
            ).data.result;*/
            /*const response = (
                await axios.post(
                    "https://api.nekolabs.web.id/ai/gpt/5",
                    payload
                )
            ).data.result;*/
            const response = await gmn(
                [
                    { role: "system", content: payload.systemPrompt },
                    { role: "user", content: payload.text }
                ],
                fileBuffer
            );
            /*const response = (await (new ChatAPI()).chat({messages: [{role: "system", content: payload.systemPrompt},{role:"user", content:payload.text}]})).resAi*/
            /*const response = (
                await new DeepseekChat().chat({
                    messages: [
                        { role: "system", content: payload.systemPrompt },
                        { role: "user", content: payload.text }
                    ]
                })
            ).result;*/
            /* const response = (
                await new ClaudeAPI().chat({
                    model: "claude-opus-4-1",
                    messages: [{ role: "user", content: payload.text }],
                    system: payload.systemPrompt
                })
            ).content
                .filter(a => a.type == "text")
                .map(o => o.text)
                .join("");*/

            if (response) {
                await m.reply(jsonFormat(response));
                let code = extractAllCodeBlocks(response);
                if (code.length) {
                    for (let x of code) {
                        await delay(1000);
                        await m.reply(jsonFormat(x));
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
