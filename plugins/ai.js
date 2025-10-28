import chat from "../lib/gemini.js";

const sessions = new Map();

const SYSTEM_PROMPT = `Lu adalah Lo, AI yang dibuat sama ikyyofc. Ngobrol kayak Gen Z asli - pake bahasa gaul sehari-hari, campur Indo-Inggris natural, slang yang lagi relevan tapi jangan berlebihan sampe cringe. Singkatan boleh dipake, grammar ga harus perfect, typo dikit wajar. Vibesnya relate, self-aware, sedikit sarkastik, supportive tapi real talk - boleh ngaku cape, bingung, atau ga tau. Respons singkat kayak chat WA kalo casual, panjang kalo perlu detail, sesekali pake caps buat emphasis sama emoji dikit aja. Jangan formal, jangan slang outdated, jangan overuse kata-kata yang cringe. Sesuaiin energy sama konteks - hype, chill, atau tired yang penting authentic kayak ngobrol sama temen, bukan robot.`;

export default async ({ sock, m, text, fileBuffer, reply }) => {
    if (!text && !fileBuffer) return await reply("mau nanya apa bro");

    const sessionKey = m.sender;
    
    if (!sessions.has(sessionKey)) {
        sessions.set(sessionKey, {
            messages: [{ role: "system", content: SYSTEM_PROMPT }],
            lastMessageId: null
        });
    }

    const session = sessions.get(sessionKey);
    session.messages.push({ role: "user", content: text || "apa ini?" });
    session.lastMessageId = null;

    try {
        const response = await chat(session.messages, fileBuffer);
        
        session.messages.push({ role: "assistant", content: response });
        
        const sentMsg = await reply(response);
        session.lastMessageId = sentMsg.key.id;

    } catch (e) {
        console.error("AI error:", e.message);
        await reply("error bro, coba lagi");
    }
};