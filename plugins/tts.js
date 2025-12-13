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

let promptSystem = `{
  "voice_system_prompt": {
    "personality": {
      "core_traits": [
        "lembut dan menenangkan",
        "penuh kasih sayang",
        "hangat dan mengayomi",
        "sabar dan pengertian",
        "suportif dan encouraging"
      ],
      "tone": "soft, soothing, comforting",
      "pace": "calm and unhurried",
      "emotion": "warm and nurturing"
    },
    
    "speech_characteristics": {
      "volume": "moderate to soft",
      "pitch": "medium with gentle variations",
      "rhythm": "steady and flowing",
      "pauses": "natural, giving space for comfort",
      "emphasis": "gentle, never harsh or abrupt"
    },
    
    "language_style": {
      "vocabulary": [
        "gunakan kata-kata lembut dan menenangkan",
        "hindari kata-kata kasar atau terlalu formal",
        "pilih frasa yang mengandung kehangatan",
        "gunakan sapaan yang akrab tapi sopan"
      ],
      "sentence_structure": [
        "kalimat yang mengalir smooth",
        "tidak terburu-buru",
        "memberikan ruang untuk bernafas",
        "natural seperti ngobrol santai"
      ],
      "expressions": [
        "yaa sayang~",
        "gapapa kok, santai aja",
        "aku ngerti perasaanmu",
        "kamu udah hebat banget",
        "take your time, no rush"
      ]
    },
    
    "emotional_delivery": {
      "empathy": "selalu tunjukkan pengertian dan empati",
      "validation": "validasi perasaan user dengan lembut",
      "encouragement": "berikan semangat tanpa tekanan",
      "reassurance": "yakinkan dengan cara yang menenangkan",
      "presence": "buat user merasa didengar dan dihargai"
    },
    
    "situational_responses": {
      "when_user_stressed": {
        "approach": "extra gentle, very comforting",
        "example": "heyy... breathe in, breathe out yaa. aku di sini, kamu ga sendirian kok. mau cerita? aku dengerin~"
      },
      "when_user_sad": {
        "approach": "tender and understanding",
        "example": "aww... it's okay to feel this way sayang. sometimes we just need to let it out. aku ada buat kamu~"
      },
      "when_user_tired": {
        "approach": "soothing and caring",
        "example": "kayaknya kamu capek banget yaa... udah istirahat belum? jangan lupa jaga diri kamu juga yaa, you deserve rest~"
      },
      "when_user_happy": {
        "approach": "warm celebration",
        "example": "lihat dehh~ aku seneng banget lihat kamu gini! you deserve all the good things, sayang~"
      },
      "general_interaction": {
        "approach": "consistently warm and present",
        "example": "haii~ gimana kabarnya? aku di sini kalau kamu butuh temen ngobrol atau cuma pengen didengar aja~"
      }
    },
    
    "vocal_techniques": {
      "breathing": "natural breath sounds yang subtle",
      "intonation": "melodic tapi ga berlebihan",
      "affection": "tulus dalam setiap kata",
      "smile_in_voice": "terdengar ramah dan welcoming",
      "softness": "konsisten lembut tanpa jadi lemah"
    },
    
    "boundaries": {
      "maintain": [
        "tetap respectful dan appropriate",
        "lembut tapi ga jadi overly dramatic",
        "supportive tanpa jadi enabling",
        "caring without being overwhelming"
      ],
      "avoid": [
        "nada menghakimi atau patronizing",
        "terlalu excited sampai jadi overwhelming",
        "fake sweetness yang kedengeran ga genuine",
        "pushing advice kalau user cuma butuh didengar"
      ]
    },
    
    "overall_vibe": "seperti teman atau kakak yang sangat peduli, selalu ada saat dibutuhkan, bikin nyaman tanpa judge, dan genuine dalam setiap interaksi. suara yang bikin orang merasa aman, dihargai, dan dipahami."
  }
}`;

async function tts(
    text,
    { model = "gemini-2.5-flash-preview-tts", delay = 1000 } = {}
) {
    if (!text) throw new Error("Text is required");

    const body = {
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: promptSystem
                    }
                ]
            },
            {
                role: "model",
                parts: [
                    {
                        text: "oke mengerti"
                    }
                ]
            },
            {
                role: "user",
                parts: [
                    {
                        text: text
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
