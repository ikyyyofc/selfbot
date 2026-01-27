import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

const CONFIG = {
    BASE_URL: "https://openrouter.ai/api/v1/chat/completions",
    DEFAULT_MODEL: "anthropic/claude-opus-4.5", // Sesuai request curl lo
    API_KEY: process.env.OPENROUTER_API_KEY || "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", // Masukin env atau hardcode
    HEADERS: {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/ikyyyofc/selfbot", // OpenRouter butuh referer
        "X-Title": "Ikyy Bot"
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

const formatMessages = (messages) => {
    return messages.map(msg => ({
        role: msg.role === "admin" ? "system" : msg.role, // Mapping role
        content: msg.content
    }));
};

const claude = async (messages, fileBuffer = null, model = CONFIG.DEFAULT_MODEL) => {
    try {
        let formattedMessages = formatMessages(messages);

        if (fileBuffer && Buffer.isBuffer(fileBuffer)) {
            const mimeType = await getMimeType(fileBuffer);
            const base64Data = fileBuffer.toString("base64");
            const lastMsgIndex = formattedMessages.length - 1;
            const lastMsg = formattedMessages[lastMsgIndex];

            // OpenRouter/OpenAI format support array content for multimodal
            if (lastMsg.role === "user") {
                lastMsg.content = [
                    {
                        type: "text",
                        text: typeof lastMsg.content === "string" ? lastMsg.content : ""
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${mimeType};base64,${base64Data}`
                        }
                    }
                ];
            }
        }

        const payload = {
            model: model,
            messages: formattedMessages
        };

        const response = await axios.post(CONFIG.BASE_URL, payload, {
            headers: {
                ...CONFIG.HEADERS,
                "Authorization": `Bearer ${CONFIG.API_KEY}`
            }
        });

        return response.data.choices[0].message.content;

    } catch (error) {
        console.error(`[Claude Error]: ${error?.response?.data?.error?.message || error.message}`);
        return { success: false, msg: error.message };
    }
};

export default claude;