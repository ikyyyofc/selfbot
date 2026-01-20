import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

const API_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL_URL = "models";
const MODEL = "gemini-2.5-pro";
const HEADERS = {
    "User-Agent": "okhttp/5.3.2",
    "Accept-Encoding": "gzip",
    "x-goog-api-key": "AIzaSyAKbxdxfyNoQMx9ft9xAVoQWrwpN9JnphY",
    "x-android-package": "com.jetkite.gemmy",
    "x-android-cert": "037CD2976D308B4EFD63EC63C48DC6E7AB7E5AF2",
    "content-type": "application/json; charset=UTF-8"
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
