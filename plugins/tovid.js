import fs from "fs";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export default async function ({ sock, from, m, reply }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const sticker = quoted?.stickerMessage;

    if (!sticker) return reply("❌ Reply ke stiker animasi!");
    if (!sticker.isAnimated) return reply("⚠️ Stiker ini bukan animasi!");

    const buffer = await downloadMediaMessage(
      { message: quoted },
      "buffer",
      {},
      { logger: undefined, reuploadRequest: sock.updateMediaMessage }
    );

    const webpPath = "./temp_sticker.webp";
    const mp4Path = "./temp_video.mp4";
    fs.writeFileSync(webpPath, buffer);

    // Konversi WebP animasi ke MP4 dengan parameter aman
    await execFileAsync("ffmpeg", [
      "-y", // overwrite tanpa tanya
      "-i", webpPath,
      "-movflags", "faststart",
      "-pix_fmt", "yuv420p",
      "-vsync", "0",
      "-an",
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      mp4Path
    ]);

    const videoBuffer = fs.readFileSync(mp4Path);

    await sock.sendMessage(from, {
      video: videoBuffer,
      mimetype: "video/mp4"
    });

    fs.unlinkSync(webpPath);
    fs.unlinkSync(mp4Path);
  } catch (err) {
    console.error("❌ Error konversi stiker animasi:", err);
    reply("❌ Gagal mengubah stiker animasi menjadi video!");
  }
}