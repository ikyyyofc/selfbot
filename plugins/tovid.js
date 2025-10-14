// file: plugins/stikerToVideo.js
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export default async function ({ sock, from, m, fileBuffer, reply }) {
  try {
    // pastikan ada file stiker
    if (!fileBuffer)
      return reply("⚠️ Harap reply ke stiker bergerak (animasi) untuk diubah jadi video.");

    // simpan file sementara
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const inputPath = path.join(tmpdir(), `stiker.webp`);
    const outputPath = path.join(tmpdir(), `hasil.mp4`);
    fs.writeFileSync(inputPath, fileBuffer);

    // cek apakah stiker bergerak (animated webp)
    const { stdout } = await execPromise(`ffprobe -v error -show_streams -of json ${inputPath}`);
    const metadata = JSON.parse(stdout);
    const isAnimated =
      metadata.streams && metadata.streams.some((s) => s.codec_name === "vp8" || s.codec_name === "vp9");

    if (!isAnimated) {
      fs.unlinkSync(inputPath);
      return reply("⚠️ Stiker ini bukan stiker bergerak (animasi). Gunakan stiker animasi!");
    }

    // konversi webp ke video mp4
    await execPromise(
      `ffmpeg -i ${inputPath} -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${outputPath}`
    );

    const videoBuffer = fs.readFileSync(outputPath);
    await sock.sendMessage(from, { video: videoBuffer }, { quoted: m });

    // hapus file sementara
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (err) {
    console.error(err);
    reply("❌ Gagal mengubah stiker jadi video. Pastikan stiker bergerak dan ffmpeg terpasang.");
  }
}