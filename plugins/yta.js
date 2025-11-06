import axios from "axios";

export default {
    desc: "Download YouTube audio (MP3) using ytdlp.online",
    rules: {
        limit: 2, // Menggunakan 2 limit per download
        premium: false,
    },
    async execute({ m, args, reply, sock }) {
        if (!args.length) {
            return await reply(
                `Kirim perintah *.ytmp3 [url]*\n\nContoh:\n.ytmp3 https://youtu.be/6uuONK9sNmQ`
            );
        }

        const url = args[0];
        if (!/youtu\.be|youtube\.com/.test(url)) {
            return await reply("URL YouTube yang kamu kasih kayaknya gak valid, coba cek lagi deh.");
        }

        await m.react("⏳");
        await reply("Sabar ya, lagi diproses...");

        try {
            const apiUrl = `https://ytdlp.online/stream?command=-x%20--audio-format%20mp3%20${encodeURIComponent(
                url
            )}`;
            const response = await axios.get(apiUrl, {
                responseType: "text"
            });

            const streamData = response.data;
            const downloadLinkMatch = streamData.match(
                /<a href="(\/download\/[^"]+)"[^>]*>Download File<\/a>/
            );

            if (!downloadLinkMatch || !downloadLinkMatch[1]) {
                console.error("API Response:\n", streamData);
                throw new Error(
                    "Gagal menemukan link download dari API. Mungkin videonya gak support atau ada masalah sama servernya."
                );
            }

            const downloadPath = downloadLinkMatch[1];
            const fullDownloadUrl = `https://ytdlp.online${downloadPath}`;
            const fileName =
                decodeURIComponent(downloadPath.split("/").pop()) || "audio.mp3";

            await sock.sendMessage(
                m.chat, {
                    audio: {
                        url: fullDownloadUrl
                    },
                    mimetype: "audio/mpeg",
                    fileName: fileName,
                }, {
                    quoted: m
                }
            );

            await m.react("✅");
        } catch (error) {
            console.error("Ytmp3 Plugin Error:", error);
            await m.react("❌");
            await reply(
                `Waduh, ada error nih.\n\n` +
                `Pesan Error: ${error.message}`
            );
        }
    },
};