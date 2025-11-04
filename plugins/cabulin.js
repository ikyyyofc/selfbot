import axios from 'axios';
import upload from '../lib/upload.js';

export default {
    desc: 'AI buat... ya you know lah ( premium )',
    rules: {
        premium: true,
        limit: 10
    },
    execute: async ({ m, reply, getFile, sock, chat }) => {
        try {
            const imageBuffer = await getFile();
            if (!imageBuffer) {
                return await reply('Kirim atau reply gambar yang mau di-edit dong.');
            }

            await m.reply('Bentar ya, prosesnya emang agak lama, sabar...');

            const uploadedUrl = await upload(imageBuffer);
            if (!uploadedUrl) {
                return await reply('Gagal upload gambar, coba lagi ntar.');
            }

            const apiUrl = `https://api.nekolabs.web.id/tools/convert/remove-clothes?imageUrl=${encodeURIComponent(uploadedUrl)}`;
            
            const { data } = await axios.get(apiUrl, {
                timeout: 120000 // 2 menit timeout
            });

            if (!data.success || !data.result) {
                throw new Error(data.message || 'API ga ngasih hasil, mungkin gambarnya ga cocok.');
            }

            await sock.sendMessage(chat, {
                image: { url: data.result },
                caption: 'Nih hasilnya. Awas jangan dipake macem-macem ya! 🤨'
            });

        } catch (error) {
            console.error(error);
            await reply(`Anjir, error. Sorry banget, coba lagi deh nanti.\n\nError: ${error.message}`);
        }
    }
};