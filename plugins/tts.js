import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";

// --- Konstanta untuk API ---
const API_URL = "https://firebasevertexai.googleapis.com/v1beta";
const MODEL_URL = "projects/gemmy-ai-bdc03/locations/us-central1/publishers/google/models";
const HEADERS = {
    "content-type": "application/json",
    "x-goog-api-client": "gl-kotlin/2.1.0-ai fire/16.5.0",
    "x-goog-api-key": "AIzaSyD6QwvrvnjU7j-R6fkOghfIVKwtvc7SmLk"
};

/**
 * Mengubah PCM audio (dari base64) menjadi OGG Opus buffer.
 * @param {string} base64Data Data audio PCM dalam format base64.
 * @returns {Promise<Buffer>} Buffer audio dalam format OGG Opus.
 */
async function convertPCMToOggOpus(base64Data) {
    return new Promise((resolve, reject) => {
        const pcmBuffer = Buffer.from(base64Data, "base64");
        const inputStream = new PassThrough();
        inputStream.end(pcmBuffer);

        const outputChunks = [];
        const outputStream = new PassThrough();

        outputStream.on("data", chunk => outputChunks.push(chunk));
        outputStream.on("end", () => resolve(Buffer.concat(outputChunks)));
        outputStream.on("error", reject);

        ffmpeg(inputStream)
            .inputOptions(["-f", "s16le", "-ar", "24000", "-ac", "1"])
            .toFormat("ogg")
            .audioCodec("libopus")
            .audioBitrate(64)
            .audioFrequency(24000)
            .audioChannels(1)
            .outputOptions(["-compression_level", "10"])
            .on("error", error => {
                console.error("FFmpeg Error:", error.message);
                reject(new Error("Gagal mengonversi audio dengan FFmpeg."));
            })
            .pipe(outputStream);
    });
}

/**
 * Menghasilkan audio dari teks menggunakan Gemini TTS API dengan retry logic.
 * @param {string} text Teks yang akan diubah menjadi suara.
 * @returns {Promise<Buffer>} Buffer audio dalam format OGG Opus.
 */
async function generateSpeech(text) {
    const body = {
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
            responseModalities: ["audio"],
            temperature: 1,
            speech_config: {
                voice_config: {
                    prebuilt_voice_config: { voice_name: "Zephyr" }
                }
            }
        }
    };
    
    let delay = 1000;
    for (let i = 0; i < 3; i++) { // Coba maksimal 3 kali
        try {
            const response = await axios.post(
                `${API_URL}/${MODEL_URL}/gemini-1.5-flash-preview-0514:generateContent`,
                body,
                { headers }
            );

            const audioParts = response.data?.candidates?.[0]?.content?.parts?.filter(p => p.inlineData);
            if (!audioParts || audioParts.length === 0) {
                throw new Error("Tidak ada data audio dalam respons API.");
            }
            
            const combinedAudioData = audioParts.map(part => part.inlineData.data).join("");
            return await convertPCMToOggOpus(combinedAudioData);

        } catch (error) {
            console.error(`TTS Gagal (Attempt ${i + 1}):`, error.message);
            if (i < 2) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 1.5; // Tambah delay sebelum retry
            } else {
                throw new Error(`Setelah 3x coba, API tetap gagal: ${error.message}`);
            }
        }
    }
}


// --- Plugin Handler ---
export default {
    command: ["tts", "geminitts"],
    description: "Mengubah teks menjadi suara (voice note) menggunakan AI.",
    category: "AI",
    usage: "tts <teks yang mau diubah>",
    example: "tts halo, apa kabar semua?",
    
    rules: {
        limit: true,
        premium: false,
    },

    execute: async (context) => {
        const { m, text, sock } = context;

        if (!text) {
            return m.reply(`Kasih teksnya dong.\nContoh: .tts selamat pagi dunia`);
        }

        await m.react("⌛");

        try {
            const audioBuffer = await generateSpeech(text);
            
            await sock.sendMessage(m.chat, {
                audio: audioBuffer,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true
            }, { quoted: m });

            await m.react("✅");

        } catch (error) {
            console.error("TTS Plugin Error:", error);
            await m.react("❌");
            await m.reply(`Gagal, coba lagi nanti.\nError: ${error.message}`);
        }
    }
};