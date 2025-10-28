import chat from "../lib/gemini.js";

let conversationHistory;

try {
    const aiModule = await import("./ai.js");
    conversationHistory = aiModule.conversationHistory;
} catch (error) {
    console.error("Failed to import conversationHistory:", error);
    conversationHistory = new Map();
}

export default async ({ m, reply, fileBuffer }) => {
    if (!m.quoted) return true;
    if (!m.quoted.fromMe) return true;
    if (!m.text && !fileBuffer) return true;

    const quotedMessageId = m.quoted.key.id;
    const chatId = m.chat;
    const conversationKey = `${chatId}_${quotedMessageId}`;

    console.log(`🔍 Looking for conversation: ${conversationKey}`);
    console.log(`📚 Available conversations: ${Array.from(conversationHistory.keys()).join(", ")}`);

    const conversation = conversationHistory.get(conversationKey);
    if (!conversation) {
        console.log(`❌ Conversation not found`);
        return true;
    }

    console.log(`✅ Found conversation, continuing...`);

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

        const sentMsg = await reply(response);
        const botMessageId = sentMsg.key.id;
        const newConversationKey = `${chatId}_${botMessageId}`;

        conversationHistory.set(newConversationKey, {
            messages: newMessages,
            lastResponse: response,
            timestamp: Date.now(),
            botMessageId: botMessageId
        });

        console.log(`💾 Saved new conversation: ${newConversationKey}`);

        await m.react("");
        
        return false;
    } catch (error) {
        console.error("AI Continue Error:", error);
        await reply(`❌ Error: ${error.message}`);
        await m.react("");
        return false;
    }
};