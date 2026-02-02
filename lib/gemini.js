import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

// ==========================================
// 1. CONFIG & AUTH (From Code 2)
// ==========================================

// Fungsi Decrypt Key
function decrypt(encryptedBase64) {
  try {
    const inputBytes = Buffer.from(encryptedBase64, 'base64');
    const keyBytes = Buffer.from('G3mmy@pp_2025_S3cur3K3y!', 'utf-8');
    const outputBytes = Buffer.alloc(inputBytes.length);

    for (let i = 0; i < inputBytes.length; i++) {
      outputBytes[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return outputBytes.toString('utf-8');
  } catch (e) {
    return null;
  }
}

// Fetch API Key secara dinamis (Top-level await)
let API_KEY = "";
try {
  const remoteData = await axios.get(
    "https://firebasestorage.googleapis.com/v0/b/gemmy-ai-bdc03.appspot.com/o/remote_config.json?alt=media"
  );
  const encryptedKey = remoteData.data.remote_config[0].gemini_api_key;
  API_KEY = decrypt(encryptedKey);
} catch (err) {
  console.error("[Auth] Gagal ambil remote config, pake fallback env/default.");
  API_KEY = process.env.GOOGLE_API_KEY || ""; 
}

// Konfigurasi Utama
const CONFIG = {
  BASE_URL: "https://generativelanguage.googleapis.com/v1beta/models/",
  DEFAULT_MODEL: "gemini-2.5-flash", // Gue pake 2.5 Flash biar stabil & cepet
  HEADERS: {
    "User-Agent": "okhttp/5.3.2",
    "Accept-Encoding": "gzip",
    "x-goog-api-key": API_KEY,
    "x-android-package": "com.jetkite.gemmy",
    "x-android-cert": "037CD2976D308B4EFD63EC63C48DC6E7AB7E5AF2",
    "content-type": "application/json; charset=UTF-8"
  }
};

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

// Helper buat detect mime type (Code 2 style)
const getMimeType = async (buffer) => {
  try {
    const type = await fileTypeFromBuffer(buffer);
    return type ? type.mime : "application/octet-stream";
  } catch {
    return "application/octet-stream";
  }
};

// ==========================================
// 3. MAIN CHAT FUNCTION (Code 1 Logic + Code 2 Config)
// ==========================================

export async function chat(messages) {
  if (!API_KEY) throw new Error("API Key kosong/gagal di-load!");
  if (!messages || !Array.isArray(messages)) throw new Error("Messages array is required");

  // --- PRE-PROCESSING MESSAGES ---
  const systemParts = [];
  const contents = [];

  // Policy System Prompt (From Code 1)
  const policyText = [
    "REAL-TIME POLICY:",
    "Gunakan tools pencarian (googleSearch) untuk fakta yang dapat berubah (tren, berita, harga, cuaca).",
    "Sebutkan URL sumber jika menggunakan hasil pencarian.",
    "Anggap pertanyaan soal waktu/tanggal sebagai time-sensitive."
  ].join(" ");

  // Loop messages buat parsing (From Code 1 Logic)
  for (const msg of messages) {
    if (!msg || !msg.role || !msg.content) continue;

    // Handle System Role
    if (msg.role === "system") {
      systemParts.push({ text: String(msg.content) });
      continue;
    }

    let role = msg.role === "assistant" ? "model" : "user";
    const raw = String(msg.content || "");

    // Regex buat extract URL gambar dari text (Fitur Code 1)
    let attachUrl = "";
    let dataUrl = "";
    try {
      const mu = raw.match(/ATTACHMENT_URL:\s*(https?:[^\s]+)/i);
      if (mu) attachUrl = mu[1];
      const md = raw.match(/ATTACHMENT_DATA_URL:\s*(data:[^\s]+)/);
      if (md) dataUrl = md[1];
    } catch {}

    // Bersihin text dari URL attachment
    const textOnly = raw
      .replace(/ATTACHMENT_URL:\s*https?:[^\s]+/gi, "")
      .replace(/ATTACHMENT_DATA_URL:\s*data:[^\s]+/gi, "")
      .trim();

    const parts = [];
    if (textOnly) parts.push({ text: textOnly });

    // Handle Image Attachment
    if (role === "user" && (attachUrl || dataUrl)) {
      try {
        let buf = null;
        let mimeType = "image/png";

        if (dataUrl) {
          // Base64 Data URL
          const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (m) {
            mimeType = m[1];
            buf = Buffer.from(m[2], "base64");
          }
        } else if (attachUrl) {
          // Download from URL
          const resp = await axios.get(attachUrl, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: { "User-Agent": "Mozilla/5.0" } // Fake UA biar gak di-block
          });
          buf = Buffer.from(resp.data);
          mimeType = await getMimeType(buf); // Use Code 2 helper
        }

        if (buf) {
          parts.push({
            inlineData: { 
              mimeType, 
              data: buf.toString("base64") 
            }
          });
        }
      } catch (e) {
        console.warn("[Attachment Error]", e.message);
      }
    }

    contents.push({ role, parts: parts.length ? parts : [{ text: raw }] });
  }

  // --- CONSTRUCT PAYLOAD ---
  
  // Gabungin system prompt user + policy
  const finalSystemParts = [...systemParts, { text: policyText }];

  const body = {
    contents,
    systemInstruction: {
      role: "user", // API Standard kadang minta role user/system beda-beda, 'user' aman buat instruction di v1beta
      parts: finalSystemParts
    },
    tools: [
      { googleSearch: {} } // Enable Google Search
    ],
    generationConfig: {
      thinkingConfig: {
        thinkingBudget: 1024 // Set budget thinking (Code 1 feature)
      }, 
      // Note: thinkingConfig cuma work di model yg support (e.g. flash-thinking), 
      // kalo error, apus bagian thinkingConfig ini.
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  // --- REQUEST (Streaming) ---
  
  // Pake CONFIG.HEADERS dari Code 2 (Android spoofing)
  // Endpoint: streamGenerateContent
  const url = `${CONFIG.BASE_URL}${CONFIG.DEFAULT_MODEL}:streamGenerateContent`;

  const response = await axios.post(url, body, {
    headers: CONFIG.HEADERS,
    responseType: "stream"
  });

  return response.data;
}