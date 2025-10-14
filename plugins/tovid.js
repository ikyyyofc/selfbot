// plugins/stikerToVideo.js
import fs from "fs";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function ({ sock, from, m, fileBuffer, reply }) {
  try {
    if (!fileBuffer)
      return reply("❌ Reply ke stiker bergerak yang ingin diubah jadi video.");

    // simpan file webp sementara
    const inputPath = path.join(__dirname, `temp_${Date.now()}.webp`);
    const outputPath = path.join(__dirname, `temp_${Date.now()}.mp4`);
    fs.writeFileSync(inputPath, fileBuffer);

    // ubah webp animasi ke mp4 pakai ffmpeg
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -i "${inputPath}" -movflags faststart -pix_fmt yuv420p "${outputPath}"`,
        (error) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });

    const videoBuffer = fs.readFileSync(outputPath);

    await sock.sendMessage(from, { video: videoBuffer });

    // hapus file sementara
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (e) {
    console.error(e);
    reply("❌ Terjadi kesalahan saat mengubah stiker jadi video.");
  }
}