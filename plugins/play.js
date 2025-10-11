export default async function ({ sock, text, reply, m }) {
    try {
        if (!text) return reply("judulnya apa anjir");
        reply("wet...");
        let proses = await (
            await fetch(
                `https://api.nekolabs.my.id/downloader/youtube/play/v1?q=${text}`
            )
        ).json();
        if (!proses.success) return reply("gagal jir");
        reply(
            {
                audio: { url: proses.result.downloadUrl },
                mimetype: "audio/mpeg",
                fileName: `${proses.result.metadata.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: proses.result.metadata.title,
                        body: `${proses.result.metadata.channel}`,
                        thumbnailUrl: proses.result.metadata.cover,
                        mediaType: 1,
                        showAdAttribution: false,
                        renderlargerThumbnail: true
                    }
                }
            },
            { quoted: m }
        );
    } catch {
        reply("ntahlah error pluginnya");
    }
}
