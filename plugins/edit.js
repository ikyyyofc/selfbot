import axios from "axios";
import FormData from "form-data";
import { fileTypeFromBuffer } from "file-type";

// Konfigurasi API
const CONFIG = {
    bypassUrl: "https://api.nekolabs.web.id/tools/bypass/cf-turnstile",
    siteKey: "0x4AAAAAACLCCZe3S9swHyiM",
    targetUrl: "https://photoeditorai.io",
    createUrl: "https://api.photoeditorai.io/pe/photo-editor/create-job-v2",
    jobUrl: "https://api.photoeditorai.io/pe/photo-editor/get-job/"
};

const HEADERS = {
    "product-serial": "367c957aa6b1ffb6cf7107c247f552e9",
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36",
    "origin": "https://photoeditorai.io",
    "referer": "https://photoeditorai.io/"
};

export default {
    execute: async ({ sock, m, text, getFile, reply }) => {
        try {
            // Validasi prompt
            if (!text) {
                return reply("❌ Masukkan prompt!\n\nContoh:\n.nanobananapro <prompt>");
            }

            // Validasi media
            const buffer = await getFile();
            if (!buffer) {
                return reply("❌ Harap reply atau kirim gambar dengan caption.");
            }

            // Cek tipe file
            const fileType = await fileTypeFromBuffer(buffer);
            if (!fileType || !fileType.mime.startsWith("image/")) {
                return reply("❌ Hanya support format gambar.");
            }

            await reply("⏳ Sedang memproses gambar dengan AI...");

            // Proses AI
            const resultBuffer = await processImage(buffer, fileType.mime, text);

            // Kirim hasil
            await sock.sendMessage(m.chat, { 
                image: resultBuffer, 
                caption: `🎨 *Prompt:* ${text}` 
            }, { quoted: m });

        } catch (error) {
            console.error(error);
            await reply(typeof error === 'string' ? error : `❌ Terjadi kesalahan: ${error.message}`);
        }
    }
};

// --- Helper Functions ---

async function processImage(buffer, mime, prompt) {
    try {
        const token = await getTurnstileToken();
        const jobId = await createJob(buffer, mime, prompt, token);
        const imageUrl = await pollJobResult(jobId);
        
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (e) {
        throw e;
    }
}

async function getTurnstileToken() {
    try {
        const { data } = await axios.get(CONFIG.bypassUrl, {
            params: {
                url: CONFIG.targetUrl,
                siteKey: CONFIG.siteKey
            }
        });
        
        if (!data.success) throw new Error("Gagal bypass keamanan (Turnstile)");
        return data.result;
    } catch (e) {
        throw new Error(`Bypass Error: ${e.message}`);
    }
}

async function createJob(buffer, mime, prompt, token) {
    try {
        const form = new FormData();
        form.append("model_name", "nano_banana_pro");
        form.append("turnstile_token", token);
        form.append("target_images", buffer, { 
            filename: "image.jpg", 
            contentType: mime 
        });
        form.append("prompt", prompt);
        form.append("ratio", "match_input_image");
        form.append("image_resolution", "1K");

        const { data } = await axios.post(CONFIG.createUrl, form, {
            headers: {
                ...HEADERS,
                ...form.getHeaders()
            }
        });

        if (data.code !== 100000) {
            throw new Error(data.message || "Gagal membuat job AI");
        }
        
        return data.result.job_id;
    } catch (e) {
        throw e;
    }
}

async function pollJobResult(jobId) {
    const maxAttempts = 50; // Max waktu tunggu sekitar 1.5 menit
    
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 2000)); // Delay 2 detik
        
        try {
            const { data } = await axios.get(`${CONFIG.jobUrl}${jobId}`, { headers: HEADERS });
            
            if (data.code !== 100000) throw new Error(data.message);
            if (data.result.error) throw new Error(data.result.error);
            
            // Cek status sukses (biasanya status 2)
            if (data.result.status === 2 && data.result.output?.length > 0) {
                return data.result.output[0];
            }
        } catch (e) {
            // Lanjut polling jika error network sesaat, tapi throw jika error API fatal
            if (e.message.includes("404") || e.message.includes("403")) throw e;
        }
    }
    
    throw new Error("Timeout: Proses AI terlalu lama.");
}