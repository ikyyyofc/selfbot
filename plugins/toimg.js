import fs from "fs";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export default async function ({ sock, from, m, reply }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const sticker = quoted?.stickerMessage;

    if (!sticker) return reply("❌ Reply ke stiker statis!");
    if (sticker.isAnimated) return reply("⚠️ Stiker animasi tidak bisa diubah menjadi foto!");

    // Download stiker sebagai buffer
    const buffer = await downloadMediaMessage(
      { message: quoted },
      "buffer",
      {},
      { logger: undefined, reuploadRequest: sock.updateMediaMessage }
    );

    // Kirim ulang sebagai foto PNG
    await sock.sendMessage(from, {
      image: buffer,
      mimetype: "image/png"
    });
  } catch (e) {
    console.error(e);
    reply("❌ Gagal mengubah stiker menjadi foto!");
  }
}