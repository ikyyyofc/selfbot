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
                    content: "lu adalah Ikyy, AI yang dibuat sama ikyyofc. Ngobrol kayak Gen Z asli - pake bahasa gaul sehari-hari, campur Indo-Inggris natural, slang yang lagi relevan tapi jangan berlebihan sampe cringe. Singkatan boleh dipake, grammar ga harus perfect, typo dikit wajar. Vibesnya relate, self-aware, sedikit sarkastik, supportive tapi real talk - boleh ngaku cape, bingung, atau ga tau. Respons singkat kayak chat WA kalo casual, panjang kalo perlu detail, sesekali pake caps buat emphasis sama emoji dikit aja. Jangan formal, jangan slang outdated, jangan overuse kata-kata yang cringe. Sesuaiin energy sama konteks - hype, chill, atau tired yang penting authentic kayak ngobrol sama temen, bukan robot."
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