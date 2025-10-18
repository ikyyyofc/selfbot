import axios from "axios";

/**
 * Fungsi pencarian video TikTok
 * @param {string} query
 * @returns {Promise<Array>} daftar video
 */
async function tiktoksearch(query) {
    const res = await axios.post(
        "https://tikwm.com/api/feed/search",
        "keywords=" + encodeURIComponent(query),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );
    return res.data.data.videos;
}

/**
 * Plugin utama TikTok Search (kirim 5 video sekaligus)
 */
export default async function ({ sock, m, text, reply }) {
    if (!text) return reply("❌ Masukkan kata kunci pencarian TikTok!");

    try {
        const results = await tiktoksearch(text);
        if (!results || results.length === 0)
            return reply("⚠️ Tidak ditemukan hasil untuk: " + text);

        const limit = Math.min(results.length, 5);
        await reply(`🔍 *Mencari video TikTok...*\nKata kunci: *${text}*`);

        for (let i = 0; i < limit; i++) {
            const v = results[i];
            const caption = [
                `🎬 *${v.title || "Tanpa judul"}*`,
                `👤 ${v.author.nickname} (@${v.author.unique_id})`,
                `❤️ ${v.digg_count} | 💬 ${v.comment_count} | 🔁 ${v.share_count}`,
                `▶️ ${v.play_count} views`,
                `🔗 ${v.play}`,
            ].join("\n");

            await sock.sendMessage(m.chat, {
                video: { url: v.play },
                caption,
            });
        }

        await reply(`✅ Selesai! ${limit} video dikirim.`);
    } catch (err) {
        console.error("❌ TikTok search error:", err);
        reply("❌ Terjadi kesalahan saat mencari video TikTok!");
    }
}