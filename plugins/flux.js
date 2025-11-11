
import axios from 'axios';

export default {
    desc: 'Bikin gambar pake AI Flux Schnell.',
    rules: {
        limit: 5
    },
    execute: async (context) => {
        const { text, m, sock, reply } = context;

        if (!text) {
            return await reply('kasih prompt dong, mau gambar apaan?\ncontoh: .flux a beautiful night sky');
        }

        await reply('sabar, lagi dibikinin gambarnya... 🎨');

        try {
            const apiUrl = `https://api.nekolabs.web.id/ai/flux/schnell?prompt=${encodeURIComponent(text)}&ratio=9:16`;
            const { data } = await axios.get(apiUrl);

            if (data.success && data.result) {
                await sock.sendMessage(m.chat, {
                    image: { url: data.result },
                    caption: `*Prompt:* ${text}`
                }, { quoted: m });
            } else {
                await reply('yahh, gagal :( coba lagi ntar ya.');
            }
        } catch (error) {
            await reply('woops, ada error. laporin ke owner gih.');
        }
    }
};