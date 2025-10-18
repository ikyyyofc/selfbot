// plugins/stikerasli.js
import { writeFileSync, unlinkSync } from "fs";
import { fileTypeFromBuffer } from "file-type";
import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);

export default async function ({ sock, from, fileBuffer, m, reply }) {
  if (!fileBuffer) return reply("❌ Kirim atau reply gambar/video untuk dijadikan stiker tanpa crop.");

  try {
    const type = await fileTypeFromBuffer(fileBuffer);
    if (!type) return reply("❌ Tidak dapat mendeteksi jenis file.");

    const inputPath = `./temp_${Date.now()}.${type.ext}`;
    const outputPath = `./stiker_${Date.now()}.webp`;

    writeFileSync(inputPath, fileBuffer);

    // Proses konversi tanpa ubah rasio
    const ffmpegCmd = `
      ffmpeg -i ${inputPath} -vf "scale=512:-1:flags=lanczos" -vcodec libwebp -lossless 1 -preset picture -loop 0 -an -vsync 0 -s 512:512:force_original_aspect_ratio=decrease ${outputPath}
    `;

    await execPromise(ffmpegCmd);

    const stickerBuffer = Buffer.from(await Bun.file(outputPath).arrayBuffer());
    await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: m });

    unlinkSync(inputPath);
    unlinkSync(outputPath);
  } catch (e) {
    console.error(e);
    reply("❌ Gagal membuat stiker tanpa crop.");
  }
}