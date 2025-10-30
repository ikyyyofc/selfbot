// plugins/instagram.js
export default {
    rules: {
        limit: 3
    },
    async execute({ sock, from, args, reply }) {
        if (!args[0])
            return reply("❌ Kirim link Instagram yang ingin diunduh.");

        const url = args[0];
        try {
            const api = `https://api.nekolabs.my.id/downloader/instagram?url=${encodeURIComponent(
                url
            )}`;
            const res = await fetch(api);
            const data = await res.json();

            if (!data.success || !data.result?.downloadUrl?.length) {
                return reply("❌ Gagal mengambil data dari API.");
            }

            const meta = data.result.metadata;
            const files = data.result.downloadUrl;

            let caption = `📸 *Instagram Downloader*\n`;
            caption += `👤 Username: ${meta.username}\n`;
            caption += `❤️ Likes: ${meta.like}\n💬 Komentar: ${meta.comment}\n`;
            if (meta.caption) caption += `📝 Caption:\n${meta.caption}\n`;

            // Kirim semua file yang ada
            for (const file of files) {
                await sock.sendMessage(from, {
                    [meta.isVideo ? "video" : "image"]: { url: file },
                    caption
                });
            }
        } catch (err) {
            console.error("❌ Error:", err);
            reply("❌ Terjadi kesalahan saat mengunduh.");
        }
    }
};
