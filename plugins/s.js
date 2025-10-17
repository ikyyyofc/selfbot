// file: plugins/stiker.js
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { exec } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);

export default async function ({ sock, from, m, fileBuffer, reply }) {
  try {
    if (!fileBuffer) {
      return reply("Kirim atau balas gambar/video dengan caption *.stiker*");
    }

    // simpan sementara
    const inputPath = join(tmpdir(), `input_${Date.now()}.webp`);
    const outputPath = join(tmpdir(), `stiker_${Date.now()}.webp`);
    writeFileSync(inputPath, fileBuffer);

    // konversi ke stiker menggunakan ffmpeg
    await execAsync(
      `ffmpeg -i ${inputPath} -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white" -loop 0 ${outputPath}`
    );

    const stikerBuffer = await import("fs").then(fs =>
      fs.readFileSync(outputPath)
    );

    await sock.sendMessage(from, { sticker: stikerBuffer }, { quoted: m });
  } catch (err) {
    console.error(err);
    reply("❌ Gagal membuat stiker. Pastikan kirim gambar/video yang valid.");
  }
}