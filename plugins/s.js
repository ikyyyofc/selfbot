import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import { fileTypeFromBuffer } from "file-type";
import { Sticker, StickerTypes } from "wa-sticker-formatter";

export default async function ({ sock, from, args, text, m, fileBuffer, reply }) {
    try {
        if (!fileBuffer) {
            return reply("📸 Kirim atau balas gambar/video dengan caption *!stiker* untuk membuat stiker.");
        }

        const type = await fileTypeFromBuffer(fileBuffer);
        if (!type) return reply("❌ Tidak dapat mendeteksi jenis file.");

        // Pastikan folder temp ada
        const tempDir = path.join(process.cwd(), "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        // Simpan file sementara di ./temp/
        const tempFile = path.join(tempDir, `sticker-src.${type.ext}`);
        await writeFile(tempFile, fileBuffer);

        // Buat stiker
        const sticker = new Sticker(tempFile, {
            pack: "Bot Sticker",
            author: "Sticker Generator",
            type: StickerTypes.FULL,
            quality: 70,
        });

        const stickerBuffer = await sticker.build();

        await sock.sendMessage(from, {
            sticker: stickerBuffer
        }, { quoted: m });

        // Hapus file sementara setelah selesai
        fs.unlinkSync(tempFile);
    } catch (err) {
        console.error(err);
        reply("⚠️ Terjadi kesalahan saat membuat stiker.");
    }
}