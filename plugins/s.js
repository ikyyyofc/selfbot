import fs from "fs";
import { writeFile } from "fs/promises";
import { fileTypeFromBuffer } from "file-type";
import { tmpdir } from "os";
import path from "path";
import { Sticker, StickerTypes } from "wa-sticker-formatter";

export default async function ({ sock, from, args, text, m, fileBuffer, reply }) {
    try {
        if (!fileBuffer) {
            return reply("📸 Kirim atau balas gambar/video dengan caption *!stiker* untuk membuat stiker.");
        }

        const type = await fileTypeFromBuffer(fileBuffer);
        if (!type) return reply("❌ Tidak dapat mendeteksi jenis file.");

        const tempFile = path.join(tmpdir(), `sticker-src.${type.ext}`);
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

        // Hapus file sementara
        fs.unlinkSync(tempFile);
    } catch (err) {
        console.error(err);
        reply("⚠️ Terjadi kesalahan saat membuat stiker.");
    }
}