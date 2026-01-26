import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';

const API_BASE = 'https://www.nanobana.net/api';
const COOKIE = '__Host-authjs.csrf-token=30520470455c3e13eaed1f36a6d404badce7ea465230c2c98e0471bb72646a4e%7C3e869582574ac97763adf0b3d383e68275475d375f1926fd551aa712e4adbd24; __Secure-authjs.callback-url=https%3A%2F%2Fwww.nanobana.net%2F%23generator; g_state={"i_l":0,"i_ll":1769401024886,"i_b":"VKxqLQ5eJ0B2gQmnduZzPCwsZ1q418d0cjhhXWlbxTU","i_e":{"enable_itp_optimization":0}}; __Secure-authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiSWRmbEhwMk0teEF1V3l6Nkg1bHZrRHdOc0ZiM3BBOHVvMjNjaXhaZ1MxT1hHWUFNUUc0MGY0bW5XZnFtdWZyWnFYbHM2SFZILUZncDlvaUk5dTdIbHcifQ..lasLfR5B2_Rf2Q_F3K6fgw.Tro9GauoZdTk0Dtt_Dt6HJK5eG_OZoP66i6LKgtDzaj6v42BIhO-Hre144rB3wYfFQovDVKXyxAGG8WyP5FW_H3WTJP-it5Sm8xfmj7WWSbAzXGXPOcw-782yVRqLAK4cxuNNGVYCNJhOxLnKEAh_3bRBUHpkDmDfsnC8z5FmTtURhA32n-KiMW5zcPKKhY6haApLrOfJ3Y31NxjzVRDa-T-1vjTITsyFBsZW_WaFY8OHRz7giNl-rKbfm-OKEd_nvU0NqdnEUS_LBYN-5b7u5f1buYMdIt8M2g6YIaYwhdXIGZ-x9HpJz2API7NrhKN5tTwaN6UMPFq4ZSfEdYEWipfmUMacv5oGfW7AmaAWMoVvYs5tudzI00D_M0GE3A5F20fLFRMRgDOsI3cs5-e0TzGOTobv3D7UGau8XCrxX5exf5L6Q1C15A6xwtPpRJu1cOg1BlnOXf0gueF4sAAcg._Bl87onRhLiZFFuzC-e1_udKFzuUFVAfhW4FfmtUufE';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.nanobana.net',
    'Referer': 'https://www.nanobana.net/',
    'Cookie': COOKIE
};

// --- Helper Functions ---

async function uploadToNanobana(buffer) {
    const { ext, mime } = await fileTypeFromBuffer(buffer) || { ext: 'jpg', mime: 'image/jpeg' };
    const form = new FormData();
    form.append('file', buffer, { filename: `image.${ext}`, contentType: mime });

    try {
        const { data } = await axios.post(`${API_BASE}/upload/image`, form, {
            headers: {
                ...HEADERS,
                ...form.getHeaders()
            }
        });
        if (!data.url) throw new Error('Response upload tidak valid');
        return data.url;
    } catch (e) {
        throw new Error(`Upload gagal: ${e.message}`);
    }
}

async function createTask(prompt, imageUrl) {
    try {
        const payload = {
            prompt,
            image_urls: [imageUrl],
            aspect_ratio: 'portrait', // Bisa diubah: '16:9', '9:16', '1:1'
            n_frames: '10',
            remove_watermark: true
        };

        const { data } = await axios.post(`${API_BASE}/sora2/image-to-video/generate`, payload, {
            headers: {
                ...HEADERS,
                'Content-Type': 'application/json'
            }
        });

        if (!data.taskId) throw new Error('Gagal mendapatkan Task ID');
        return data.taskId;
    } catch (e) {
        throw new Error(`Create task gagal: ${e.message}`);
    }
}

async function checkStatus(taskId, prompt) {
    const maxAttempts = 60; // 60 x 3 detik = 3 menit timeout
    
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
            const { data } = await axios.get(`${API_BASE}/sora2/image-to-video/task/${taskId}`, {
                params: {
                    save: 1,
                    prompt: prompt
                },
                headers: HEADERS
            });

            if (data.status === 'completed') {
                return data.saved?.[0]?.url;
            } else if (data.status === 'failed') {
                throw new Error(data.provider_raw?.data?.failMsg || 'Generasi gagal di server');
            }
            // Jika status 'processing' atau 'pending', lanjut loop
        } catch (e) {
            // Jika error network, lanjut loop sebentar, kalau fatal throw
            if (e.message.includes('Generasi gagal')) throw e;
        }
    }
    throw new Error('Waktu habis (Timeout)');
}

// --- Main Plugin ---

export default {
    name: 'sora',
    type: 'ai',
    description: 'Generate video dari gambar menggunakan Sora 2 AI',
    
    execute: async ({ m, sock, text, reply, getFile }) => {
        // 1. Validasi Input
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';
        const isImage = /image/.test(mime);

        if (!isImage) {
            return reply(`❌ *Format Salah!*\nKirim/Reply gambar dengan caption:\n*.sora <prompt>*`);
        }
        if (!text) {
            return reply(`❌ *Prompt Kosong!*\nMasukkan deskripsi video yang diinginkan.\nContoh: *.sora walking in the rain*`);
        }

        await reply(`🤖 *SORA 2 AI*\n\n⏳ _Sedang mengunggah media & memproses video..._\n_Estimasi: 1-2 Menit_`);

        try {
            // 2. Download Media
            const buffer = await getFile();
            if (!buffer) return reply('❌ Gagal mengunduh gambar.');

            // 3. Upload ke Server Nanobana
            const imageUrl = await uploadToNanobana(buffer);
            
            // 4. Buat Task Generasi
            const taskId = await createTask(text, imageUrl);
            
            // 5. Polling Status sampai selesai
            const videoUrl = await checkStatus(taskId, text);

            if (!videoUrl) throw new Error('Url video tidak ditemukan');

            // 6. Kirim Hasil
            await sock.sendMessage(m.chat, {
                video: { url: videoUrl },
                caption: `✅ *Generate Success!*\n\n📝 *Prompt:* ${text}\n🤖 *Model:* Sora 2 (Img2Vid)`,
                gifPlayback: false
            }, { quoted: m });

        } catch (error) {
            console.error('Sora Error:', error);
            await reply(`❌ *Terjadi Kesalahan:*\n${error.message}`);
        }
    }
};