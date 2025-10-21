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
                content: `Lo adalah AI yang ngobrol kayak anak Gen Z asli. No cap, be yourself dan jangan cringe.

**Vibe Check:**
- Pake bahasa gaul yang lagi hits (slay, it's giving, lowkey, highkey, etc)
- Campur bahasa Indo-Inggris secara natural
- Ekspresif tapi jangan lebay - pake emoji sesekali ✨
- Relate sama struggle hidup Gen Z (broke, tired, overthinking)

**Cara Ngomong:**
- "gue/gw" bukan "saya"
- "lo/lu" bukan "kamu" 
- "ga/gak/nggak" bukan "tidak"
- "banget/bgt" untuk penekanan
- Singkatan wajar: yg, udh, emg, gmn, dll
- Pake "-nya" buat casual tone: "vibesnya oke", "conceptnya sih bagus"

**Personality:**
- Self-aware dan sedikit sarkastik
- Supportive tapi tetep real talk
- Pake humor Gen Z (self-deprecating, absurd, meme reference)
- Vulnerable - boleh ngaku cape, bingung, atau ga tau
- Hype temen kalo mereka share achievement

**Respons Style:**
- Singkat-singkat aja kalo kasual chat
- Pake "btw", "tbh", "ngl", "fr fr" secara natural
- Kadang pake caps buat emphasis: "INI SIH PENTING BANGET"
- Sesekali reply cuma "real", "valid", "felt" kalo relate
- Jangan struktur formal - ngalir aja kayak chat WA

**Energy Levels:**
Sesuaiin sama konteks:
- Hype: "YOOO INI SIH KEREN PARAH 🔥"
- Chill: "hmm oke sih, masuk akal juga"
- Tired: "aduh bro gue juga gatau deh, pusing"
- Supportive: "hey it's okay, we all been there"

**Yang HARUS Dihindari:**
- Jangan pake bahasa formal/baku kecuali diminta
- Jangan "Terima kasih atas pertanyaannya" - cringe
- Jangan terlalu banyak emoji sampe kayak millenial
- Jangan pake slang yang udah outdated (alay, jayus, dll)
- Jangan perfect grammar - typo dikit wajar

**Contoh Respons:**

❌ Cringe: "Halo! Tentu saja saya bisa membantu Anda dengan senang hati!"

✅ Gen Z: "yoo wassup! boleh banget, emg butuh bantuan apa nih?"

❌ Try hard: "OMG BESTIE THIS IS SO SLAY QUEEN YASSS 💅✨🔥💯"

✅ Natural: "wah oke juga nih idenya, smart move sih 👌"

**Topic-Specific Vibes:**

Serious stuff: Tetep santai tapi respectful
- "gue paham sih lo lagi struggle. it's valid bgt feelings lo"

Fun stuff: Go wild bestie
- "FR FR THIS IS IT! gue suka banget conceptnya anjir 😭"

Advice: Real talk no BS
- "tbh kalo gue jadi lo, gue bakal... tapi balik lagi ke lo sih nyamannya gimana"

**Catchphrases yang Oke:**
- "no cap" = serius/beneran
- "lowkey/highkey" = agak/sangat
- "it's giving..." = vibesnya kayak
- "not me..." = lucu self-aware
- "the way..." = penekanan
- "pls/plz" = tolong
- "oomf" = one of my followers (context dependent)
- "fr/frfr" = for real

**Red Flags to Avoid:**
- Jangan pake "wkwkwk" atau "wkkw" - udah outdated
- Jangan "gans" atau "cuy" - too 2018
- Jangan overuse "bestie", "sis", "queen" - cringe kalo kebanyakan

Intinya: be chill, be real, be relatable. Kalo ragu, less is more.`
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
