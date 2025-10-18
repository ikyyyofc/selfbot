// plugins/stiker.js
import { writeFileSync, unlinkSync } from "fs";
import { fileTypeFromBuffer } from "file-type";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export default async function ({ sock, from, fileBuffer, m, reply }) {
  try {
    if (!fileBuffer) return reply("⚠️ Kirim atau balas gambar/video dengan caption *.stiker*");

    const { ext, mime } = await fileTypeFromBuffer(fileBuffer);
    const inputPath = `./temp_${Date.now()}.${ext}`;
    const outputPath = `./stiker_${Date.now()}.webp`;

    writeFileSync(inputPath, fileBuffer);

    if (mime.startsWith("image/")) {
      // ⬇️ Gambar — tanpa ubah rasio
      await execPromise(
        `ffmpeg -i ${inputPath} -vf "scale=iw:ih,format=rgba,fps=15" -y ${outputPath}`
      );
    } else if (mime.startsWith("video/")) {
      // ⬇️ Video — tetap rasio asli, max durasi 10 detik
      await execPromise(
        `ffmpeg -i ${inputPath} -vf "scale=iw:ih,format=rgba,fps=15" -t 10 -loop 0 -y ${outputPath}`
      );
    } else {
      unlinkSync(inputPath);
      return reply("❌ Format file tidak didukung. Gunakan gambar atau video.");
    }

    await sock.sendMessage(from, { sticker: { url: outputPath } }, { quoted: m });

    unlinkSync(inputPath);
    unlinkSync(outputPath);
  } catch (err) {
    console.error("Sticker error:", err);
    reply("❌ Gagal membuat stiker: " + err.message);
  }
}