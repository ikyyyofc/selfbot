import axios from "axios";

const CONFIG = {
    URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
    HEADERS: {
        "User-Agent": "okhttp/5.3.2",
        "Accept-Encoding": "gzip",
        "x-goog-api-key": "AIzaSyAKbxdxfyNoQMx9ft9xAVoQWrwpN9JnphY",
        "x-android-package": "com.jetkite.gemmy",
        "x-android-cert": "037CD2976D308B4EFD63EC63C48DC6E7AB7E5AF2",
        "content-type": "application/json; charset=UTF-8"
    }
};

const getMimeType = async buffer => {
    const header = buffer.toString("hex", 0, 4);
    if (header.startsWith("89504e47")) return "image/png";
    if (header.startsWith("ffd8ff")) return "image/jpeg";
    if (header.startsWith("52494646")) return "image/webp";
    return "application/octet-stream";
};

// Convert OpenAI format ke Gemini format
const convertToGeminiFormat = messages => {
    let systemInstruction = null;
    const contents = [];

    for (const msg of messages) {
        // Ambil system message sebagai systemInstruction
        if (msg.role === "system") {
            systemInstruction = {
                role: "user",
                parts: [{ text: msg.content }]
            };
            continue;
        }

        // Convert role: assistant -> model
        const role = msg.role === "assistant" ? "model" : "user";

        contents.push({
            role: role,
            parts: [{ text: msg.content }]
        });
    }

    return { systemInstruction, contents };
};

const gemini = async (messages, fileBuffer = null) => {
    try {
        const { systemInstruction, contents } = convertToGeminiFormat(messages);

        // Kalau ada file buffer, tambahin ke message terakhir
        if (fileBuffer && Buffer.isBuffer(fileBuffer)) {
            const lastMsg = contents[contents.length - 1];
            const mimeType = await getMimeType(fileBuffer);

            if (mimeType.startsWith("image/")) {
                // Kalau image, tambahin sebagai inlineData
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
                // Kalau bukan image, jadikan text
                const textContent = fileBuffer.toString("utf-8");
                lastMsg.parts[0].text = `${lastMsg.parts[0].text}\n\n--- FILE CONTENT ---\n\n${textContent}`;
            }
        }

        const payload = {
            contents: contents,
            tools: [
                { googleSearch: {} },
             /*   {
                    urlContext: {}
                }*/
                /*{
                    codeExecution: {}
                }*/
            ]
        };

        // Tambahin systemInstruction kalau ada
        if (systemInstruction) {
            payload.systemInstruction = systemInstruction;
        }

        const response = await axios.post(CONFIG.URL, payload, {
            headers: CONFIG.HEADERS
        });
        return response.data.candidates[0].content.parts
            .map(o => o.text)
            .join("");

        /*return response.data.candidates[0].content.parts
        .map(o => {
            let h = Object.keys(o);
            return o[h];
        })
        .join("");*/
    } catch (error) {
        console.error(`[Gemini Error]: ${error.message}`);
        return { success: false, msg: error.message };
    }
};

export default gemini;


