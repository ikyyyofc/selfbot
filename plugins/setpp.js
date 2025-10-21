export default async function ({ sock, m, fileBuffer, isGroup, chat }) {
    if (!fileBuffer) return m.reply("❌ Kirim atau balas gambar untuk dijadikan foto profil");

    try {
        if (isGroup) {
            // Ganti foto profil grup
            await sock.groupUpdatePicture(chat, fileBuffer);
            await m.reply("✅ Foto profil grup berhasil diganti!");
        } else {
            // Ganti foto profil pribadi (bot sendiri)
            await sock.updateProfilePicture(sock.user.id, fileBuffer);
            await m.reply("✅ Foto profil berhasil diganti!");
        }
    } catch (err) {
        await m.reply("❌ Gagal mengganti foto profil: " + err.message);
    }
}