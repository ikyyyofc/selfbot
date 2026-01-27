import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

// Fetch key logic (Keep existing)
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
    DEFAULT_MODEL: "gemini-3-flash-preview", // Chat model
    IMAGE_MODEL: "gemini-3-pro-image-preview", // Image Gen model
    HEADERS: {
        "User-Agent": "okhttp/5.3.2",
        "Accept-Encoding": "gzip",
        "x-goog-api-key": decrypt(apikey_enc),
        "x-android-package": "com.jetkite.gemmy",
        "x-android-cert": "037CD2976D308B4EFD63EC63C48DC6E7AB7E5AF2",
        "content-type": "application/json; charset=UTF-8"
    }
};

const getMimeType = async buffer => {
    try {
        const type = await fileTypeFromBuffer(buffer);
        return type ? type.mime : "application/octet-stream";
    } catch (error) {
        return "application/octet-stream";
    }
};

const isSupportedInlineData = mimeType => {
    const supported = ["image/", "audio/", "video/", "application/pdf", "text/"];
    return supported.some(type => mimeType.startsWith(type));
};

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
        const isImageGen = model === CONFIG.IMAGE_MODEL;
        const method = isImageGen ? "streamGenerateContent" : "generateContent";
        
        // 1. Prepare Payload Basic
        const { systemInstruction, contents } = convertToGeminiFormat(messages);

        // 2. Handle File Input (Vision/File analysis)
        if (fileBuffer && Buffer.isBuffer(fileBuffer)) {
            const lastMsg = contents[contents.length - 1];
            const mimeType = await getMimeType(fileBuffer);

            if (isSupportedInlineData(mimeType)) {
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
                try {
                    const textContent = fileBuffer.toString("utf-8");
                    lastMsg.parts[0].text = `${lastMsg.parts[0].text}\n\n--- FILE CONTENT (${mimeType}) ---\n\n${textContent}`;
                } catch (err) {
                    lastMsg.parts[0].text = `${lastMsg.parts[0].text}\n\n[Binary file detected]`;
                }
            }
        }

        const payload = {
            contents: contents,
            tools: [{ googleSearch: {} }] // Enable Google Search integration by default
        };

        if (systemInstruction) {
            payload.systemInstruction = systemInstruction;
        }

        // 3. Special Config for Image Generation
        if (isImageGen) {
            payload.generationConfig = {
                responseModalities: ["IMAGE", "TEXT"],
                imageConfig: {
                    image_size: "1K" // Or "IMAGE_SIZE_1024"
                }
            };
        }

        const url = `${CONFIG.BASE_URL}${model}:${method}`;

        const response = await axios.post(url, payload, {
            headers: CONFIG.HEADERS
        });

        // 4. Handle Response Logic
        if (isImageGen) {
            // Logic for Image Gen Response (usually comes from stream endpoint)
            // Axios buffers the stream, so we get an array of objects in data if it's strict JSON, 
            // or we might need to handle raw chunks if it's not parsed automatically.
            // Google usually returns a JSON array for streamGenerateContent if the request completes fast.
            
            const candidates = Array.isArray(response.data) 
                ? response.data[0]?.candidates 
                : response.data.candidates;

            if (!candidates || !candidates[0]?.content?.parts) {
                throw new Error("No content generated");
            }

            const parts = candidates[0].content.parts;
            
            // Check for Inline Image
            const imagePart = parts.find(p => p.inlineData);
            if (imagePart) {
                return {
                    type: "image",
                    buffer: Buffer.from(imagePart.inlineData.data, "base64"),
                    caption: parts.find(p => p.text)?.text || "Generated by Gemini"
                };
            }
            
            return parts.map(p => p.text).join("") || "Failed to generate image.";

        } else {
            // Logic for Standard Chat Response
            const candidates = response.data.candidates;
            if (!candidates || candidates.length === 0) return "No response from Gemini.";
            
            return candidates[0].content.parts.map(o => o.text).join("");
        }

    } catch (error) {
        // Error handling yang lebih detail buat debug
        const errMsg = error.response?.data?.error?.message || error.message;
        console.error(`[Gemini Error]: ${errMsg}`);
        return `❌ Error: ${errMsg}`;
    }
};

export default gemini;