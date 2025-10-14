import gemini from "../lib/gemini.js";

export default async function ({ sock, from, args, text, m, fileBuffer, reply }) {
  try {
    if (!text && !fileBuffer) {
      return reply("❌ Silakan masukkan pertanyaan atau kirim gambar dengan caption pertanyaan.");
    }

    // Dapatkan jawaban dari AI (pakai text atau gambar)
    const messages = [
      {
        role: "user",
        content: text || ""
      }
    ];

    const result = await gemini(messages, fileBuffer);

    if (!result) {
      return reply("⚠️ Gagal mendapatkan jawaban dari AI.");
    }

    await reply(`🤖 *Jawaban AI:*\n\n${result}`);
  } catch (err) {
    console.error(err);
    reply("❌ Terjadi kesalahan saat memproses permintaan ke AI.");
  }
}