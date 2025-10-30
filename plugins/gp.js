// plugins/inspect.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGIN_DIR = __dirname; // folder plugin

export default {
  desc: "menampilkan / mengambil plugin",
    rules: {
        owner: true
    },
    async execute(context) {
        const { args = [], reply } = context;

        try {
            // Helper untuk sanitize nama file
            const safeName = name => path.basename(name).replace(/\0/g, "");

            // Kalau tanpa argumen → tampilkan daftar plugin
            if (!args[0]) {
                const files = fs.existsSync(PLUGIN_DIR)
                    ? fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith(".js"))
                    : [];

                if (files.length === 0)
                    return reply(
                        "⚠️ Tidak ada plugin ditemukan di folder plugins."
                    );

                let msg = "🔌 *Daftar Plugin:*\n\n";
                files.forEach((f, i) => (msg += `${i + 1}. ${f}\n`));
                msg += `\nGunakan perintah:\n.inspect <nama> → kirim file plugin\n.inspect preview <nama> → lihat isi plugin lengkap`;
                return reply(msg);
            }

            const sub = args[0].toLowerCase();

            // Mode preview
            if (sub === "preview" || sub === "p") {
                const name = args[1];
                if (!name) return reply("❗ Contoh: .inspect preview ping");

                const fileName = safeName(name).endsWith(".js")
                    ? safeName(name)
                    : `${safeName(name)}.js`;
                const fullPath = path.join(PLUGIN_DIR, fileName);

                if (!fs.existsSync(fullPath))
                    return reply("❌ File tidak ditemukan.");

                const content = fs.readFileSync(fullPath, "utf8");

                // Jika terlalu panjang untuk dikirim sebagai teks, kirim dokumen
                if (content.length > 6000) {
                    const buffer = Buffer.from(content, "utf8");
                    return reply({
                        document: buffer,
                        fileName: `${fileName}.txt`,
                        caption: `📄 Isi lengkap plugin: ${fileName}`
                    });
                }

                return reply(
                    `📄 *Isi plugin ${fileName}:*\n\n\`\`\`js\n${content}\n\`\`\``
                );
            }

            // Mode kirim file plugin langsung
            const nameArg = args[0];
            const fileName = safeName(nameArg).endsWith(".js")
                ? safeName(nameArg)
                : `${safeName(nameArg)}.js`;
            const fullPath = path.join(PLUGIN_DIR, fileName);

            if (!fs.existsSync(fullPath))
                return reply("❌ File plugin tidak ditemukan.");

            const buffer = fs.readFileSync(fullPath);
            return reply({
                document: buffer,
                fileName,
                caption: `📤 File plugin: ${fileName}`
            });
        } catch (err) {
            console.error("inspect plugin error:", err);
            return reply(
                "❌ Terjadi kesalahan saat membaca plugin: " + err.message
            );
        }
    }
};
