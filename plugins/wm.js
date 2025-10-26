import { Sticker, StickerTypes } from "wa-sticker-formatter";

export default async ({ sock, m, text, reply }) => {
  try {
    // 1. Cek input dari user
    if (!text) {
      return await reply("Kasih nama pack sama authornya, dong.\nFormat: `.wm <pack>|<author>`");
    }

    let [pack, author] = text.split("|");
    pack = pack?.trim() || ""; // Kalo pack kosong, jadiin string kosong aja
    author = author?.trim() || ""; // Sama juga buat author

    // 2. Pastiin ada stiker yang di-reply atau dikirim
    const isSticker = m.type === "stickerMessage" || m.quoted?.type === "stickerMessage";
    if (!isSticker) {
      return await reply("Reply stiker yang mau diganti WM-nya, bos.");
    }
    
    await m.react("⏳");

    // 3. Download buffer stikernya
    const stickerBuffer = await (m.quoted ? m.quoted.download() : m.download());
    if (!stickerBuffer) {
        throw new Error("Gagal download stiker, coba lagi.");
    }

    // 4. Buat stiker baru pake wa-sticker-formatter
    const sticker = new Sticker(stickerBuffer, {
      pack: pack,
      author: author,
      type: StickerTypes.FULL, // Pake 'FULL' biar ga ke-crop
      quality: 100,
    });

    const newStickerBuffer = await sticker.toBuffer();

    // 5. Kirim stiker yang udah jadi
    await sock.sendMessage(m.chat, { sticker: newStickerBuffer }, { quoted: m });
    await m.react("✅");

  } catch (e) {
    console.error(e);
    await reply(`Anjir, error: ${e.message}`);
    await m.react("❌");
  }
};