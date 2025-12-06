import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";

const API_URL = "https://firebasevertexai.googleapis.com/v1beta";
const MODEL_URL = "projects/gemmy-ai-bdc03/locations/us-central1/publishers/google/models";
const HEADERS = {
    "content-type": "application/json",
    "x-goog-api-client": "gl-kotlin/2.1.0-ai fire/16.5.0",
    "x-goog-api-key": "AIzaSyD6QwvrvnjU7j-R6fkOghfIVKwtvc7SmLk"
};

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Contoh: ${usedPrefix + command} halo semua`;
    
    await m.react("⌛");

    try {
        const audioBuffer = await tts(text);
        
        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: "audio/ogg; codecs=opus",
            ptt: true
        }, { quoted: m });
        
        await m.react("✅");

    } catch (error) {
        console.error("TTS Error:", error);
        await m.react("❌");
        m.reply(`Gagal membuat audio: ${error.message}`);
    }
};

handler.menuai = ["ttsai <teks>"];
handler.tagsai = ["ai"];
handler.command = /^(ttsai)$/i;
handler.limit = true;

export default handler;

async function tts(text) {
    const body = {
        contents: [
            {
                role: "user",
                parts: [{ text }]
            }
        ],
        generationConfig: {
            responseModalities: ["audio"],
            temperature: 1,
            speech_config: {
                voice_config: {
                    prebuilt_voice_config: {
                        voice_name: "Zephyr"
                    }
                }
            }
        }
    };

    let attempt = 1;
    let delay = 1000;

    while (true) {
        try {
            const response = await axios.post(
                `${API_URL}/${MODEL_URL}/gemini-2.5-pro-preview-tts:generateContent`,
                body,
                { headers }
            );

            const audioParts = response.data?.candidates?.[0]?.content?.parts?.filter(p => p.inlineData);

            if (!audioParts || audioParts.length === 0) {
                throw new Error("Tidak ada data audio yang diterima dari API.");
            }

            const combinedAudioData = audioParts.map(p => p.inlineData.data).join("");
            const oggBuffer = await convertPCMToOggOpus(combinedAudioData);
            
            return oggBuffer;

        } catch (e) {
            console.error(`TTS attempt ${attempt} gagal:`, e.message);
            if (attempt >= 3) {
                 throw new Error(`Gagal setelah ${attempt} percobaan. Coba lagi nanti.`);
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 1.5;
            attempt++;
        }
    }
}

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
            .outputOptions(["-compression_level", "10"])
            .on("error", error => {
                console.error("FFmpeg Error:", error.message);
                reject(new Error("Gagal mengonversi audio ke format OGG. Pastikan ffmpeg terinstall."));
            })
            .pipe(outputStream);
    });
}