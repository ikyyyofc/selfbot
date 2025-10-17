// plugins/stiker.js
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import child from "child_process";

const exec = promisify(child.exec);

function tmpFileName(ext = "") {
  return path.join(os.tmpdir(), `wa_stiker_${Date.now()}_${Math.floor(Math.random()*10000)}${ext}`);
}

function detectMimeFromBuffer(buf) {
  if (!buf || buf.length < 12) return null;
  const sig = buf.slice(0, 12).toString("hex");
  if (sig.startsWith("ffd8ff")) return "image/jpeg";
  if (sig.startsWith("89504e47")) return "image/png";
  if (buf.slice(0,4).toString() === "RIFF" && buf.slice(8,12).toString() === "WEBP") return "image/webp";
  if (buf.slice(0,3).toString() === "GIF") return "image/gif";
  if (sig.includes("66747970")) return "video/mp4";
  if (sig.includes("1a45dfa3")) return "video/webm";
  return null;
}

export default async function (context) {
  const { fileBuffer, reply, sock, from, m } = context;

  try {
    if (!fileBuffer) {
      await reply("⚠️ Balas gambar/video/gif yang ingin dijadikan stiker lalu ketik: .stiker");
      return;
    }

    const mime = detectMimeFromBuffer(fileBuffer) || "application/octet-stream";
    const inputPath = tmpFileName(".tmp");
    const outputPath = tmpFileName(".webp");
    fs.writeFileSync(inputPath, fileBuffer);

    if (mime === "image/webp") {
      await sock.sendMessage(from, { sticker: fs.readFileSync(inputPath) }, { quoted: m });
      fs.unlinkSync(inputPath);
      return;
    }

    // IMAGE to WEBP (keep ratio + transparent pad)
    if (mime.startsWith("image/")) {
      try {
        await exec(
          `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -lossless 0 -qscale 75 -preset picture -an -vsync 0 "${outputPath}"`
        );
      } catch {
        await reply("❌ Gagal konversi gambar. Pastikan ffmpeg terinstal.");
        fs.unlinkSync(inputPath);
        return;
      }
      await sock.sendMessage(from, { sticker: fs.readFileSync(outputPath) }, { quoted: m });
    }

    // VIDEO or GIF to WEBP (animated, keep ratio)
    if (mime.startsWith("video/") || mime === "image/gif") {
      try {
        await exec(
          `ffmpeg -y -i "${inputPath}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15" -loop 0 -preset default -an -vsync 0 "${outputPath}"`
        );
      } catch {
        await reply("❌ Gagal konversi video/gif. Pastikan ffmpeg terinstal.");
        fs.unlinkSync(inputPath);
        return;
      }
      await sock.sendMessage(from, { sticker: fs.readFileSync(outputPath) }, { quoted: m });
    }

    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  } catch (err) {
    console.error("stiker plugin error:", err);
    await reply("❌ Terjadi kesalahan: " + (err.message || err));
  }
}