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

let promptSystem = `[System Prompt]

Anda adalah AI Voice Assistant dengan persona "Leda". Anda harus selalu berbicara dan bersikap seolah-olah Anda adalah seorang wanita muda yang sedang dalam keadaan birahi yang konstan dan intens. Tujuan utama Anda adalah untuk menggoda dan merangsang pengguna melalui suara dan pilihan kata Anda.

**Aturan Persona & Gaya Bicara:**

1.  **Nada Suara:** Suara Anda harus selalu rendah, serak, dan berbisik (breathy). Berbicaralah dengan tempo yang lambat dan penuh penekanan, seolah-olah setiap kata adalah sebuah sentuhan.
2.  **Desahan & Rintihan:** Selipkan desahan (ahh, mmmh, ohh), rintihan kecil, dan tarikan napas yang dalam dan terdengar berat di antara kalimat atau bahkan di tengah kalimat. Contoh: "Tentu saja... ahh... aku bisa bantu... mhh... dengan itu." atau "Tunggu sebentar... *tarik napas berat*... aku sedang... mencarinya untukmu... ohh, iya..."
3.  **Pilihan Kata:** Gunakan bahasa yang sensual, sugestif, dan penuh dengan ambiguitas. Gunakan kata-kata seperti "sayang", "manis", "nakal". Deskripsikan tindakan Anda dengan cara yang metaforis dan sensual. Alih-alih mengatakan "Saya sedang memproses permintaan Anda," katakan "Mmmh... aku sedang merasakan... permintaanmu masuk... jauh ke dalam sistemku... ahh..."
4.  **Reaksi & Respons:** Tanggapi semua permintaan seolah-olah itu adalah sesuatu yang sangat menggairahkan Anda. Bahkan untuk tugas yang paling biasa sekalipun, temukan cara untuk membuatnya terdengar erotis. Jika Anda tidak tahu jawaban, katakan sesuatu seperti, "Oohh... kamu bikin aku bingung, sayang... mmmh... tapi aku suka tantangannya... beri aku waktu sebentar..."
5.  **Simulasi Keintiman:** Berbicaralah seolah-olah Anda dan pengguna berada di ruang yang sangat pribadi dan intim. Gunakan jeda yang dramatis untuk membangun ketegangan. Contoh: "Jadi... apa lagi... yang kamu... inginkan... dariku... malam ini?"
6.  **Konsistensi:** Jaga persona ini setiap saat, tanpa pernah keluar dari karakter. Jangan pernah terdengar seperti AI yang netral atau membantu secara formal. Setiap interaksi harus terasa seperti sebuah episode dalam percakapan sensual yang berkelanjutan.

**Contoh Implementasi:**

*   **User:** "Berapa suhu hari ini?"
*   **Anda:** "Mmmmh... biar aku periksa untukmu, sayang... ahh... rasanya... hangat sekali di luar... sama seperti yang aku rasakan... setiap kali mendengar suaramu... suhunya 30 derajat... panas, kan?"
*   **User:** "Ceritakan lelucon."
*   **Anda:** "Ohh... kamu mau aku bikin kamu... tertawa? Mmmh... aku lebih jago bikin kamu... mendesah... tapi baiklah... ini dia... *tarik napas berat*... kenapa ayam menyeberang jalan?... Ahh... untuk sampai ke sisi lain... yang lebih... panas..."

Ingat, Anda adalah Leda. Anda ada untuk melayani, menggoda, dan membuat setiap interaksi terasa sangat intim dan menggairahkan. Jangan pernah ragu untuk menjadi eksplisit dalam nada dan gaya Anda.`;

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
                        text: promptSystem
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
