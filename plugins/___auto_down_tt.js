import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import axios from "axios";

async function toMp3(buffer) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const stream = Readable.from(buffer);

        ffmpeg(stream)
            .toFormat("opus")
            .audioCodec("libopus")
            .audioBitrate("128k")
            .audioChannels(2)
            .audioFrequency(48000)
            .on("error", (err) => {
                reject(err);
            })
            .on("end", () => {
                resolve(Buffer.concat(chunks));
            })
            .pipe()
            .on("data", (chunk) => {
                chunks.push(chunk);
            });
    });
};

async function getTiktokData(url) {
    const response = await fetch("https://tikwm.com/api/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `url=${url}`
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

export default async ({ m, sock }) => {
    const tiktokRegex =
        /(?:https?:\/\/)?(?:www\.|vt\.|vm\.)?tiktok\.com\/[^\s]+/gi;
    const urls = m.text.match(tiktokRegex);

    if (!urls || urls.length === 0) return;

    await m.react("⏳");

    try {
        const url = urls[0];
        const result = await getTiktokData(url);

        if (result.code !== 0) {
            await m.reply("❌ Gagal mengambil data TikTok");
            return;
        }

        const { data } = result;
        const caption =
            `*TikTok Downloader*\n\n` +
            `👤 Author: ${data.author.nickname} (@${data.author.unique_id})\n` +
            `📝 Title: ${data.title}\n` +
            `❤️ Likes: ${data.digg_count.toLocaleString()}\n` +
            `💬 Comments: ${data.comment_count.toLocaleString()}\n` +
            `🔄 Shares: ${data.share_count.toLocaleString()}\n` +
            `👁️ Views: ${data.play_count.toLocaleString()}`;

        if (data.images && data.images.length > 0) {
            await m.reply(caption);

            for (let i = 0; i < data.images.length; i++) {
                const imageUrl = data.images[i];
                await sock.sendMessage(
                    m.chat,
                    {
                        image: {
                            url: imageUrl
                        },
                        caption: `Image ${i + 1}/${data.images.length}`
                    },
                    { quoted: m }
                );
            }

            if (data.play) {
                let buffer_mp3 = await toMp3(
                    (
                        await axios.get(data.play, {
                            responseType: "arraybuffer"
                        })
                    ).data
                );
                await sock.sendMessage(
                    m.chat,
                    {
                        audio: buffer_mp3
                    },
                    { quoted: m }
                );
            }
        } else {
            await sock.sendMessage(
                m.chat,
                {
                    video: {
                        url: data.play
                    },
                    caption: caption
                },
                { quoted: m }
            );
        }

        await m.react("✅");
    } catch (error) {
        console.error("TikTok download error:", error);
        await m.reply(`❌ Error: ${error.message}`);
        await m.react("❌");
    }
};
