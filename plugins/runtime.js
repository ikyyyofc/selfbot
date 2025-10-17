export default async function ({ reply }) {
  try {
    // Hitung uptime dari process.uptime() dalam detik
    const uptime = process.uptime();

    // Ubah jadi format jam, menit, detik
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const text = `🤖 *Bot Uptime:*\n${hours} jam, ${minutes} menit, ${seconds} detik`;
    await reply(text);
  } catch (e) {
    await reply(`❌ Terjadi kesalahan: ${e.message}`);
  }
}