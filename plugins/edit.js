import axios from 'axios';
import upload from '../lib/upload.js';

export default {
    desc: 'Mengedit gambar dengan AI berdasarkan perintah teks.',
    rules: {
        limit: 5, // Menggunakan 5 limit per command
        premium: false,
        owner: false,
        group: false,
        private: true, // Biar lebih enak, kita set default ke private aja, tapi di grup juga bisa
    },
    execute: async (context) => {
        const { m, text, reply, getFile, sock, chat } = context;

        // Validasi input dari user
        if (m.quoted?.type !== 'imageMessage') {
            return await reply('❌ Reply ke gambar yang mau diedit dong.');
        }

        if (!text) {
            return await reply('❌ Kasih tau dong mau diedit jadi apa.\n\nContoh: .editimage jadi anime');
        }

        await reply('⏳ Oke, lagi gue edit gambarnya... Sabar ya, proses AI butuh waktu.');

        try {
            // 1. Ambil buffer gambar dari pesan yang di-reply
            const imageBuffer = await getFile();
            if (!imageBuffer) {
                return await reply('❌ Gagal dapetin gambar. Coba lagi deh.');
            }

            // 2. Upload gambar buat dapet URL
            const imageUrl = await upload(imageBuffer);
            if (!imageUrl) {
                return await reply('❌ Gagal upload gambar sementara. Coba lagi nanti.');
            }

            // 3. Siapin URL API
            const prompt = encodeURIComponent(text);
            const encodedImageUrl = encodeURIComponent(imageUrl);
            const apiUrl = `https://wudysoft.xyz/api/ai/nano-banana/v26?prompt=${prompt}&imageUrl=${encodedImageUrl}`;

            // 4. Panggil API pake axios
            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer'
            });

            // 5. Kirim hasilnya ke user
            await sock.sendMessage(chat, {
                image: Buffer.from(response.data),
                caption: `*Hasil editan AI:*\n“${text}”`,
                mimetype: 'image/png'
            }, {
                quoted: m
            });

        } catch (error) {
            console.error('Error di plugin editimage:', error);
            await reply(`❌ Duh, sorry banget, ada error nih pas ngedit.\n\nCoba cek lagi gambarnya atau coba beberapa saat lagi ya.`);
        }
    }
};