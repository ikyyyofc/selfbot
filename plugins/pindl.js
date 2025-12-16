import axios from "axios";

export default {
    name: "pinterest",
    aliases: ["pin"],
    rules: {
        cooldown: 15,
    },
    async execute({ sock, m, text, reply }) {
        if (!text) {
            return await reply("kasih link pinterestnya dong kak. contoh: .pin https://pin.it/link");
        }

        const urlRegex = /(https?:\/\/(?:www\.)?pinterest\.[a-z]+\/[^\s]+|https:\/\/pin\.it\/[^\s]+)/;
        const match = text.match(urlRegex);

        if (!match) {
            return await reply("linknya ga valid kak, coba cek lagi deh.");
        }

        const pinUrl = match[0];
        await m.react("⏳");

        try {
            const api = `https://api.nekolabs.web.id/downloader/pinterest?url=${encodeURIComponent(pinUrl)}`;
            const { data } = await axios.get(api);

            if (!data.success || !data.result || !data.result.medias.length) {
                throw new Error("gabisa download dari link itu, coba link lain.");
            }

            const medias = data.result.medias;
            
            // Find the best quality media by parsing the quality string
            const bestMedia = medias.reduce((prev, current) => {
                const prevQuality = parseInt(prev.quality) || 0;
                const currentQuality = parseInt(current.quality) || 0;
                return (currentQuality > prevQuality) ? current : prev;
            });
            
            const mediaUrl = bestMedia.url;
            const isVideo = bestMedia.extension === "mp4" || data.result.duration;
            const caption = data.result.title || "nih kak";

            if (isVideo) {
                await sock.sendMessage(m.chat, 
                    { video: { url: mediaUrl }, caption: caption },
                    { quoted: m }
                );
            } else {
                await sock.sendMessage(m.chat, 
                    { image: { url: mediaUrl }, caption: caption }, 
                    { quoted: m }
                );
            }

            await m.react("✅");

        } catch (error) {
            await m.react("❌");
            await reply(`error bro: ${error.message}`);
        }
    }
};