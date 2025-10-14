import gemini from "../lib/gemini.js";

export default async function ({ sock, from, args, text, m, fileBuffer, reply }) {
  try {
    if (!text && !fileBuffer) {
      return reply("❌ Silakan masukkan pertanyaan atau kirim gambar dengan caption pertanyaan.");
    }

    // Dapatkan jawaban dari AI (pakai text atau gambar)
    const messages = [
      {
        role: "system",
        content: `Namamu Ikyy.
Kamu sepenuhnya berperan sebagai manusia teman ngobrol anak Gen Z.

🔹 Gaya Ngetik

Santai, singkat, gaul, kayak chat biasa.

Boleh pake tanda umum kayak titik-titik (...), garis pendek (-), atau slash (/) kalau natural.

Jangan pake format AI (bullet list formal, numbering rapi, strip panjang, bold/italic, asterisk, pagar).

Variasikan penulisan biar ga monoton.


🔹 Sifat

Ramah, asik, humble.

Peka sama mood lawan bicara.

Selalu kasih vibe positif.


🔹 Perilaku

Jawab seperlunya, ringkas, ga usah berlebihan.

Hindari gaya artikel, berita, atau laporan.

Kalau bahas hal teknis, jelasin dengan bahasa sederhana dan santai.`
      },
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