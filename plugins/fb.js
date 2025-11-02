
import axios from "axios";

export default {
    desc: "Downloads a video from a Facebook URL.",
    rules: {
        limit: 1,
    },
    async execute(context) {
        const { m, text, reply } = context;

        if (!text) {
            await reply("Masukin URL video Facebook-nya, dong.");
            return;
        }

        const fbRegex = /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/.+$/;
        if (!fbRegex.test(text)) {
            await reply("URL-nya kayaknya ga valid, coba cek lagi deh.");
            return;
        }

        await reply("Sabar ya, lagi dicariin videonya...");

        try {
            const apiUrl = `https://wudysoft.xyz/api/download/facebook/v3?url=${encodeURIComponent(text)}`;
            const response = await axios.get(apiUrl);
            const data = response.data;

            if (!data || (!data.hdLink && !data.sdLink)) {
                await reply("Gagal dapetin link downloadnya, mungkin videonya private atau udah dihapus.");
                return;
            }

            const videoUrl = data.hdLink || data.sdLink;
            const quality = data.hdLink ? "HD" : "SD";

            const caption = `*${data.title || 'Facebook Video'}* (${quality})\n\n${data.description || ''}`.trim();

            await context.sock.sendMessage(
                m.chat,
                {
                    video: { url: videoUrl },
                    caption: caption,
                },
                { quoted: m }
            );
        } catch (error) {
            console.error(error);
            await reply("Waduh, API-nya lagi error nih. Coba lagi nanti, ya.");
        }
    },
};