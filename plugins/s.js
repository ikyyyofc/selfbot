// plugin-sticker-photo-video.js
import { createSticker } from "wa-sticker-formatter";

/**
 * Export default plugin function — dipanggil oleh host (lihat contoh project).
 * Context params available:
 *  - sock: connection object (untuk sendMessage)
 *  - from: chat id
 *  - args: array dari pesan split
 *  - text: teks utuh (caption / argumen)
 *  - m: raw message object
 *  - fileBuffer: Buffer media (jika wrapper sudah mendownload)
 *  - reply: helper untuk mengirim reply (fallback)
 */
export default async function ({ sock, from, args, text, m, fileBuffer, reply }) {
  try {
    // Ambil media buffer
    // wrapper yang kamu tunjukkan biasanya sudah menyediakan fileBuffer.
    // Jika tidak tersedia, coba ambil dari quoted message info (host wrapper mungkin sudah handle, tapi safe-check).
    if (!fileBuffer) {
      // Jika tidak ada fileBuffer, informasikan cara pakai
      return await reply(
        "Balas foto atau video dengan perintah ini, atau kirim foto/video langsung. Plugin ini membutuhkan media (photo/video)."
      );
    }

    // Tentukan tipe media dari message (video atau image).
    const isVideo =
      (m?.message?.videoMessage !== undefined) ||
      (m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage !== undefined);

    // Opsi pack & author bisa diberikan lewat caption / args dengan format "Pack|Author"
    // Contoh: "MyPack|Me" atau hanya "MyPack"
    let packName = "Sticker";
    let authorName = "Bot";
    if (text && text.trim()) {
      const parts = text.split("|").map((p) => p.trim());
      if (parts[0]) packName = parts[0].slice(0, 30);
      if (parts[1]) authorName = parts[1].slice(0, 30);
    } else if (args && args.length) {
      // fallback: args join
      const parts = args.join(" ").split("|").map((p) => p.trim());
      if (parts[0]) packName = parts[0].slice(0, 30);
      if (parts[1]) authorName = parts[1].slice(0, 30);
    }

    // Buat sticker menggunakan wa-sticker-formatter
    // Untuk video, set type: 'video' ; untuk gambar, 'image'
    const stickerBuffer = await createSticker(fileBuffer, {
      pack: packName,
      author: authorName,
      type: isVideo ? "video" : "image", // 'video' untuk webp animasi, 'image' untuk webp statis
      quality: 85, // kualitas (0-100)
      categories: ["🤖", "📸"], // opsional
    });

    // Kirim stiker ke chat — gunakan sendMessage bawaan WA
    await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: m });

    // Optional: konfirmasi
    // Tidak perlu reply tambahan, tapi kalau host prefer reply:
    // await reply("Selesai — stiker terkirim!");
  } catch (err) {
    console.error("Plugin sticker error:", err);
    try {
      await reply("Gagal membuat stiker: " + (err?.message || String(err)));
    } catch (e) {
      // ignore
    }
  }
}