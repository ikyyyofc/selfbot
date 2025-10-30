import uploadFile from "../lib/upload.js";

export default {
    async execute({ sock, from, args, text, m, fileBuffer, reply }) {
        try {
            // Cek apakah ada file
            if (!fileBuffer) {
                return reply(
                    "❌ Tidak ada media yang ditemukan untuk diupload.\nKirim atau reply media dengan caption .upload"
                );
            }

            // Jalankan fungsi upload dari lib/upload.js
            const url = await uploadFile(fileBuffer);

            if (!url) {
                return reply("❌ Gagal mengupload media.");
            }

            // Kirim hasil URL upload
            await reply(url);
        } catch (err) {
            console.error("Upload error:", err);
            reply("⚠️ Terjadi kesalahan saat upload media.");
        }
    }
};
