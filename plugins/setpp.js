import fs from "fs";

export default {
  desc: "Mengubah foto profil"
    rules: {
        owner: true
    },
    async execute({ sock, m, fileBuffer }) {
        try {
            if (!fileBuffer) {
                return await m.reply(
                    "❌ Kirim gambar dengan caption .setpp atau reply gambar dengan .setpp"
                );
            }

            await m.reply("⏳ Mengubah foto profil...");

            await sock.updateProfilePicture(sock.user.id, fileBuffer);

            await m.reply("✅ Foto profil berhasil diubah!");
        } catch (error) {
            console.error("Error setpp:", error);
            await m.reply(`❌ Gagal mengubah foto profil: ${error.message}`);
        }
    }
};
