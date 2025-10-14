// sticker-photo-video.js
// Plugin: buat stiker khusus foto & video
// Dependensi: wa-sticker-formatter
// Instal: npm install wa-sticker-formatter

const { createSticker } = require("wa-sticker-formatter");

export default async function ({ sock, from, args, text, m, fileBuffer, reply }) {
  try {
    // 1) Cek apakah ada media buffer (framework biasanya sudah download dan menyertakan fileBuffer)
    if (!fileBuffer) {
      // jika tidak ada buffer, beri tahu pengguna (tidak menanyakan konfirmasi)
      return await reply("❗ Kirim atau reply *foto* atau *video* untuk dijadikan stiker.");
    }

    // 2) Tentukan jenis media (foto/video) dari objek pesan (jika tersedia)
    let mediaType = "image"; // default
    try {
      const msg = m?.message ?? {};
      // cek quoted message dulu (kalo ada)
      const quoted = msg?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted) {
        if (quoted.imageMessage) mediaType = "image";
        else if (quoted.videoMessage) mediaType = "video";
        else if (quoted.stickerMessage) mediaType = "sticker";
      } else {
        if (msg.imageMessage) mediaType = "image";
        else if (msg.videoMessage) mediaType = "video";
      }
    } catch (e) {
      mediaType = "image";
    }

    // 3) Siapkan opsi sticker sederhana
    const options = {
      pack: "WA Sticker",        // nama pack
      author: "Plugin Bot",      // author
      quality: 100,              // kualitas
      type: mediaType === "video" ? "animated" : "default", // video => animated
      // categories: [],         // opsional
      // id: "custom-id"        // opsional
    };

    // 4) Buat sticker (returns Buffer)
    const stickerBuffer = await createSticker(fileBuffer, options);

    // 5) Kirim sticker kembali
    // reply helper di konteks mengirim pesan ke 'from' bila diberikan object
    await reply({ sticker: stickerBuffer });

  } catch (err) {
    console.error("sticker plugin error:", err);
    // jika gagal, kirim pesan error singkat
    await reply("❗ Gagal membuat stiker. Pastikan media yang dikirim adalah foto atau video (video pendek).");
  }
}