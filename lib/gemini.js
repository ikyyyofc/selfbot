import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

const API_URL = "https://firebasevertexai.googleapis.com/v1beta";
const MODEL_URL =
    "projects/gemmy-ai-bdc03/locations/us-central1/publishers/google/models";
const MODEL = "gemini-3-pro-preview";
const HEADERS = {
    "content-type": "application/json",
    "x-goog-api-client": "gl-kotlin/2.1.0-ai fire/16.5.0",
    "x-goog-api-key": "AIzaSyD6QwvrvnjU7j-R6fkOghfIVKwtvc7SmLk"
};

/**
 *
 * @param {Array<{role: "system"|"user"|"assistant", content: string}>} messages
 * @param {Buffer|null} fileBuffer
 * @returns
 */
async function chat(messages = [], fileBuffer = null) {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error("Messages array is required");
    }

    const contents = messages.map(msg => ({
        role: msg.role === "system" ? "model" : msg.role,
        parts: [{ text: msg.content }]
    }));

    if (fileBuffer) {
        const type = await fileTypeFromBuffer(fileBuffer);
        if (!type) throw new Error("Unable to detect file type");

        const inlinePart = {
            inlineData: {
                mimeType: type.mime,
                data: fileBuffer.toString("base64")
            }
        };

        const lastUser = [...contents].reverse().find(m => m.role === "user");
        if (lastUser) {
            lastUser.parts.unshift(inlinePart);
        } else {
            contents.push({
                role: "user",
                parts: [inlinePart]
            });
        }
    }

    const r = await axios.post(
        `${API_URL}/${MODEL_URL}/${MODEL}:generateContent`,
        {
            model: `${MODEL_URL}/${MODEL}`,
            contents,
            generationConfig: {
                mediaResolution: "MEDIA_RESOLUTION_MEDIUM"
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                }
            ],
            tools: [
                { googleSearch: {} },
                {
                    urlContext: {}
                }
                /*{
                    codeExecution: {}
                }*/
            ]
        },
        { headers: HEADERS }
    );

    if (r.status !== 200) throw new Error("No result found");
    //return r.data.candidates[0].content.parts.map(o => o.text).join("");
    return r.data.candidates[0].content.parts
        .map(o => {
            let h = Object.keys(o);
            return o[h];
        })
        .join("");
    //return r.data;
}

export default chat;
