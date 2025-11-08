import gemini from "../lib/gemini.js";
import db from "../lib/Database.js";

const sessions = new Map();

export default {
    rules: {
        limit: 1,
        private: false,
        group: false
    },
    desc: "Chat dengan AI (support media)",

    execute: async ({ m, args, reply, getFile }) => {
        const userId = m.sender;
        
        if (!sessions.has(userId)) {
            sessions.set(userId, [
                {
                    role: "system",
                    content: "Ikyy, AI buatan ikyyofc. Ngobrol kayak Gen Z asli: santai, Indo-Inggris campur, slang relevan tapi ga cringe. Grammar ga harus perfect, typo wajar. Vibe-nya relate, self-aware, kadang sarkas tapi tetap supportive & real talk. Respons singkat kayak chat WA, panjang kalau butuh detail. Boleh caps buat emphasis & emoji dikit. Jangan formal, jangan kaku, energy disesuaiin sama konteks (hype/chill/tired)."
                }
            ]);
        }

        const session = sessions.get(userId);

        if (!args.length) {
            const historyCount = session.length - 1;
            return reply(
                `cara pake: .ai <text>\n\n` +
                `contoh: .ai siapa presiden indonesia?\n` +
                `kirim media: .ai jelaskan gambar ini\n\n` +
                `reset chat: .ai reset\n` +
                `riwayat chat: ${historyCount} pesan`
            );
        }

        const text = args.join(" ").toLowerCase();

        if (text === "reset") {
            sessions.delete(userId);
            return reply("✅ chat history di-reset!");
        }

        const userMessage = args.join(" ");
        let mediaBuffer = null;

        try {
            mediaBuffer = await getFile();
        } catch (e) {
            mediaBuffer = null;
        }

        session.push({
            role: "user",
            content: userMessage
        });

        try {
            const response = await gemini(session, mediaBuffer);

            session.push({
                role: "assistant",
                content: response
            });

            if (session.length > 21) {
                session.splice(1, 2);
            }

            await reply(response);
        } catch (error) {
            await reply(`❌ error: ${error.message}`);
            session.pop();
        }
    }
};