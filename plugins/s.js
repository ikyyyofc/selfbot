import { Sticker, StickerTypes } from "wa-sticker-formatter";
import fs from "fs";

export default async function ({ sock, from, args, text, m, fileBuffer, reply }) {
    try {
        if (!fileBuffer) return reply("❌ Kirim atau reply ke *foto* untuk dijadikan stiker.");

        // Buat stiker dari foto
        const sticker = new Sticker(fileBuffer, {
            type: StickerTypes.FULL, // bisa ganti ke CROP / CIRCLE
            pack: "ikyyofc",
            author: "6287866255637",
            quality: 90
        });

        const buffer = await sticker.toBuffer();

        await sock.sendMessage(from, { sticker: buffer }, { quoted: m });
    } catch (err) {
        console.error(err);
        reply("❌ Gagal membuat stiker, pastikan kirim foto yang valid.");
    }
}