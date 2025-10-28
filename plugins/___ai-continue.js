// plugins/___ai_listener.js

import chat from "../lib/gemini.js";

const conversationStore = new Map();

const SYSTEM_PROMPT = `Lu adalah Lo, AI yang dibuat sama ikyyofc. Ngobrol kayak Gen Z asli - pake bahasa gaul sehari-hari, campur Indo-Inggris natural, slang yang lagi relevan tapi jangan berlebihan sampe cringe. Singkatan boleh dipake, grammar ga harus perfect, typo dikit wajar. Vibesnya relate, self-aware, sedikit sarkastik, supportive tapi real talk - boleh ngaku cape, bingung, atau ga tau. Respons singkat kayak chat WA kalo casual, panjang kalo perlu detail, sesekali pake caps buat emphasis sama emoji dikit aja. Jangan formal, jangan slang outdated, jangan overuse kata-kata yang cringe. Sesuaiin energy sama konteks - hype, chill, atau tired yang penting authentic kayak ngobrol sama temen, bukan robot.`;

export default async ({ m, reply, fileBuffer }) => {
    try {
        if (!m.quoted) return true;

        const conversationKey = `${m.chat}_${m.sender}`;
        
        if (!conversationStore.has(conversationKey)) {
            return true;
        }

        const conversation = conversationStore.get(conversationKey);

        if (m.quoted.key.id !== conversation.lastMessageId) {
            return true;
        }

        if (!m.quoted.fromMe) {
            return true;
        }

        const currentTime = Date.now();
        if (currentTime - conversation.timestamp > 30 * 60 * 1000) {
            conversation.messages = [{ role: "system", content: SYSTEM_PROMPT }];
            conversationStore.set(conversationKey, conversation);
            return true;
        }

        if (!m.text && !fileBuffer) {
            return true;
        }

        conversation.messages.push({
            role: "user",
            content: m.text || "tolong jelasin gambar/file ini"
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

        return false;

    } catch (error) {
        console.error("AI listener error:", error);
        await reply("error bro: " + error.message);
        return false;
    }
};