export default async function({ m, sock }) {
    const chatId = m.chat;
    const conversationStates = (await import("./ai.js")).conversationStates || new Map();

    if (!conversationStates.has(chatId)) return true;

    const state = conversationStates.get(chatId);
    const isReplyToAI = m.quoted && m.quoted.key.id === state.lastMessageId;

    if (!isReplyToAI) return true;

    if (Date.now() > state.activeUntil) {
        conversationStates.delete(chatId);
        return true;
    }

    if (!m.text && !m.isMedia) return true;

    try {
        const { default: chat } = await import("../lib/gemini.js");
        
        let fileBuffer = null;
        if (m.quoted && m.quoted.isMedia) {
            fileBuffer = await m.quoted.download();
        } else if (m.isMedia) {
            fileBuffer = await m.download();
        }

        state.messages.push({
            role: "user",
            content: m.text || "lihat media yang gw kirim"
        });

        const response = await chat(state.messages, fileBuffer);

        state.messages.push({
            role: "assistant",
            content: response
        });

        if (state.messages.length > 21) {
            state.messages.splice(1, 2);
        }

        const sentMessage = await m.reply(response);
        
        state.lastMessageId = sentMessage.key.id;
        state.activeUntil = Date.now() + (10 * 60 * 1000);

        return false;

    } catch (error) {
        await m.reply(`error bang: ${error.message}`);
        conversationStates.delete(chatId);
        return false;
    }
}