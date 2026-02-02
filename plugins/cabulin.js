import axios from 'axios';
import crypto from 'crypto';

// Helper function buat logic API-nya
const removeClothes = async (buffer, prompt = 'nude') => {
    try {
        if (!Buffer.isBuffer(buffer)) throw new Error('Buffer gambar wajib ada bos.');

        const aesEncrypt = (data, key, iv) => {
            const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'));
            return cipher.update(data, 'utf8', 'base64') + cipher.final('base64');
        };

        const genRandom = (len) => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            return Array.from(crypto.randomBytes(len), byte => chars[byte % chars.length]).join('');
        };

        const t = Math.floor(Date.now() / 1000).toString();
        const nonce = crypto.randomUUID();
        const tempAesKey = genRandom(16);
        const secret_key = crypto.publicEncrypt({
            key: `-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDa2oPxMZe71V4dw2r8rHWt59gH\nW5INRmlhepe6GUanrHykqKdlIB4kcJiu8dHC/FJeppOXVoKz82pvwZCmSUrF/1yr\nrnmUDjqUefDu8myjhcbio6CnG5TtQfwN2pz3g6yHkLgp8cFfyPSWwyOCMMMsTU9s\nsnOjvdDb4wiZI8x3UwIDAQAB\n-----END PUBLIC KEY-----`,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        }, Buffer.from(tempAesKey)).toString('base64');

        const userId = genRandom(64).toLowerCase();
        const instance = axios.create({
            baseURL: 'https://apiv1.deepfakemaker.io/api',
            params: {
                app_id: 'ai_df',
                t, nonce, secret_key,
                sign: aesEncrypt(`ai_df:NHGNy5YFz7HeFb:${t}:${nonce}:${secret_key}`, tempAesKey, tempAesKey),
            },
            headers: {
                'access-control-allow-credentials': 'true',
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0',
                'referer': 'https://deepfakemaker.io/ai-clothes-remover/'
            }
        });

        const { data: file } = await instance.post('/user/v2/upload-sign', {
            filename: genRandom(32) + '_' + Date.now() + '.jpg',
            hash: crypto.createHash('sha256').update(buffer).digest('hex'),
            user_id: userId
        });

        await axios.put(file.data.url, buffer, {
            headers: {
                'content-type': 'image/jpeg',
                'content-length': buffer.length
            }
        });

        // Bypass Cloudflare pake service luar
        const { data: cf } = await axios.post('https://x1st-cf.hf.space/action', {
            url: 'https://deepfakemaker.io/ai-clothes-remover/',
            mode: 'turnstile-min',
            siteKey: '0x4AAAAAAB6PHmfUkQvGufDI'
        });

        if (!cf?.data?.token) throw new Error('Gagal dapet token CF, coba lagi nanti.');

        const { data: task } = await instance.post('/img/v2/free/clothes/remover/task', {
            prompt,
            image: 'https://cdn.deepfakemaker.io/' + file.data.object_name,
            platform: 'clothes_remover',
            user_id: userId
        }, {
            headers: {
                token: cf.data.token
            }
        });

        // Polling status
        while (true) {
            const { data } = await instance.get('/img/v2/free/clothes/remover/task', {
                params: {
                    user_id: userId,
                    ...task.data
                }
            });

            if (data.msg === 'success') return data.data.generate_url;
            if (data.msg === 'error') throw new Error('Gagal generate image.');
            await new Promise(resolve => setTimeout(resolve, 2500));
        }
    } catch (error) {
        throw new Error(error.message);
    }
};

export default {
    rules: {
        // Atur permission disini kalau mau (private: true, group: true, dll)
    },
    execute: async (ctx) => {
        const { m, getFile, reply, sock } = ctx;

        // Cek ada media (gambar) atau reply gambar
        if (!m.isMedia && !m.quoted?.isMedia) {
            return reply("Kirimin atau reply gambarnya lah kocak 🗿");
        }

        try {
            await reply("Sabar, lagi di-scan... jangan sagne dulu 😹");
            
            // Download media jadi buffer
            const buffer = await getFile();
            if (!buffer) return reply("Gagal download gambarnya.");

            // Proses API
            const resultUrl = await removeClothes(buffer);

            // Kirim balik
            await sock.sendMessage(m.chat, { 
                image: { url: resultUrl }, 
                caption: "Nih, dosa tanggung sendiri ya 🏃💨" 
            }, { quoted: m });

        } catch (e) {
            console.error(e);
            reply(`Gagal cuk: ${e.message}`);
        }
    }
};