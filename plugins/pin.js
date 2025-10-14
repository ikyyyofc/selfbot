// plugins/pinterest.js
import axios from "axios";

export default async function ({ sock, from, args, text, reply }) {
  try {
    if (!text) return reply("❌ Masukkan kata kunci pencarian.\n\nContoh: *.pinterest naruto* atau *.pinterest naruto 2*");

    // Pisahkan teks dan nomor halaman
    const match = text.match(/^(.*?)(?:\s+(\d+))?$/);
    const query = match[1].trim();
    const page = parseInt(match[2]) || 1;

    const res = await axios.get(`https://wudysoft.xyz/api/search/pinterest/v1?action=search&query=${encodeURIComponent(query)}`);
    const data = res.data;

    if (!data.status || !data.result?.pins?.length) {
      return reply(`❌ Tidak ditemukan hasil untuk "${query}".`);
    }

    // Pagination setup
    const perPage = 5;
    const total = data.result.pins.length;
    const totalPages = Math.ceil(total / perPage);

    if (page > totalPages) {
      return reply(`⚠️ Halaman ${page} tidak ada.\nTotal halaman tersedia: ${totalPages}`);
    }

    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pins = data.result.pins.slice(start, end);

    await reply(`🔍 Hasil pencarian Pinterest untuk *${query}* (Halaman ${page}/${totalPages}, total ${total} hasil):`);

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