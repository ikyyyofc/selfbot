import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

// --- gemini api logic ---
const API_URL = "https://firebasevertexai.googleapis.com/v1beta";
const MODEL_URL = "projects/gemmy-ai-bdc03/locations/us-central1/publishers/google/models";
const MODEL = "gemini-2.5-flash-image"; // model lebih baru, lebih oke buat chat & vision
const HEADERS = {
    "content-type": "application/json",
    "x-goog-api-client": "gl-kotlin/2.1.0-ai fire/16.5.0",
    "x-goog-api-key": "AIzaSyD6QwvrvnjU7j-R6fkOghfIVKwtvc7SmLk" // ati ati ini api key jangan disebar
};

const callGemini = async (history, newParts) => {
    const contents = [...history, { role: "user", parts: newParts }];

    try {
        const r = await axios.post(
            `${API_URL}/${MODEL_URL}/${MODEL}:generateContent`,
            { contents },
            { headers: HEADERS }
        );

        if (r.status !== 200 || !r.data.candidates?.[0]?.content?.parts) {
            throw new Error("ga ada hasil dari api, coba lagi ntar");
        }

        return r.data.candidates[0].content.parts;
    } catch (error) {
        console.error("kesalahan pas manggil api:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || "gagal manggil api gemini");
    }
};

// --- plugin logic ---
const conversationHistory = new Map();
const MAX_HISTORY = 10; // simpen 5 pasang percakapan (user & model)

export default {
    command: "nano",
    description: "ai multi-modal dengan memori percakapan",
    rules: {
        text: true
    },
    execute: async (context) => {
        const { m, text, sock, reply, chat } = context;
        const historyKey = chat;

        if (text.toLowerCase() === "reset") {
            conversationHistory.delete(historyKey);
            await m.react("✅");
            return reply("memori percakapan di chat ini udah gw reset.");
        }

        try {
            await m.react("🤔");

            // 1. kumpulin semua gambar dari caption & reply
            const imageBuffers = [];
            if (m.isMedia) {
                const buffer = await m.download();
                if (buffer) imageBuffers.push(buffer);
            }
            if (m.quoted && m.quoted.isMedia) {
                const buffer = await m.quoted.download();
                if (buffer) imageBuffers.push(buffer);
            }

            // 2. siapin parts buat prompt sekarang
            const newParts = [{ text }];
            for (const buffer of imageBuffers) {
                const type = await fileTypeFromBuffer(buffer);
                if (type) {
                    newParts.push({
                        inlineData: {
                            mimeType: type.mime,
                            data: buffer.toString("base64")
                        }
                    });
                }
            }

            // 3. ambil history percakapan
            let history = conversationHistory.get(historyKey) || [];

            // 4. panggil ai
            const resultParts = await callGemini(history, newParts);

            // 5. proses hasil dari ai
            const responseTexts = [];
            const responseImages = [];
            for (const part of resultParts) {
                if (part.text) {
                    responseTexts.push(part.text);
                }
                if (part.inlineData) {
                    responseImages.push(Buffer.from(part.inlineData.data, "base64"));
                }
            }
            const replyText = responseTexts.join("\n\n").trim();
            
            // 6. kirim balasan
            if (responseImages.length === 0) {
                await reply(replyText || "ga ada jawaban yg bisa gw kasih, coba tanya yg laen.");
            } else if (responseImages.length === 1) {
                await sock.sendMessage(m.chat, {
                    image: responseImages[0],
                    caption: replyText || "nih gambarnya."
                }, { quoted: m });
            } else {
                if (replyText) await reply(replyText);
                const albumContent = responseImages.map(img => ({ image: img }));
                await sock.sendAlbumMessage(m.chat, albumContent, m);
            }

            // 7. update history
            history.push({ role: "user", parts: newParts });
            history.push({ role: "model", parts: [{ text: replyText }] });
            
            // 8. potong history kalo kepanjangan
            if (history.length > MAX_HISTORY) {
                history = history.slice(history.length - MAX_HISTORY);
            }
            conversationHistory.set(historyKey, history);

            await m.react("✅");

        } catch (error) {
            console.error("nano plugin error:", error);
            await reply(`waduh error: ${error.message}`);
            await m.react("❌");
        }
    }
};