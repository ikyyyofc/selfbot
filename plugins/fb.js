import axios from "axios";

export default {
    desc: "Mengunduh video dari Facebook.",
    rules: {
        limit: 1,
        usage: "Kirim perintah .fb <url_video_facebook>",
        example: ".fb https://www.facebook.com/share/r/1CLYsad9CX/",
    },
    async execute(context) {
        const { m, text, reply, sock } = context;

        const urlRegex = /^(https?:\/\/)?(www\.)?(m\.)?(mbasic\.)?(facebook\.com|fb\.watch|fb\.gg)\/.+/i;
        if (!text || !urlRegex.test(text)) {
            return reply("URL Facebook tidak valid. Pastikan kamu mengirim URL video Facebook yang benar.");
        }

        try {
            const apiUrl = `https://wudysoft.xyz/api/download/facebook/v1?url=${encodeURIComponent(text)}`;
            const { data } = await axios.get(apiUrl);

            if (!data || !data.links || data.links.length === 0) {
                return reply("Gagal mendapatkan link unduhan. Coba lagi dengan URL lain.");
            }

            data.links.sort((a, b) => {
                const qualityA = parseInt(a.quality) || 0;
                const qualityB = parseInt(b.quality) || 0;
                return qualityB - qualityA;
            });

            const bestQuality = data.links[0];
            const caption = [
                `*${data.title || "Video Facebook"}*`,
                "",
                `Kualitas: ${bestQuality.quality}`,
                `Durasi: ${data.duration || "N/A"}`
            ].join("\n");

            await sock.sendMessage(
                m.chat,
                {
                    video: { url: bestQuality.url },
                    caption: caption,
                },
                { quoted: m }
            );

        } catch (error) {
            console.error(error);
            await reply(`Terjadi kesalahan: ${error.message}. Mungkin URL tidak didukung atau API sedang bermasalah.`);
        }
    }
};