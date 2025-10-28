async function postData(input) {
    const urlApi = "https://tikwm.com/api/";
    const bodyData = `url=${input}`;

    try {
        const response = await fetch(urlApi, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: bodyData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Gagal melakukan fetch:", error);
        throw error;
    }
}

export default async function ({ sock, m, text }) {
    const tiktokRegex =
        /(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/gi;
    const urls = m.text.match(tiktokRegex);

    if (!urls || urls.length === 0) return true;

    const url = urls[0];

    try {
        await m.reply("⏳ Downloading TikTok video...");

        const result = await postData(url);

        if (result.code !== 0 || !result.data) {
            await m.reply("❌ Failed to download TikTok video");
            return false;
        }

        const { data } = result;
        const caption = `🎬 *TikTok Video*

📝 Title: ${data.title || "No title"}
👤 Author: ${data.author?.nickname || "Unknown"}
⏱️ Duration: ${data.duration}s
❤️ Likes: ${data.digg_count?.toLocaleString() || 0}
💬 Comments: ${data.comment_count?.toLocaleString() || 0}
🔄 Shares: ${data.share_count?.toLocaleString() || 0}
👁️ Views: ${data.play_count?.toLocaleString() || 0}`;

        const videoUrl = data.play || data.wmplay;

        await sock.sendMessage(
            m.chat,
            {
                video: {
                    url: videoUrl
                },
                caption: caption,
                mimetype: "video/mp4"
            },
            { quoted: m }
        );

        return false;
    } catch (error) {
        console.error("TikTok download error:", error);
        await m.reply(`❌ Error: ${error.message}`);
        return false;
    }
}
