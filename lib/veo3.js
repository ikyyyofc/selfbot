import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

const PROJECT_ID = "gemmy-ai-bdc03";
const LOCATION = "us-central1";
const API_KEY = "AIzaSyD6QwvrvnjU7j-R6fkOghfIVKwtvc7SmLk";
const BASE_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}`;

async function textToVideo(prompt, options = {}) {
    const {
        model = "veo-3.1-generate-preview",
        aspectRatio = "16:9",
        durationSeconds = 5,
        enhancePrompt = true,
        generateAudio = true,
        resolution = "1080p",
        sampleCount = 1
    } = options;

    const payload = {
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
        `${BASE_URL}/publishers/google/models/${model}:predictLongRunning`,
        payload,
        {
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": API_KEY
            }
        }
    );

    return response.data;
}

async function imageToVideo(prompt, imageBuffer, options = {}) {
    const {
        model = "veo-3.1-generate-preview",
        aspectRatio = "16:9",
        durationSeconds = 5,
        enhancePrompt = true,
        generateAudio = true,
        resolution = "1080p",
        resizeMode = "crop"
    } = options;

    const type = await fileTypeFromBuffer(imageBuffer);
    if (!type) throw new Error("Unable to detect image type");

    const payload = {
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
        `${BASE_URL}/publishers/google/models/${model}:predictLongRunning`,
        payload,
        {
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": API_KEY
            }
        }
    );

    return response.data;
}

async function getOperationStatus(operationName) {
    const response = await axios.get(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/${operationName}`,
        {
            headers: {
                "x-goog-api-key": API_KEY
            }
        }
    );

    return response.data;
}

async function waitForCompletion(operationName, maxWait = 300000) {
    const startTime = Date.now();
    const pollInterval = 5000;

    while (Date.now() - startTime < maxWait) {
        const status = await getOperationStatus(operationName);

        if (status.done) {
            if (status.error) {
                throw new Error(`Video generation failed: ${JSON.stringify(status.error)}`);
            }
            return status.response;
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error("Operation timed out");
}

async function downloadVideo(gcsUri) {
    const match = gcsUri.match(/gs:\/\/([^\/]+)\/(.+)/);
    if (!match) throw new Error("Invalid GCS URI");

    const [, bucket, path] = match;
    const publicUrl = `https://storage.googleapis.com/${bucket}/${path}`;

    const response = await axios.get(publicUrl, {
        responseType: "arraybuffer"
    });

    return Buffer.from(response.data);
}

export default {
    textToVideo,
    imageToVideo,
    getOperationStatus,
    waitForCompletion,
    downloadVideo
};