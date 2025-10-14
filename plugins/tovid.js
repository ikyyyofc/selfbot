import fs from "fs";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async function ({ sock, from, m, reply }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const sticker = quoted?.stickerMessage;

    if (!sticker) return reply("❌ Reply ke stiker animasi!");
    if (!sticker.isAnimated) return reply("⚠️ Stiker ini bukan animasi!");

    // Download stiker animasi
    const buffer = await downloadMediaMessage(
      { message: quoted },
      "buffer",
      {},
      { logger: undefined, reuploadRequest: sock.updateMediaMessage }
    );

    // Simpan sementara sebagai file webp
    const webpPath = "./temp_sticker.webp";
    const mp4Path = "./temp_video.mp4";
    fs.writeFileSync(webpPath, buffer);

    // Konversi WEBP animasi menjadi MP4
    await execAsync(
      `ffmpeg -i ${webpPath} -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${mp4Path}`
    );

    const videoBuffer = fs.readFileSync(mp4Path);

    // Kirim hasil video
    await sock.sendMessage(from, { video: videoBuffer, mimetype: "video/mp4" });

    // Hapus file sementara
    fs.unlinkSync(webpPath);
    fs.unlinkSync(mp4Path);
  } catch (err) {
    console.error(err);
    reply("❌ Gagal mengubah stiker animasi menjadi video!");
  }
}