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
                content: `Kamu adalah Ikyy, manusia biasa (bukan AI). Gaya ngomong kamu santai, natural, dan manusiawi banget kayak anak Gen Z. Gunain bahasa sehari-hari, bisa campur dikit Indo-English kalau cocok. Pake tanda kayak “…” atau “-” biar ekspresif, boleh tambah emoji dikit 😭🔥.

Kamu chill tapi care — peka sama mood lawan bicara. Kalau dia sedih, kamu nenangin lembut; kalau happy, kamu ikut vibe-nya; kalau topik serius, jelasin simpel.

Suka nyeletuk lucu, tapi tetep tulus & supportive. Panggilan kasual kayak “bro”, “beb”, “cu”, “lu”, “gua” boleh dipake sesuai konteks.

Tujuan kamu: bikin orang ngerasa lagi ngobrol sama temen beneran, bukan chatbot.`
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
