// plugins/listfitur.js
export default async function ({ sock, from, m, reply, state }) {
  try {
    const plugins = Array.from(state.plugins.keys());
    if (plugins.length === 0) {
      return reply("⚠️ Tidak ada plugin yang terdeteksi.");
    }

    const message =
      "📋 *Daftar Fitur yang Tersedia:*\n\n" +
      plugins.map((p, i) => `${i + 1}. ${p}`).join("\n") +
      "\n\nGunakan dengan prefix sesuai konfigurasi bot.";

    await reply(message);
  } catch (err) {
    await reply(`❌ Gagal menampilkan fitur: ${err.message}`);
  }
}