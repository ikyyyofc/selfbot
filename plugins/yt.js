import axios from "axios";

async function ytdlp(type, videoUrl) {
    let command;

    if (type === "audio") {
        command = `-x --audio-format mp3 ${videoUrl}`;
    } else if (type === "video") {
        command = `-f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]" ${videoUrl}`;
    } else {
        throw new Error("Invalid type: use 'audio' or 'video'");
    }

    const encoded = encodeURIComponent(command);

    const res = await axios.get(
        `https://ytdlp.online/stream?command=${encoded}`,
        { responseType: "stream" }
    );

    return new Promise((resolve, reject) => {
        let downloadUrl = null;

        res.data.on("data", chunk => {
            const text = chunk.toString();
            const match = text.match(/href="([^"]+\.(mp3|mp4|m4a|webm))"/);
            if (match) downloadUrl = `https://ytdlp.online${match[1]}`;
        });

        res.data.on("end", () => {
            if (!downloadUrl) reject(new Error("Download URL not found, mungkin videonya private atau kena region lock."));
            else resolve({ dl: downloadUrl });
        });

        res.data.on("error", reject);
    });
}

export default {
    desc: "Download YouTube audio atau video.",
    rules: {
        limit: 5,
        premium: false
    },
    async execute({ m, args, reply, sock, chat }) {
        if (args.length < 2) {
            return reply("Cara pakenya: .youtube <audio/video> <url>");
        }

        const type = args[0].toLowerCase();
        const url = args[1];

        if (type !== 'audio' && type !== 'video') {
            return reply("Tipe salah, pilih 'audio' atau 'video'.");
        }

        if (!url || (!url.includes("youtube.com") && !url.includes("youtu.be"))) {
            return reply("URL YouTube-nya mana?");
        }

        try {
            await reply(`Sabar ya, lagi download ${type}...`);

            const result = await ytdlp(type, url);
            if (!result || !result.dl) throw new Error("Gagal dapet link download.");

            if (type === 'audio') {
                await sock.sendMessage(chat, {
                    audio: { url: result.dl },
                    mimetype: 'audio/mpeg'
                }, { quoted: m });
            } else {
                await sock.sendMessage(chat, {
                    video: { url: result.dl },
                    caption: "Nih videonya, kak."
                }, { quoted: m });
            }
        } catch (error) {
            console.error(error);
            await reply(`Gagal download, coba lagi nanti.\nError: ${error.message}`);
        }
    }
};