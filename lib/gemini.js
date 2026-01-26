import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

let apikey_enc = (await axios.get("https://firebasestorage.googleapis.com/v0/b/gemmy-ai-bdc03.appspot.com/o/remote_config.json?alt=media")).data.remote_config[0].gemini_api_key

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

const CONFIG = {
    BASE_URL: "https://generativelanguage.googleapis.com/v1beta/models/",
    DEFAULT_MODEL: "gemini-3-flash-preview",
    HEADERS: {
        "User-Agent": "okhttp/5.3.2",
        "Accept-Encoding": "gzip",
        "x-goog-api-key": decrypt(apikey_enc),
        "x-android-package": "com.jetkite.gemmy",
        "x-android-cert": "037CD2976D308B4EFD63EC63C48DC6E7AB7E5AF2",
        "content-type": "application/json; charset=UTF-8"
    }
};

// Deteksi MIME type otomatis pake file-type
const getMimeType = async buffer => {
    try {
        const type = await fileTypeFromBuffer(buffer);
        return type ? type.mime : "application/octet-stream";
    } catch (error) {
        return "application/octet-stream";
    }
};

// Cek apakah file bisa dijadikan inline data (image, audio, video, pdf, dll)
const isSupportedInlineData = mimeType => {
    const supported = [
        "image/", // semua image
        "audio/", // semua audio
        "video/", // semua video
        "application/pdf",
        "text/"   // text files
    ];
    return supported.some(type => mimeType.startsWith(type));
};

// Convert OpenAI format ke Gemini format
const convertToGeminiFormat = messages => {
    let systemInstruction = null;
    const contents = [];

    for (const msg of messages) {
        if (msg.role === "system") {
            systemInstruction = {
                role: "user",
                parts: [{ text: msg.content }]
            };
            continue;
        }

        const role = msg.role === "assistant" ? "model" : "user";
        contents.push({
            role: role,
            parts: [{ text: msg.content }]
        });
    }

    return { systemInstruction, contents };
};

const gemini = async (messages, fileBuffer = null, model = CONFIG.DEFAULT_MODEL) => {
    try {
        const { systemInstruction, contents } = convertToGeminiFormat(messages);

        // Kalau ada file buffer, proses sesuai tipe
        if (fileBuffer && Buffer.isBuffer(fileBuffer)) {
            const lastMsg = contents[contents.length - 1];
            const mimeType = await getMimeType(fileBuffer);

            if (isSupportedInlineData(mimeType)) {
                // File yang support inline data (image, audio, video, pdf)
                lastMsg.parts = [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: fileBuffer.toString("base64")
                        }
                    },
                    ...lastMsg.parts
                ];
            } else {
                // File lain (binary/text) jadikan text content
                try {
                    const textContent = fileBuffer.toString("utf-8");
                    lastMsg.parts[0].text = `${lastMsg.parts[0].text}\n\n--- FILE CONTENT (${mimeType}) ---\n\n${textContent}`;
                } catch (err) {
                    // Kalau gagal decode, kasih info aja
                    lastMsg.parts[0].text = `${lastMsg.parts[0].text}\n\n[Binary file detected: ${mimeType}, size: ${fileBuffer.length} bytes]`;
                }
            }
        }

        const payload = {
            contents: contents,
            tools: [
                { googleSearch: {} }
            ]
        };

        if (systemInstruction) {
            payload.systemInstruction = systemInstruction;
        }

        // Buat URL dinamis berdasarkan model yang dipilih
        const url = `${CONFIG.BASE_URL}${model}:generateContent`;

        const response = await axios.post(url, payload, {
            headers: CONFIG.HEADERS
        });
        
        return response.data.candidates[0].content.parts
            .map(o => o.text)
            .join("");

    } catch (error) {
        console.error(`[Gemini Error]: ${error.message}`);
        return { success: false, msg: error.message };
    }
};

export default gemini;