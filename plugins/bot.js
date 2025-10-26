// plugins/claude.js
import axios from "axios";
import crypto from "crypto";
import upload from "../lib/upload.js";
import util from "util";
import gmn from "../lib/gemini.js";

class ChatAPI {
  constructor() {
    this.models = ["gpt-4.1", "gpt-4.1-nano", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o3-mini", "o4-mini", "o3", "gpt-4.5-preview", "chatgpt-4o-latest", "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"];
    this.idToken = null;
    this.deviceId = crypto.randomBytes(32).toString("hex");
    this.subscriberId = "$RCAnonymousID:475151fd351f4d109829a83542725c78";
    this.subscribed = true;
    this.googleIdentityKey = Buffer.from("QUl6YVN5RGNDVm81YWZrUEw0MHNLQmY4ajNaQUNwaURHVTc0eGo0", "base64").toString("utf8");
  }
  async _auth() {
    console.log("Mulai autentikasi...");
    const payload = {
      clientType: "CLIENT_TYPE_ANDROID"
    };
    try {
      const res = await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.googleIdentityKey}`, payload, {
        headers: {
          "User-Agent": "TheFUCK/2.1.0 (Windows; U; Android 99; itel Apalo Build/SBY.9SJU9.1909)",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "Accept-Language": "en-US"
        }
      });
      this.idToken = res.data.idToken;
      console.log("Autentikasi berhasil.");
      return this.idToken;
    } catch (err) {
      console.error("Kesalahan autentikasi:", err.response ? err.response.data : err.message);
      throw new Error(`Autentikasi gagal: ${err.response ? err.response.data.error.message : err.message}`);
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
      const res = await axios.post("https://us-central1-aichatbot-d6082.cloudfunctions.net/aichatbotisTrialActive2", payload, {
        headers: {
          "User-Agent": "okhttp/3.12.13",
          "Accept-Encoding": "gzip",
          authorization: `Bearer ${token}`,
          "content-type": "application/json; charset=utf-8"
        }
      });
      console.log("Status percobaan: Aktif:", res.data.result.trialActive);
      return res.data.result.trialActive;
    } catch (err) {
      console.error("Kesalahan cek percobaan:", err.response ? err.response.data : err.message);
      throw new Error(`Cek status percobaan gagal: ${err.response ? err.response.data.error.message : err.message}`);
    }
  }
  async chat({
    prompt = "",
    messages = [],
    model = 0,
    ...rest
  }) {
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
      if (typeof model !== "number" || model < 0 || model >= this.models.length) {
        throw new Error(`Indeks model "${model}" tidak valid. Harus antara 0 dan ${this.models.length - 1}.`);
      }
      const modelName = this.models[model];
      proc.modelDipilih = modelName;
      console.log(`Model: ${modelName} (Indeks: ${model})`);
      let finalMsgs = [];
      if (messages.length > 0) {
        finalMsgs = messages;
        console.log("Menggunakan pesan array yang disediakan.");
      } else if (prompt !== "") {
        finalMsgs = [{
          role: "user",
          content: prompt
        }];
        console.log("Menggunakan prompt string untuk membuat pesan.");
      } else {
        throw new Error("Tidak ada prompt atau pesan yang disediakan untuk chat.");
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
      const res = await axios.post("https://us-central1-aichatbot-d6082.cloudfunctions.net/aichatbotai2", reqBody, {
        headers: {
          "User-Agent": "okhttp/3.12.13",
          "Accept-Encoding": "gzip",
          authorization: `Bearer ${this.idToken}`,
          "content-type": "application/json; charset=utf-8"
        }
      });
      proc.resApi = res.data;
      console.log("Respons API diterima.");
      if (res.data?.result?.response?.choices?.[0]?.message?.content) {
        proc.resAi = res.data.result.response.choices[0].message.content;
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
            skipFiles: ["package-lock.json", "help", ".gitkeep"]
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

    /*if (q.type.includes("image") && fileBuffer) {
        let img = await upload(fileBuffer);
        payload.imageUrl = img;
    }*/

    try {
        /*const response = (
            await axios.post(
                "https://api.nekolabs.web.id/ai/claude/3.7-sonnet",
                payload
            )
        ).data.result;*/
        /*const response = await gmn([{role:"system",content:payload.systemPrompt}, {role:"user", content:payload.text}], fileBuffer)*/
        const response = (await (new ChatAPI()).chat({messages: [{role:"user", content:payload.text}]})).resAi

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