// sticker-photo-video.js
import { createSticker } from 'wa-sticker-formatter';

/*
  Export default plugin function (sesuaikan dengan kerangka yang kamu pakai).
  Context yang tersedia: { sock, from, args, text, m, fileBuffer, reply }
*/
export default async function ({ sock, from, args, text, m, fileBuffer, reply }) {
  try {
    // Pastikan ada media (fileBuffer datang dari framework jika user attach/reply)
    if (!fileBuffer) {
      return await reply('Reply atau kirim FOTO / VIDEO untuk dibuat stiker.');
    }

    // Deteksi apakah media adalah video (cek message atau quoted message)
    const quoted = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isVideo =
      Boolean(m?.message?.videoMessage) ||
      Boolean(quoted?.videoMessage) ||
      // fallback: jika filename hint ada di args (opsional)
      (args && args[0] && /\.(mp4|mov|webm|mkv)$/i.test(args[0]));

    // Opsi stiker — user bisa override lewat args: --pack "Nama" --author "Nama"
    // Simple parsing: kalau user berikan teks "pack|author" setelah command
    let pack = 'StickerBot';
    let author = 'wa-sticker-formatter';
    if (text && text.includes('|')) {
      const parts = text.split('|').map(s => s.trim());
      if (parts[0]) pack = parts[0];
      if (parts[1]) author = parts[1];
    }

    // Create sticker (will return Buffer)
    const stickerBuffer = await createSticker({
      image: fileBuffer,      // Buffer of image or video
      pack,
      author,
      type: isVideo ? 'animated' : 'default', // animated for video
      categories: ['✨', '🎴'],
      quality: 80,            // quality param (0-100)
      // crop: true, // you can add more options if needed
    });

    // kirim stiker kembali ke chat
    await reply({ sticker: stickerBuffer });

  } catch (err) {
    console.error('sticker-plugin error:', err);
    // Beri pesan error yang informatif ke user
    await reply('Gagal membuat stiker — pastikan file berupa foto atau video yang valid. (Error: ' + (err.message || err) + ')');
  }
}