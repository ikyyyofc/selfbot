// plugins/___autodown.js
import axios from "axios";

export default async ({ sock, m, reply }) => {
    const text = m.text;

    const igRegex =
        /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;
    const match = text.match(igRegex);

    if (!match) return true;

    const url = match[0];

    try {
        await m.react("⏳");

        const response = await axios.get(
            `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(
                url
            )}`
        );
        const data = response.data;

        if (!data.status || !data.data || data.data.length === 0) {
            await reply("❌ Gagal mengunduh konten");
            return false;
        }

        for (let media of data.data) {
            const mediaUrl = media.url;

            const buffer = {
                url: mediaUrl
            };

            const isVideo = mediaUrl.includes(".mp4") || media.type === "video";

            if (isVideo) {
                await sock.sendMessage(
                    m.chat,
                    {
                        video: buffer,
                        caption: "✅ Instagram Video"
                    },
                    { quoted: m }
                );
            } else {
                await sock.sendMessage(
                    m.chat,
                    {
                        image: buffer,
                        caption: "✅ Instagram Photo"
                    },
                    { quoted: m }
                );
            }
        }

        await m.react("✅");
        return false;
    } catch (error) {
        console.error("Instagram download error:", error.message);
        await reply(`❌ Error: ${error.message}`);
        await m.react("❌");
        return false;
    }
};
