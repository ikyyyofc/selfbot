// plugins/setpp.js
import axios from "axios";
import upload from "../lib/upload.js";

export default async function ({ sock, m, fileBuffer, isGroup, chat, sender, groupCache }) {
  try {
    if (!fileBuffer) return m.reply("📸 Kirim atau reply foto untuk dijadikan foto profil.");

    // Upload file ke ikyy host
    const imageUrl = await upload(fileBuffer);
    if (!imageUrl) return m.reply("❌ Gagal mengupload gambar.");

    // Ambil gambar dalam bentuk buffer dari URL
    const { data } = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(data);

    // Jika dijalankan di grup
    if (isGroup) {
      const isAdmin = await sock.isGroupAdmin(chat, sender);
      if (!isAdmin) return m.reply("🚫 Hanya admin grup yang bisa mengganti foto profil grup.");

      await sock.updateProfilePicture(chat, imageBuffer);
      await groupCache.fetch(sock, chat, true); // segarkan cache
      return m.reply("✅ Foto profil grup berhasil diganti!");
    }

    // Jika di private chat, ubah foto profil bot
    await sock.updateProfilePicture(imageBuffer);
    await m.reply("✅ Foto profil bot berhasil diganti!");
  } catch (err) {
    console.error(err);
    await m.reply("❌ Gagal mengganti foto profil: " + err.message);
  }
}