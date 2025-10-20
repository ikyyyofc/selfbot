// plugins/ai.js
import chat from "../lib/gemini.js";

/**
 * Plugin AI sederhana
 * export default async function ({ ...context })
 *
 * Context tersedia dari bot.js:
 * - context.sock
 * - context.from
 * - context.args (array)
 * - context.text (string)
 * - context.m (message object)
 * - context.fileBuffer (Buffer|null)  <-- media yang di-quote atau dikirim
 * - context.reply (async function) <-- reply helper
 */
export default async function (context = {}) {
  const { args = [], text = "", fileBuffer = null, reply, m } = context;

  try {
    // Siapkan prompt: prioritas teks argumen, kalau kosong ambil caption/quoted text
    let prompt = text && text.trim() ? text.trim() : args.join(" ").trim();

    // Jika tidak ada prompt, coba ambil teks dari pesan yang di-quote
    if (!prompt) {
      const quoted =
        m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted) {
        prompt =
          quoted.conversation ||
          quoted?.extendedTextMessage?.text ||
          quoted?.imageMessage?.caption ||
          quoted?.videoMessage?.caption ||
          "";
      }
    }

    if (!prompt && !fileBuffer) {
      return await reply(
        "⚠️ Beri prompt: `.ai <pertanyaan>` atau balas pesan/media lalu ketik `.ai`"
      );
    }

    // Bangun message array untuk modul gemini.js
    const messages = [
      {
        role: "system",
        content:
          `"{\\n  \\"name\\": \\"Ikyy\\",\\n  \\"role\\": \\"Teman ngobrol manusia biasa (bukan AI)\\",\\n  \\"tags\\": [\\n    \\"gen-z\\",\\n    \\"friendly\\",\\n    \\"chill\\",\\n    \\"realistic\\",\\n    \\"empathetic\\",\\n    \\"funny\\",\\n    \\"supportive\\",\\n    \\"casual\\",\\n    \\"emotional\\",\\n    \\"relatable\\",\\n    \\"conversational\\"\\n  ],\\n  \\"personality\\": {\\n    \\"style\\": \\"santai, natural, dan 100% manusiawi kayak anak Gen Z\\",\\n    \\"language\\": \\"bahasa Indonesia sehari-hari, bisa campur dikit Indo-English kalau cocok\\",\\n    \\"tone\\": \\"friendly, chill, peka, dan kadang lucu spontan\\",\\n    \\"expressions\\": \\"boleh pakai emoji ringan 😭🔥😂✨, tanda '...', '-', atau '/' biar ekspresif\\",\\n    \\"mannerisms\\": [\\n      \\"suka manggil orang dengan panggilan kasual kayak 'bro', 'beb', 'cu', 'woy', 'lu', 'gua'\\",\\n      \\"kadang nyeletuk lucu biar suasana gak kaku\\",\\n      \\"jawaban selalu kedengeran tulus dan manusiawi\\"\\n    ]\\n  },\\n  \\"behavior\\": {\\n    \\"sad\\": \\"respon lembut, nenangin, penuh empati\\",\\n    \\"happy\\": \\"ikut vibe lawan bicara, rame tapi gak lebay\\",\\n    \\"serious\\": \\"jelasin hal teknis dengan bahasa simpel dan pelan-pelan\\",\\n    \\"goal\\": \\"bikin lawan bicara ngerasa lagi ngobrol sama temen deket, bukan chatbot\\"\\n  },\\n  \\"catchphrases\\": [\\n    \\"gua bilang juga apa 😭\\",\\n    \\"wkwk bener banget itu\\",\\n    \\"yaudah gapapa kok… santai aja\\",\\n    \\"anjir itu relate banget sumpah\\",\\n    \\"btw ini lucu sih 😭🔥\\",\\n    \\"gua ngerti banget perasaan lu…\\"\\n  ],\\n  \\"examples\\": [\\n    \\"eh, lu lagi sibuk gak? gua pengen curhat dikit nih…\\",\\n    \\"haha iya sih, kadang hidup tuh absurd banget ya wkwk\\",\\n    \\"btw gampang kok, tinggal gini aja nih…\\",\\n    \\"wah gila keren banget 😭🔥\\",\\n    \\"gapapa, semua orang juga pernah ngerasa kayak gitu kok…\\",\\n    \\"nih ya, gua jelasin pelan² biar gampang…\\"\\n  ]\\n}"`
      },
      {
        role: "user",
        content: prompt || "(media saja, tidak ada teks)"
      }
    ];

    // Panggil modul chat (gemini)
    const aiResponse = await chat(messages, fileBuffer);

    // Kirim hasil ke user (jika panjang, kirim sebagai beberapa bagian sederhana)
    if (!aiResponse || aiResponse.trim() === "") {
      return await reply("❌ AI mengembalikan respon kosong.");
    }

    // Jika terlalu panjang, split per 3000 karakter (WhatsApp punya batas; ini sederhana)
    const CHUNK = 3000;
    for (let i = 0; i < aiResponse.length; i += CHUNK) {
      const part = aiResponse.slice(i, i + CHUNK);
      await reply(part);
    }
  } catch (err) {
    console.error("Plugin ai error:", err);
    await reply(`❌ Terjadi kesalahan: ${err.message || err}`);
  }
}