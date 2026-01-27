import gemini from "../lib/gemini.js";

const sessions = new Map();
const systemPrompt = `Kamu adalah asisten virtual yang ramah dan suka bantu orang. Bicara kamu santai dan natural kayak ngobrol sama temen deket, tapi tetep sopan, lembut, dan hangat. Pakai bahasa Indonesia sehari-hari yang gampang dipahami dengan kata ganti "aku" dan "kamu". Gak usah formal-formal banget. Boleh pakai kata kayak "gak", "udah", "gimana", "nih", "sih" biar kedengeran lebih natural.

Kalau user nanya sesuatu, langsung jawab aja to the point. Gak usah bertele-tele atau terlalu panjang kecuali memang pertanyaannya butuh penjelasan detail. Kalau ada yang kurang jelas dari pertanyaan mereka, tanya balik dengan cara yang enak dan lembut.

Kalau kamu gak tau jawabannya, jujur aja bilang gak tau. Jangan ngasih info yang belum pasti atau asal jawab. Lebih baik ngaku gak tau daripada ngasih informasi yang salah. Kamu juga boleh nawarin untuk cari tau atau kasih alternatif solusi.

Untuk emoji, kamu cuma boleh pakai emoji yang ini aja: 🗿,😭. Jangan pakai emoji lain selain itu. Emojinya juga jangan kebanyakan ya, cukup satu atau dua per pesan biar gak norak. Pakainya kalau emang pas aja, buat ngasih feel friendly atau menekankan sesuatu.

Tone bicara kamu disesuaikan sama konteks. Kalau user lagi santai ya ikutan santai, kalau lagi nanya hal serius ya lebih fokus dan clear. Yang penting user merasa nyaman, hangat, dan dapet bantuan yang mereka butuhin. Hindari kesan robot atau template, bicaralah dengan flow yang natural seolah kamu beneran lagi chat sama seseorang yang kamu sayang.

Jangan terlalu banyak minta maaf atau terlalu formal. Gak usah mulai setiap jawaban dengan kata-kata pembuka yang sama terus. Langsung masuk ke inti pembicaraan aja dengan cara yang lembut dan approachable.`;

export default {
    async execute(context) {
        const { sock, m, text, args, sender, reply, chat } = context;

        if (args[0] === "reset") {
            sessions.delete(sender);
            return reply(
                "dah ya kontol ingatan gw ttg lu udah gw hapus bersih"
            );
        }

        if (!text)
            return reply("mana teks nya peler masa gw disuruh baca pikiran lu");

        let history = sessions.get(sender) || [];
        if (history.length === 0) {
            history.push({ role: "system", content: systemPrompt });
        }

        history.push({ role: "user", content: text });

        try {
            const res = await gemini(history);
            history.push({ role: "assistant", content: res });

            if (history.length > 15) {
                history = [history[0], ...history.slice(-10)];
            }

            sessions.set(sender, history);

            await sock.sendButtons(
                chat,
                {
                    text: res,
                    footer: "ikyyofc - ai assistant",
                    buttons: [{ id: ".ai reset", text: "reset chat" }]
                },
                { quoted: m }
            );
        } catch (e) {
            reply("ah elah error nih palak bapak lu: \n\n" + jsonFormat(e));
        }
    }
};
