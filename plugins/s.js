// sticker-photo-plugin.js
import { createSticker } from 'wa-sticker-formatter' // ESM
// Jika environmentmu pakai CommonJS, gunakan: const { createSticker } = require('wa-sticker-formatter')

export default async function ({ sock, from, args, text, m, fileBuffer, reply }) {
  try {
    // --- Validasi: harus ada fileBuffer (media sudah di-download oleh wrapper) ---
    if (!fileBuffer) {
      return await reply('Kirim/quote *foto* yang mau dijadiin stiker. Hanya menerima foto (jpg/jpeg/png).');
    }

    // --- Cek tipe media berdasarkan objek pesan (lebih dapat dipercaya daripada menebak dari buffer) ---
    // Mencari field yang mungkin berisi info media: quoted message atau langsung message
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const directImage = m.message?.imageMessage;
    const docMsg = m.message?.documentMessage;

    // Ambil mimetype jika ada
    const mimetype =
      (quoted && (quoted.imageMessage?.mimetype || quoted.documentMessage?.mimetype)) ||
      (directImage && directImage.mimetype) ||
      (docMsg && docMsg.mimetype) ||
      null;

    // Hanya izinkan foto (jpeg/jpg/png). Tolak gif, webp, video, dll.
    if (mimetype) {
      const lower = mimetype.toLowerCase();
      if (!lower.startsWith('image/')) {
        return await reply('Tolak: hanya menerima *foto* (image/jpeg atau image/png).');
      }
      if (lower.includes('gif') || lower.includes('webp')) {
        return await reply('Tolak: hanya menerima foto statis (jpg/png). GIF/WEBP/animasi tidak diizinkan.');
      }
      // allow jpeg/png (image/jpeg, image/png)
      if (!(lower.includes('jpeg') || lower.includes('jpg') || lower.includes('png'))) {
        return await reply('Tolak: format foto tidak didukung. Gunakan JPG atau PNG.');
      }
    } else {
      // kalau mimetype tidak tersedia, coba lanjut — tapi beri peringatan (attempt)
      // kita akan mencoba createSticker dan tangani error jika bukan foto
    }

    // --- Buat sticker menggunakan wa-sticker-formatter ---
    // opsi kedaluwarsa: kamu bisa ubah pack/author sesuai keinginan
    const options = {
      pack: 'My Bot Pack',
      author: 'Plugin Sticker Bot',
      // quality: 90, // bisa ditambahkan jika perlu
      // type: 'crop'  // default behaviour; docs punya opsi tambahan jika mau
    };

    let stickerBuffer;
    try {
      stickerBuffer = await createSticker(fileBuffer, options); // returns Buffer (webp)
    } catch (err) {
      console.error('createSticker error:', err);
      return await reply('Gagal membuat stiker. Pastikan file adalah foto JPG/PNG yang valid.');
    }

    // --- Kirim kembali sebagai stiker ---
    // reply helper pada template menerima string atau object; gunakan object sesuai API sendMessage
    await reply({ sticker: stickerBuffer });

  } catch (err) {
    console.error('sticker-photo-plugin unexpected error:', err);
    await reply('Terjadi error saat membuat stiker. Coba lagi atau cek log server.');
  }
}