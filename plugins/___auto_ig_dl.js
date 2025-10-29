// plugins/___autoigdl.js
export default async ({ sock, m, text, fileBuffer }) => {
    if (!text) return true;

    const instagramRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/gi;
    const matches = [...text.matchAll(instagramRegex)];

    if (matches.length === 0) return true;

    try {
        await m.react("⏳");

        for (const match of matches) {
            const url = match[0];
            
            try {
                const response = await fetch(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url)}`);
                const data = await response.json();

                if (!data.status || !data.data || data.data.length === 0) {
                    await m.reply(`❌ Gagal download: ${url}`);
                    continue;
                }

                const mediaData = data.data[0];
                const mediaUrl = mediaData.url;
                const isVideo = mediaData.type === "video";

                const caption = `✅ *Instagram Downloader*\n\n` +
                    `📱 *Type:* ${isVideo ? "Video" : "Image"}\n` +
                    `🔗 *Link:* ${url}`;

                const mediaBuffer = await fetch(mediaUrl).then(r => r.arrayBuffer()).then(b => Buffer.from(b));

                if (isVideo) {
                    await sock.sendMessage(m.chat, {
                        video: mediaBuffer,
                        caption
                    }, { quoted: m });
                } else {
                    await sock.sendMessage(m.chat, {
                        image: mediaBuffer,
                        caption
                    }, { quoted: m });
                }

            } catch (error) {
                console.error("Error downloading Instagram media:", error.message);
                await m.reply(`❌ Error: ${error.message}`);
            }
        }

        await m.react("✅");
    } catch (error) {
        console.error("Auto Instagram download error:", error.message);
        await m.react("❌");
    }

    return true;
};