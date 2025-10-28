import chat from "../lib/gemini.js";

const conversationStates = new Map();

const SYSTEM_PROMPT = {
    role: "system",
    content: "Lu adalah Lo, AI yang dibuat sama ikyyofc. Ngobrol kayak Gen Z asli - pake bahasa gaul sehari-hari, campur Indo-Inggris natural, slang yang lagi relevan tapi jangan berlebihan sampe cringe. Singkatan boleh dipake, grammar ga harus perfect, typo dikit wajar. Vibesnya relate, self-aware, sedikit sarkastik, supportive tapi real talk - boleh ngaku cape, bingung, atau ga tau. Respons singkat kayak chat WA kalo casual, panjang kalo perlu detail, sesekali pake caps buat emphasis sama emoji dikit aja. Jangan formal, jangan slang outdated, jangan overuse kata-kata yang cringe. Sesuaiin energy sama konteks - hype, chill, atau tired yang penting authentic kayak ngobrol sama temen, bukan robot."
};

export default async function({ m, text, fileBuffer, reply }) {
    const chatId = m.chat;
    const messageId = m.key.id;

    if (!conversationStates.has(chatId)) {
        conversationStates.set(chatId, {
            messages: [SYSTEM_PROMPT],
            lastMessageId: null,
            activeUntil: null
        });
    }

    const state = conversationStates.get(chatId);
    const isReplyToContinue = m.quoted && m.quoted.key.id === state.lastMessageId;

    if (!text && !fileBuffer) {
        return await reply("mau ngomong apa sih? kasih text atau media dong");
    }

    try {
        if (isReplyToContinue) {
            state.messages.push({
                role: "user",
                content: text || "lihat media yang gw kirim"
            });
        } else {
            state.messages = [SYSTEM_PROMPT];
            state.messages.push({
                role: "user", 
                content: text || "lihat media yang gw kirim"
            });
        }

        const response = await chat(state.messages, fileBuffer);

        state.messages.push({
            role: "assistant",
            content: response
        });

        if (state.messages.length > 21) {
            state.messages.splice(1, 2);
        }

        const sentMessage = await reply(response);
        
        state.lastMessageId = sentMessage.key.id;
        state.activeUntil = Date.now() + (10 * 60 * 1000);

        setTimeout(() => {
            const currentState = conversationStates.get(chatId);
            if (currentState && Date.now() >= currentState.activeUntil) {
                conversationStates.delete(chatId);
            }
        }, 10 * 60 * 1000);

    } catch (error) {
        await reply(`error bang: ${error.message}`);
        conversationStates.delete(chatId);
    }
}