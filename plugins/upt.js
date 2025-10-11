import { execSync } from "child_process";

export default async function ({ reply }) {
  try {
    // Cek hash commit lokal dan remote
    const localHash = execSync("git rev-parse HEAD").toString().trim();
    execSync("git fetch origin main"); // ganti 'main' kalau branch lain
    const remoteHash = execSync("git rev-parse origin/main").toString().trim();

    if (localHash !== remoteHash) {
      await reply("🔄 Update baru terdeteksi!\nMenarik perubahan dari repository...");

      // Jalankan git pull dan pastikan selesai sebelum lanjut
      execSync("git pull origin main", { stdio: "inherit" });

      await reply("✅ Update berhasil! Bot akan restart sekarang...");

      // Pastikan semua pesan dan proses async selesai dulu
      await new Promise(resolve => setImmediate(resolve));

      console.log("⚙️ Restarting bot dengan aman...");
      process.exit(0);
    } else {
      // Tidak ada update, tidak perlu melakukan apa pun
      reply("🟢 Repository sudah versi terbaru.");
      console.log("🟢 Repository sudah versi terbaru.");
    }
  } catch (err) {
    console.error("❌ Gagal memeriksa atau menarik update:", err);
    await reply("❌ Terjadi kesalahan saat memeriksa update repository.");
  }
}