// plugins/hdin.js
import axios from "axios";
import upload from "../lib/upload.js";

export default async function ({ sock, from, fileBuffer, reply }) {
  try {
    if (!fileBuffer) return reply("❌ Kirim atau reply foto yang mau di-HD-in!");

    // Upload foto ke ikyy
    const imageUrl = await upload(fileBuffer);
    if (!imageUrl) return reply("❌ Gagal upload gambar ke server!");

    // Panggil API enhance
    const apiUrl = `https://api.nekolabs.my.id/tools/pxpic/enhance?imageUrl=${encodeURIComponent(imageUrl)}`;
    const res = await axios.get(apiUrl);
    if (!res.data.success) return reply("❌ Gagal memproses gambar!");

    // Kirim hasilnya
    await sock.sendMessage(from, {
      image: { url: res.data.result },
      caption: "✨ Foto berhasil di-HD-in!"
    });
  } catch (e) {
    console.error("HD Plugin Error:", e);
    reply("❌ Terjadi kesalahan saat memproses gambar!");
  }
}