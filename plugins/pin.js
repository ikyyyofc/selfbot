// plugins/pinterest.js
import axios from "axios";

export default {
  desc: "mencari gambar pinterest",
    rules: {
        limit: 2
    },
    async execute({ sock, from, args, text, reply }) {
        try {
            if (!text)
                return reply(
                    "❌ Masukkan kata kunci pencarian.\n\nContoh: *.pinterest naruto*"
                );

            const res = await axios.get(
                `https://wudysoft.xyz/api/search/pinterest/v1?action=search&query=${encodeURIComponent(
                    text
                )}`
            );
            const data = res.data;

            if (!data.status || !data.result?.pins?.length) {
                return reply(`❌ Tidak ditemukan hasil untuk "${text}".`);
            }

            // Acak hasil pencarian
            const shuffled = data.result.pins.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 5); // kirim 5 hasil acak

            await reply(`🔍 Hasil acak Pinterest untuk *${text}*:`);
            
            let allImg = [];

            for (const pin of selected) {
                const caption = `🖼️ *${pin.title || "Tanpa Judul"}*\n👤 ${
                    pin.uploader.full_name
                } (@${pin.uploader.username})\n🔗 ${pin.pin_url}`;
                allImg.push({
                  image: {
                    url: pin.media.images.large.url
                  },
                  caption
                })
            }
            
            await sock.sendAlbumMessage(m.chat, allImg, m);
        } catch (err) {
            console.error(err);
            reply("⚠️ Terjadi kesalahan saat mencari di Pinterest.");
        }
    }
};
