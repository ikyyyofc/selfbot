// plugins/pinterest.js
import axios from "axios";

export default async function ({ sock, from, args, text, reply }) {
  try {
    if (!text) return reply("❌ Masukkan kata kunci pencarian.\n\nContoh: *.pinterest naruto*");

    const res = await axios.get(`https://wudysoft.xyz/api/search/pinterest/v1?action=search&query=${encodeURIComponent(text)}`);
    const data = res.data;

    if (!data.status || !data.result?.pins?.length) {
      return reply(`❌ Tidak ditemukan hasil untuk "${text}".`);
    }

    const pins = data.result.pins.slice(0, 5); // kirim 5 gambar teratas aja biar gak spam
    await reply(`🔍 Hasil pencarian Pinterest untuk *${text}* (${data.result.total} ditemukan):`);

    for (const pin of pins) {
      const caption = `🖼️ *${pin.title || "Tanpa Judul"}*\n👤 ${pin.uploader.full_name} (@${pin.uploader.username})\n🔗 ${pin.pin_url}`;
      await sock.sendMessage(from, {
        image: { url: pin.media.images.large.url },
        caption
      });
    }

  } catch (err) {
    console.error(err);
    reply("⚠️ Terjadi kesalahan saat mencari di Pinterest.");
  }
}