export default async function ({ sock, from, m, reply }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const sticker = quoted?.stickerMessage;

    if (!sticker) return reply("❌ Balas stiker yang ingin diubah ke media.");

    const isAnimated = sticker.isAnimated;

    // download stiker
    const buffer = await sock.downloadMediaMessage({ message: quoted });

    if (!buffer) return reply("❌ Gagal mengunduh stiker.");

    if (isAnimated) {
      // kirim sebagai video untuk stiker animasi
      await sock.sendMessage(from, { video: buffer }, { quoted: m });
    } else {
      // kirim sebagai gambar untuk stiker statis
      await sock.sendMessage(from, { image: buffer }, { quoted: m });
    }

  } catch (e) {
    console.error(e);
    reply("⚠️ Terjadi kesalahan saat mengubah stiker menjadi media.");
  }
}