import axios from 'axios';
import upload from '../lib/upload.js';

export default {
    rules: {
        command: "editimage",
        desc: "Edit gambar dengan AI pake prompt.",
        limit: 2,
        usage: "Reply sebuah gambar dan ketik .editimage <deskripsi editan>"
    },
    async execute(context) {
        const { sock, m, text, reply } = context;

        if (!m.quoted?.isMedia || !/image/i.test(m.quoted.msg.mimetype)) {
            return reply("Salah pake, bro. Reply ke gambar yang mau diedit.");
        }

        if (!text) {
            return reply(`Prompt editannya apa? Contoh:\n\n.editimage ubah jadi kartun 3D`);
        }

        try {
            await reply("Bentar, gambarnya lagi di-make over sama AI...");

            const imageBuffer = await m.quoted.download();
            if (!imageBuffer) {
                return reply("Gagal download gambar yang di-reply, coba lagi.");
            }

            const originalImageUrl = await upload(imageBuffer);
            if (!originalImageUrl) {
                return reply("Gagal upload gambar buat diproses, servernya lagi ngambek kayaknya.");
            }

            const apiUrl = `https://wudysoft.xyz/api/ai/nano-banana/v23?prompt=${encodeURIComponent(text)}&imageUrl=${encodeURIComponent(originalImageUrl)}`;

            const { data } = await axios.get(apiUrl, {
                responseType: 'json'
            });

            if (data && data.imageUrl) {
                await sock.sendMessage(m.chat, {
                    image: { url: data.imageUrl },
                    caption: `Nih hasilnya buat prompt:\n"${text}"`
                }, { quoted: m });
            } else {
                throw new Error("API gak ngasih hasil yang bener.");
            }

        } catch (error) {
            console.error("Error di plugin editimage:", error);
            reply(`Waduh, gagal total. Mungkin API-nya lagi down atau ada masalah lain. Coba lagi nanti.\n\nError: ${error.message}`);
        }
    }
};