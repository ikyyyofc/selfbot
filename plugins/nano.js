import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

const API_URL = "https://firebasevertexai.googleapis.com/v1beta";
const MODEL_URL = "projects/gemmy-ai-bdc03/locations/us-central1/publishers/google/models";
const MODEL = "gemini-3-pro-image-preview"; // model vision lebih cocok buat gambar
const HEADERS = {
    "content-type": "application/json",
    "x-goog-api-client": "gl-kotlin/2.1.0-ai fire/16.5.0",
    "x-goog-api-key": "AIzaSyD6QwvrvnjU7j-R6fkOghfIVKwtvc7SmLk" // ati ati ini api key jangan disebar
};

/**
 * @param {string} text 
 * @param {Buffer|null} fileBuffer
 * @returns {Promise<Array<{text?: string, inlineData?: {data: string, mimeType: string}}>>}
 */
async function chat(text, fileBuffer = null) {
    if (!text) {
        throw new Error("text is required");
    }

    const contents = [{
        role: "user",
        parts: [{ text }]
    }];

    if (fileBuffer) {
        const type = await fileTypeFromBuffer(fileBuffer);
        if (!type) throw new Error("unable to detect file type");

        const inlinePart = {
            inlineData: {
                mimeType: type.mime,
                data: fileBuffer.toString("base64")
            }
        };
        contents[0].parts.unshift(inlinePart);
    }

    try {
        const r = await axios.post(
            `${API_URL}/${MODEL_URL}/${MODEL}:generateContent`,
            { contents },
            { headers: HEADERS }
        );

        if (r.status !== 200 || !r.data.candidates?.[0]?.content?.parts) {
            throw new Error("no result found from api");
        }
        
        return r.data.candidates[0].content.parts;
    } catch (error) {
        console.error("api call error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || "failed to fetch from gemini api");
    }
}

export default {
    command: "nano",
    description: "ai multi-modal with gemini vision",
    rules: {
        text: true
    },
    execute: async (context) => {
        const { m, text, sock, reply, getFile } = context;

        try {
            await m.react("🤔");
            
            const file = await getFile();
            const resultParts = await chat(text, file);

            const texts = [];
            const images = [];

            for (const part of resultParts) {
                if (part.text) {
                    texts.push(part.text);
                }
                if (part.inlineData) {
                    images.push(Buffer.from(part.inlineData.data, "base64"));
                }
            }

            const replyText = texts.join("\n\n").trim();

            if (images.length === 0) {
                if (replyText) await reply(replyText);
                else await reply("ga ada jawaban yg bisa gw kasih, coba tanya yg laen.");
            } else if (images.length === 1) {
                await sock.sendMessage(m.chat, {
                    image: images[0],
                    caption: replyText || "nih gambarnya"
                }, { quoted: m });
            } else {
                if (replyText) await reply(replyText);
                
                const albumContent = images.map(img => ({ image: img }));
                await sock.sendAlbumMessage(m.chat, albumContent, m);
            }
            
            await m.react("✅");

        } catch (error) {
            console.error("nano plugin error:", error);
            await reply(`waduh error: ${error.message}`);
            await m.react("❌");
        }
    }
};