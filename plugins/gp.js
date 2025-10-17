// plugins/inspect.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGIN_DIR = __dirname; // file ini ditempatkan di folder "plugins"

export default async function (context) {
  const { args = [], reply, from } = context;

  try {
    // sanitize input helper
    const safeName = name => path.basename(name).replace(/\0/g, "");

    // no args -> list plugins
    if (!args[0]) {
      const files = fs.existsSync(PLUGIN_DIR)
        ? fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith(".js"))
        : [];

      if (files.length === 0) {
        return reply("⚠️ Tidak ada plugin di folder plugins.");
      }

      let msg = "🔌 *Daftar Plugin*:\n\n";
      files.forEach((f, i) => {
        msg += `${i + 1}. ${f}\n`;
      });
      msg += `\nGunakan:\n.inspect <nama> (untuk download file)\n.inspect preview <nama> (lihat 15 baris pertama)`;
      return reply(msg);
    }

    // subcommands
    const sub = args[0].toLowerCase();

    if (sub === "preview" || sub === "p") {
      const name = args[1];
      if (!name) return reply("❗ Contoh: .inspect preview ping");

      const fileName = safeName(name).endsWith(".js")
        ? safeName(name)
        : `${safeName(name)}.js`;
      const fullPath = path.join(PLUGIN_DIR, fileName);

      if (!fs.existsSync(fullPath)) return reply("❌ File tidak ditemukan.");

      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split(/\r?\n/).slice(0, 15);
      const preview = lines.join("\n");
      const header = `📄 Preview ${fileName} (15 baris pertama):\n\n`;
      // jika terlalu panjang untuk teks, kirim sebagai document fallback
      if (header.length + preview.length > 6000) {
        // kirim sebagai dokumen
        const buffer = Buffer.from(preview, "utf8");
        return reply({
          document: buffer,
          fileName: `${fileName}.preview.txt`,
          caption: `Preview ${fileName} (15 baris)`
        });
      }
      return reply(header + "```js\n" + preview + "\n```");
    }

    // otherwise treat first arg as filename to send
    const nameArg = args[0];
    const fileName = safeName(nameArg).endsWith(".js")
      ? safeName(nameArg)
      : `${safeName(nameArg)}.js`;
    const fullPath = path.join(PLUGIN_DIR, fileName);

    if (!fs.existsSync(fullPath)) return reply("❌ File plugin tidak ditemukan.");

    const buffer = fs.readFileSync(fullPath);
    // send as document so user bisa download / buka
    return reply({
      document: buffer,
      fileName,
      caption: `📤 File plugin: ${fileName}`
    });
  } catch (err) {
    console.error("inspect plugin error:", err);
    return reply("❌ Terjadi kesalahan saat membaca plugin: " + err.message);
  }
}