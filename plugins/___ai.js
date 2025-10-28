import chat from "../lib/gemini.js";
import { conversationHistory } from "./ai.js";

export default async ({ m, reply, fileBuffer }) => {
    if (!m.quoted) return true;

    const quotedMessageId = m.quoted.key.id;
    const chatId = m.chat;
    const conversationKey = `${chatId}_${quotedMessageId}`;

    const conversation = conversationHistory.get(conversationKey);
    if (!conversation) return true;

    if (!m.text && !fileBuffer) return true;

    try {
        await m.react("🤖");

        const newMessages = [
            ...conversation.messages,
            {
                role: "assistant",
                content: conversation.lastResponse
            },
            {
                role: "user",
                content: m.text || "Jelaskan gambar/file ini"
            }
        ];

        const response = await chat(newMessages, fileBuffer);

        const newMessageId = m.key.id;
        const newConversationKey = `${chatId}_${newMessageId}`;

        conversationHistory.set(newConversationKey, {
            messages: newMessages,
            lastResponse: response,
            timestamp: Date.now()
        });

        setTimeout(() => {
            conversationHistory.delete(newConversationKey);
        }, 30 * 60 * 1000);

        await reply(response);
        await m.react("");
        
        return false;
    } catch (error) {
        console.error("AI Continue Error:", error);
        await reply(`❌ Error: ${error.message}`);
        await m.react("");
        return false;
    }
};