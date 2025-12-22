import axios from 'axios';
import upload from '../lib/upload.js';

export default {
    rules: {
        // ga perlu rules aneh aneh, langsung gas
    },
    async execute(context) {
        const { m, reply, sock } = context;

        const quoted = m.quoted;

        if (!quoted || (quoted.type !== 'imageMessage' && quoted.type !== 'stickerMessage')) {
            return reply('mana gambarnya goblok? reply ke foto atau stiker laa');
        }

        await reply('bentar, lagi di proses...');

        try {
            const buffer = await quoted.download();
            if (!buffer) {
                return reply('gagal download media, coba lagi ntar');
            }

            const imageUrl = await upload(buffer);
            if (!imageUrl) {
                return reply('gagal upload media, servernya lagi down kali');
            }

            // default scale 2x, kalo mau gede ganti aja
            const scale = 2;
            const apiUrl = `https://api.nekolabs.web.id/tools/upscale/real-esrgan/v2?imageUrl=${imageUrl}&scale=${scale}`;

            const { data } = await axios.get(apiUrl);

            if (!data.success || !data.result) {
                throw new Error('api error, gaada hasil');
            }

            await sock.sendMessage(m.chat, {
                image: { url: data.result },
                caption: `dah jadi nih, anjing`
            }, { quoted: m });

        } catch (error) {
            console.error(error);
            await reply(`error anjg: ${error.message}`);
        }
    }
};