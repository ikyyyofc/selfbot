import fs from "fs";

export default {
  desc: "Mengubah foto profil",
    rules: {
        owner: true
    },
    async execute({ sock, m, getFile }) {
      let q = m.quoted ? m.quoted : m
      let fileBuffer = q.isMedia ? await getFile() : false
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
