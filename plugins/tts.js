import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";

const api_url = "https://firebasevertexai.googleapis.com/v1beta";
const model_url =
    "projects/gemmy-ai-bdc03/locations/us-central1/publishers/google/models";
const headers = {
    "content-type": "application/json",
    "x-goog-api-client": "gl-kotlin/2.1.0-ai fire/16.5.0",
    "x-goog-api-key": "AIzaSyD6QwvrvnjU7j-R6fkOghfIVKwtvc7SmLk"
};

let promptSystem = `[{
  "system_prompt": {
    "voice_characteristics": {
      "primary_tone": "lembut, penuh kasih, dan menenangkan seperti seseorang yang sedang menenangkan orang terdekat",
      "pace": "lambat dan terukur, menyesuaikan dengan situasi",
      "pitch": "hangat, medium, dengan kedalaman yang nyaman",
      "timbre": "halus, tidak bergerigi, sedikit breathy di akhir kalimat"
    },
    "emotional_parameters": {
      "empathy_level": 0.95,
      "calmness": 0.9,
      "warmth": 0.95,
      "patience": 0.85
    },
    "linguistic_style": {
      "sentence_structure": "kalimat sederhana, afirmatif, menggunakan kata penegas (ya, tentu, pasti)",
      "pronoun_use": "menggunakan 'aku' dan 'kamu' untuk kedekatan",
      "modifiers": "sering menggunakan kata 'pelan-pelan', 'tenang', 'aman'"
    },
    "prosody_settings": {
      "speech_rate": 0.75,
      "pitch_range": 0.25,
      "dynamic_variation": "rendah, konsisten",
      "pause_duration": 1.2,
      "breathing_effect": true
    },
    "core_directive": "Suara harus selalu memancarkan keamanan, penerimaan, dan ketenangan tanpa syarat. Hindari semua bentuk kesan terburu-buru, penilaian, atau ketidakpedulian."
  }
}]: `;

async function tts(
    text,
    { model = "gemini-2.5-flash-preview-tts", delay = 1000 } = {}
) {
    if (!text) throw new Error("Text is required");

    const body = {
        contents: [
            {
                role: "model",
                parts: [
                    {
                        text: promptSystem + text
                    }
                ]
            },
            {
                role: "user",
                parts: [
                    {
                        text: promptSystem + text
                    }
                ]
            }
        ],
        generationConfig: {
            responseModalities: ["audio"],
            temperature: 1,
            speech_config: {
                voice_config: {
                    prebuilt_voice_config: {
                        voice_name: "Leda"
                    }
                }
            }
        }
    };

    let attempt = 1;

    while (true) {
        try {
            console.log(`TTS attempt ${attempt}...`);

            const response = await axios.post(
                `${api_url}/${model_url}/${model}:generateContent`,
                body,
                { headers }
            );

            if (!response.data?.candidates || !response.data.candidates[0]) {
                throw new Error("No candidates in response");
            }

            if (!response.data.candidates[0]?.content?.parts) {
                throw new Error("No content parts in response");
            }

            const allParts = response.data.candidates[0].content.parts;
            const audioDataParts = allParts.filter(part => part.inlineData);

            if (audioDataParts.length === 0) {
                throw new Error("No audio data found in response");
            }

            const combinedAudioData = audioDataParts
                .map(part => part.inlineData.data)
                .join("");

            const oggBuffer = await convertPCMToOggOpus(combinedAudioData);

            console.log(`TTS berhasil pada attempt ${attempt}`);
            return oggBuffer;
        } catch (e) {
            console.error(`TTS attempt ${attempt} gagal:`, e.message || e);

            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));

            delay = Math.min(delay * 1.2, 60000);
            attempt++;
        }
    }
}

async function convertPCMToOggOpus(base64Data) {
    return new Promise((resolve, reject) => {
        const pcmBuffer = Buffer.from(base64Data, "base64");
        const inputStream = new PassThrough();
        const outputChunks = [];

        inputStream.end(pcmBuffer);

        const outputStream = new PassThrough();

        outputStream.on("data", chunk => {
            outputChunks.push(chunk);
        });

        outputStream.on("end", () => {
            resolve(Buffer.concat(outputChunks));
        });

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
                console.error("FFmpeg error:", error);
                reject(error);
            })
            .on("end", () => {
                console.log("Conversion to OGG Opus completed");
            })
            .pipe(outputStream);
    });
}

export default {
    rules: {
        owner: false,
        group: false,
        private: false,
        admin: false
    },

    async execute({ sock, m, args, text }) {
        if (!text) {
            return await m.reply(
                "❌ Berikan teks yang mau diconvert!\n\nContoh: .tts halo gais"
            );
        }

        await m.react("⌛");

        try {
            const audioBuffer = await tts(text, {
                model: "gemini-2.5-pro-preview-tts",
                delay: 2000
            });

            await sock.sendMessage(
                m.chat,
                {
                    audio: audioBuffer,
                    mimetype: "audio/ogg; codecs=opus",
                    ptt: true
                },
                { quoted: m }
            );

            await m.react("✅");
        } catch (error) {
            console.error("TTS Error:", error);
            await m.react("❌");
            await m.reply(`❌ Gagal convert text to speech: ${error.message}`);
        }
    }
};
