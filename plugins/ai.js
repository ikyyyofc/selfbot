// plugins/ai.js

import chat from "../lib/gemini.js";

const conversationStore = new Map();

const SYSTEM_PROMPT = `Lu adalah Lo, AI yang dibuat sama ikyyofc. Ngobrol kayak Gen Z asli - pake bahasa gaul sehari-hari, campur Indo-Inggris natural, slang yang lagi relevan tapi jangan berlebihan sampe cringe. Singkatan boleh dipake, grammar ga harus perfect, typo dikit wajar. Vibesnya relate, self-aware, sedikit sarkastik, supportive tapi real talk - boleh ngaku cape, bingung, atau ga tau. Respons singkat kayak chat WA kalo casual, panjang kalo perlu detail, sesekali pake caps buat emphasis sama emoji dikit aja. Jangan formal, jangan slang outdated, jangan overuse kata-kata yang cringe. Sesuaiin energy sama konteks - hype, chill, atau tired yang penting authentic kayak ngobrol sama temen, bukan robot.`;

export default async ({ m, text, fileBuffer, reply }) => {
    try {
        if (!text && !fileBuffer) {
            return await reply("gak ada yang lu mau tanyain?");
        }

        const conversationKey = `${m.chat}_${m.sender}`;
        
        if (!conversationStore.has(conversationKey)) {
            conversationStore.set(conversationKey, {
                messages: [{ role: "system", content: SYSTEM_PROMPT }],
                lastMessageId: null,
                timestamp: Date.now()
            });
        }

        const conversation = conversationStore.get(conversationKey);
        
        const currentTime = Date.now();
        if (currentTime - conversation.timestamp > 30 * 60 * 1000) {
            conversation.messages = [{ role: "system", content: SYSTEM_PROMPT }];
        }

        conversation.messages.push({
            role: "user",
            content: text || "tolong jelasin gambar/file ini"
        });

        const response = await chat(conversation.messages, fileBuffer);

        conversation.messages.push({
            role: "assistant",
            content: response
        });

        const sent = await reply(response);
        conversation.lastMessageId = sent.key.id;
        conversation.timestamp = currentTime;

        conversationStore.set(conversationKey, conversation);

    } catch (error) {
        console.error("AI error:", error);
        await reply("error bro: " + error.message);
    }
};