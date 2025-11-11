import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

const API_KEY = "AIzaSyD6QwvrvnjU7j-R6fkOghfIVKwtvc7SmLk";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

async function textToVideo(prompt, options = {}) {
    const {
        model = "models/veo-3.1-generate",
        aspectRatio = "16:9",
        durationSeconds = 8,
        enhancePrompt = true,
        generateAudio = true
    } = options;

    const payload = {
        contents: [
            {
                parts: [
                    {
                        text: prompt
                    }
                ]
            }
        ],
        generationConfig: {
            aspectRatio,
            durationSeconds,
            enhancePrompt,
            generateAudio
        }
    };

    const response = await axios.post(
        `${BASE_URL}/${model}:generateContent?key=${API_KEY}`,
        payload,
        {
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    return response.data;
}

async function imageToVideo(prompt, imageBuffer, options = {}) {
    const {
        model = "models/veo-3.1-generate",
        aspectRatio = "16:9",
        durationSeconds = 8,
        enhancePrompt = true,
        generateAudio = true
    } = options;

    const type = await fileTypeFromBuffer(imageBuffer);
    if (!type) throw new Error("Unable to detect image type");

    const payload = {
        contents: [
            {
                parts: [
                    {
                        text: prompt
                    },
                    {
                        inlineData: {
                            mimeType: type.mime,
                            data: imageBuffer.toString("base64")
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            aspectRatio,
            durationSeconds,
            enhancePrompt,
            generateAudio
        }
    };

    const response = await axios.post(
        `${BASE_URL}/${model}:generateContent?key=${API_KEY}`,
        payload,
        {
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    return response.data;
}

async function multiImageToVideo(prompt, imageBuffers, options = {}) {
    const {
        model = "models/veo-3.1-generate",
        aspectRatio = "16:9",
        durationSeconds = 8,
        enhancePrompt = true,
        generateAudio = true
    } = options;

    if (!Array.isArray(imageBuffers) || imageBuffers.length > 3) {
        throw new Error("Provide 1-3 images");
    }

    const parts = [{ text: prompt }];

    for (const buffer of imageBuffers) {
        const type = await fileTypeFromBuffer(buffer);
        if (!type) throw new Error("Unable to detect image type");

        parts.push({
            inlineData: {
                mimeType: type.mime,
                data: buffer.toString("base64")
            }
        });
    }

    const payload = {
        contents: [{ parts }],
        generationConfig: {
            aspectRatio,
            durationSeconds,
            enhancePrompt,
            generateAudio
        }
    };

    const response = await axios.post(
        `${BASE_URL}/${model}:generateContent?key=${API_KEY}`,
        payload,
        {
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    return response.data;
}

async function downloadVideo(videoData) {
    if (videoData.candidates?.[0]?.content?.parts?.[0]?.videoMetadata) {
        const metadata = videoData.candidates[0].content.parts[0].videoMetadata;
        
        if (metadata.videoUri) {
            const response = await axios.get(metadata.videoUri, {
                responseType: "arraybuffer"
            });
            return Buffer.from(response.data);
        }
        
        if (metadata.videoBytes) {
            return Buffer.from(metadata.videoBytes, "base64");
        }
    }
    
    throw new Error("No video data in response");
}

export default {
    textToVideo,
    imageToVideo,
    multiImageToVideo,
    downloadVideo
};