// plugins/stiker.js
// Plugin sederhana: .stiker -> ubah media (reply image/video/gif) jadi sticker (webp)
// Usage: balas gambar/video/gif lalu ketik: .stiker
// Fixed: Mempertahankan rasio aspek asli, tidak memotong gambar
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import child from "child_process";

const exec = promisify(child.exec);

function tmpFileName(ext = "") {
    return path.join(
        os.tmpdir(),
        `wa_stiker_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`
    );
}

function detectMimeFromBuffer(buf) {
    if (!buf || buf.length < 12) return null;
    const sig = buf.slice(0, 12).toString("hex");
    // jpg
    if (sig.startsWith("ffd8ff")) return "image/jpeg";
    // png
    if (sig.startsWith("89504e47")) return "image/png";
    // webp (RIFF....WEBP)
    if (
        buf.slice(0, 4).toString() === "RIFF" &&
        buf.slice(8, 12).toString() === "WEBP"
    )
        return "image/webp";
    // gif
    if (buf.slice(0, 3).toString() === "GIF") return "image/gif";
    // mp4/vid -> ftyp
    if (sig.includes("66747970")) return "video/mp4";
    // pretty fallback: check for webm
    if (sig.includes("1a45dfa3")) return "video/webm";
    return null;
}

export default async function (context) {
    const { fileBuffer, reply, sock, from, m } = context;

    try {
        if (!fileBuffer) {
            await reply(
                "⚠️ Balas gambar/video/gif yang ingin dijadikan stiker lalu ketik: .stiker"
            );
            return;
        }

        const mime =
            detectMimeFromBuffer(fileBuffer) || "application/octet-stream";

        // create temp input and output files
        const inputExt = mime.startsWith("image/")
            ? ".img"
            : mime.startsWith("video/")
            ? ".vid"
            : ".bin";
        const inputPath = tmpFileName(inputExt);
        const outputPath = tmpFileName(".webp");

        fs.writeFileSync(inputPath, fileBuffer);

        // If already webp image, send directly as sticker
        if (mime === "image/webp") {
            const buf = fs.readFileSync(inputPath);
            await sock.sendMessage(from, { sticker: buf }, { quoted: m });
            try {
                fs.unlinkSync(inputPath);
            } catch (e) {}
            return;
        }

        // Try image -> ffmpeg (preserves aspect ratio without padding)
        if (mime.startsWith("image/")) {
            try {
                const ffmpegCmd = [
                    `ffmpeg -y -i "${inputPath}"`,
                    `-vcodec libwebp`,
                    `-vf "scale='if(gt(iw,ih),512,-1)':'if(gt(iw,ih),-1,512)':force_original_aspect_ratio=decrease"`,
                    `-lossless 0 -qscale 75 -preset default -an -vsync 0`,
                    `"${outputPath}"`
                ].join(" ");

                await exec(ffmpegCmd);
            } catch (err) {
                await reply(
                    "❌ Gagal mengonversi gambar. Pastikan `ffmpeg` terpasang di server."
                );
                try {
                    fs.unlinkSync(inputPath);
                } catch (e) {}
                return;
            }

            const outBuf = fs.readFileSync(outputPath);
            await sock.sendMessage(from, { sticker: outBuf }, { quoted: m });

            // cleanup
            try {
                fs.unlinkSync(inputPath);
            } catch (e) {}
            try {
                fs.unlinkSync(outputPath);
            } catch (e) {}
            return;
        }

        // Video / GIF handling via ffmpeg -> webp (animated sticker)
        // Preserves aspect ratio without padding/cropping
        if (mime.startsWith("video/") || mime === "image/gif") {
            try {
                // ffmpeg command yang mempertahankan aspect ratio tanpa padding
                const ffmpegCmd = [
                    `ffmpeg -y -i "${inputPath}"`,
                    `-vcodec libwebp`,
                    `-vf "scale='if(gt(iw,ih),512,-1)':'if(gt(iw,ih),-1,512)':force_original_aspect_ratio=decrease,fps=15"`,
                    `-loop 0 -preset default -an -vsync 0`,
                    `"${outputPath}"`
                ].join(" ");

                await exec(ffmpegCmd);
            } catch (err) {
                await reply(
                    "❌ Gagal mengonversi video/gif. Pastikan `ffmpeg` terpasang di server."
                );
                try {
                    fs.unlinkSync(inputPath);
                } catch (e) {}
                return;
            }

            const outBuf = fs.readFileSync(outputPath);
            await sock.sendMessage(from, { sticker: outBuf }, { quoted: m });

            // cleanup
            try {
                fs.unlinkSync(inputPath);
            } catch (e) {}
            try {
                fs.unlinkSync(outputPath);
            } catch (e) {}
            return;
        }

        // fallback: unknown type
        await reply(
            "❌ Tipe file tidak dikenali atau tidak didukung. Gunakan gambar (jpg/png), webp, gif, atau video (mp4/webm)."
        );
        try {
            fs.unlinkSync(inputPath);
        } catch (e) {}
    } catch (error) {
        console.error("stiker plugin error:", error);
        await reply("❌ Terjadi kesalahan: " + (error.message || error));
    }
}