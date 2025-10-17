// plugins/fitur.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function fitur(context) {
  const { reply } = context;

  try {
    const pluginsDir = path.join(process.cwd(), "plugins");

    // Baca file plugin
    let files = [];
    try {
      files = fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"));
    } catch (e) {
      // Jika folder plugins tidak ada atau tidak bisa dibaca
      files = [];
    }

    const pluginsInfo = [];
    for (const file of files) {
      // jangan sertakan file fitur itu sendiri pada daftar
      if (file === path.basename(__filename)) continue;

      const cmd = path.basename(file, ".js");
      let desc = "";

      try {
        // import dinamis untuk mencoba ambil metadata jika ada
        const modPath = `file://${path.join(pluginsDir, file)}?update=${Date.now()}`;
        const mod = await import(modPath);
        // cek beberapa nama property umum untuk deskripsi
        desc =
          mod.help ||
          mod.description ||
          mod.info ||
          (typeof mod.default === "function" && mod.default.description) ||
          "";
        if (typeof desc === "function") desc = "";
        desc = String(desc || "").trim();
      } catch (err) {
        // gagal import -> tidak masalah, tetap tampilkan command name
        desc = "";
      }

      pluginsInfo.push({ cmd, desc });
    }

    // Fitur internal/inti bot (berdasarkan bot.js)
    const coreFeatures = [
      "🔸 Anti-delete (menangkap & menampilkan pesan yang dihapus)",
      "🔸 Anti-edit (mencatat & menampilkan riwayat edit pesan)",
      "🔸 Eval code: \">\" (eksekusi code) dan \"=>\" (return expression)",
      "🔸 Exec shell: prefix \"$\" (menjalankan perintah shell)",
      "🔸 Sistem plugin: perintah di folder plugins (prefix sesuai config)",
      "🔸 Penyimpanan pesan lokal (message store dengan limit & riwayat edit)",
      "🔸 Pairing code untuk setup awal (pairing WhatsApp)",
      "🔸 Auto-reconnect dan penanganan sesi invalid",
      "🔸 Graceful shutdown (menyimpan message store saat SIGINT)"
    ];

    // Build message
    let msg = "📋 *Daftar Fitur Bot*\n\n";
    msg += "*Fitur Inti:*\n";
    coreFeatures.forEach(f => {
      msg += `• ${f}\n`;
    });

    msg += `\n🔌 *Plugins Terdeteksi (${pluginsInfo.length}):*\n`;
    if (pluginsInfo.length === 0) {
      msg += "_(Tidak ada plugin .js di folder plugins atau belum dapat dibaca)_\n";
    } else {
      for (const p of pluginsInfo) {
        msg += `• *${p.cmd}*${p.desc ? " — " + p.desc : ""}\n`;
      }
    }

    msg += `\n📌 Cara pakai: kirim pesan dengan prefix yang dipakai bot (misal \".\") diikuti command.\n`;
    msg += `Contoh: .fitur\n`;

    await reply(msg);
  } catch (err) {
    await reply(`❌ Gagal mendapatkan daftar fitur: ${err.message}`);
  }
}