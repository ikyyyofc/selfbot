// plugins/sticker.js
import { Sticker, StickerTypes } from "wa-sticker-formatter";

export default async function ({ sock, from, m, fileBuffer, reply }) {
  try {
    if (!fileBuffer) {
      return reply("📸 Kirim atau balas gambar/video untuk dijadikan stiker!");
    }

    const sticker = new Sticker(fileBuffer, {
      pack: "StickerBot",
      author: "GPT-5",
      type: StickerTypes.FULL,
      quality: 70
    });

    const buffer = await sticker.build();
    await sock.sendMessage(from, { sticker: buffer }, { quoted: m });
  } catch (error) {
    console.error("❌ Gagal membuat stiker:", error);
    reply(`❌ Terjadi kesalahan: ${error.message}`);
  }
}