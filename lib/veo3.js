import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

const API_URL = "https://firebasevertexai.googleapis.com/v1beta";
const MODEL_URL = "projects/gemmy-ai-bdc03/locations/us-central1/publishers/google/models";
const MODEL = "veo-3-generate-001";
const HEADERS = {
    "content-type": "application/json",
    "x-goog-api-client": "gl-kotlin/2.1.0-ai fire/16.5.0",
    "x-goog-api-key": "AIzaSyD6QwvrvnjU7j-R6fkOghfIVKwtvc7SmLk"
};

async function textToVideo(prompt, options = {}) {
    const {
        model = MODEL,
        aspectRatio = "16:9",
        durationSeconds = 8,
        enhancePrompt = true,
        generateAudio = true,
        resolution = "1080p",
        sampleCount = 1
    } = options;

    const payload = {
        model: `${MODEL_URL}/${model}`,
        instances: [
            {
                prompt
            }
        ],
        parameters: {
            aspectRatio,
            durationSeconds,
            enhancePrompt,
            generateAudio,
            resolution,
            sampleCount
        }
    };

    const response = await axios.post(
        `${API_URL}/${MODEL_URL}/${model}:predictLongRunning`,
        payload,
        { headers: HEADERS }
    );

    return response.data;
}

async function imageToVideo(prompt, imageBuffer, options = {}) {
    const {
        model = MODEL,
        aspectRatio = "16:9",
        durationSeconds = 8,
        enhancePrompt = true,
        generateAudio = true,
        resolution = "1080p",
        resizeMode = "crop"
    } = options;

    const type = await fileTypeFromBuffer(imageBuffer);
    if (!type) throw new Error("Unable to detect image type");

    const payload = {
        model: `${MODEL_URL}/${model}`,
        instances: [
            {
                prompt,
                image: {
                    bytesBase64Encoded: imageBuffer.toString("base64"),
                    mimeType: type.mime
                }
            }
        ],
        parameters: {
            aspectRatio,
            durationSeconds,
            enhancePrompt,
            generateAudio,
            resolution,
            resizeMode
        }
    };

    const response = await axios.post(
        `${API_URL}/${MODEL_URL}/${model}:predictLongRunning`,
        payload,
        { headers: HEADERS }
    );

    return response.data;
}

async function getOperationStatus(operationName) {
    const response = await axios.get(
        `${API_URL}/${operationName}`,
        { headers: HEADERS }
    );

    return response.data;
}

async function waitForCompletion(operationName, maxWait = 300000, onProgress = null) {
    const startTime = Date.now();
    const pollInterval = 5000;
    let iteration = 0;

    while (Date.now() - startTime < maxWait) {
        iteration++;
        const status = await getOperationStatus(operationName);

        if (onProgress) {
            const elapsed = Date.now() - startTime;
            onProgress({ iteration, elapsed, done: status.done });
        }

        if (status.done) {
            if (status.error) {
                throw new Error(`Video generation failed: ${JSON.stringify(status.error)}`);
            }
            return status.response;
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error("Operation timed out after " + (maxWait / 1000) + " seconds");
}

async function downloadVideo(videoData) {
    if (videoData.gcsUri) {
        const match = videoData.gcsUri.match(/gs:\/\/([^\/]+)\/(.+)/);
        if (!match) throw new Error("Invalid GCS URI");

        const [, bucket, path] = match;
        const publicUrl = `https://storage.googleapis.com/${bucket}/${path}`;

        const response = await axios.get(publicUrl, {
            responseType: "arraybuffer"
        });

        return Buffer.from(response.data);
    }

    if (videoData.bytesBase64Encoded) {
        return Buffer.from(videoData.bytesBase64Encoded, "base64");
    }

    throw new Error("No video data available");
}

export default {
    textToVideo,
    imageToVideo,
    getOperationStatus,
    waitForCompletion,
    downloadVideo
};