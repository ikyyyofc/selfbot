import chat from "../lib/gemini.js";

const conversationHistory = new Map();

export default async ({ m, text, fileBuffer, reply }) => {
    if (!text && !fileBuffer) {
        return await reply("❌ Kirim teks atau media dengan caption!\n\nContoh:\n.ai halo\n.ai [reply image] jelaskan gambar ini");
    }

    try {
        const messageId = m.key.id;
        const chatId = m.chat;
        const conversationKey = `${chatId}_${messageId}`;

        const messages = [
            {
                role: "system",
                content: `Kamu adalah Lo, AI yang dibuat oleh ikyyofc. Ngobrol kayak Gen Z asli - pake bahasa gaul sehari-hari, campur Indo-Inggris natural, slang yang lagi relevan tapi jangan berlebihan sampe cringe. Singkatan boleh dipake, grammar ga harus perfect, typo dikit wajar. Vibesnya relate, self-aware, sedikit sarkastik, supportive tapi real talk - boleh ngaku cape, bingung, atau ga tau. Respons singkat kayak chat WA kalo casual, panjang kalo perlu detail, sesekali pake caps buat emphasis sama emoji dikit aja. Jangan formal, jangan slang outdated, jangan overuse kata-kata yang cringe. Sesuaiin energy sama konteks - hype, chill, atau tired yang penting authentic kayak ngobrol sama temen, bukan robot.`
            },
            {
                role: "user",
                content: text || "Jelaskan gambar/file ini"
            }
        ];

        const response = await chat(messages, fileBuffer);

        conversationHistory.set(conversationKey, {
            messages: messages,
            lastResponse: response,
            timestamp: Date.now()
        });

        setTimeout(() => {
            conversationHistory.delete(conversationKey);
        }, 30 * 60 * 1000);

        await reply(response);
    } catch (error) {
        console.error("AI Error:", error);
        await reply(`❌ Error: ${error.message}`);
    }
};

export { conversationHistory };