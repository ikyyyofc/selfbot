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

export default {
  desc: "download media atau konten dari tiktok mau video atapun foto",
    rules: {
        limit: 2
    },
    async execute({ sock, from, args, reply, m }) {
        if (!args[0]) return reply("⚠️ Kirim link TikTok yang mau diunduh.");

        try {
            const result = await postData(args[0]);

            if (result.code !== 0 || !result.data) {
                return reply(
                    "❌ Gagal mengambil data dari TikTok. Pastikan link valid."
                );
            }

            const data = result.data;
            const { title, author } = data;
            const username = author?.unique_id
                ? `@${author.unique_id}`
                : "Unknown";

            if (data.images && Array.isArray(data.images)) {
                // Konten foto slide
                await reply(
                    `🖼 *Foto Slide TikTok*\n👤 ${username}\n🎬 ${title}\n📸 Jumlah Foto: ${data.images.length}`
                );
                let allImg = [];
                for (const img of data.images) {
                    allImg.push({
                      image: {
                        url: img
                      }
                    })
                }
                await sock.sendAlbumMessage(m.chat, allImg, m)
                await sock.sendMessage(from, {
                    audio: { url: data.play },
                    mimetype: "audio/mpeg",
                    ptt: false
                });
            } else if (data.play) {
                // Konten video
                await reply(`🎥 *Video TikTok*\n👤 ${username}\n🎬 ${title}`);
                await sock.sendMessage(from, {
                    video: { url: data.play },
                    caption: `${username} - ${title}`
                });
            } else {
                reply("❌ Tidak dapat menemukan media dari link tersebut.");
            }
        } catch (error) {
            console.error(error);
            reply("🚨 Terjadi kesalahan saat memproses permintaan.\n\n" + jsonFormat(error));
        }
    }
};
