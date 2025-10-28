import chat from "../lib/gemini.js";

let conversationHistory;

try {
    const aiModule = await import("./ai.js");
    conversationHistory = aiModule.conversationHistory;
} catch (error) {
    console.error("Failed to import conversationHistory:", error);
    conversationHistory = new Map();
}

export default async ({ m, reply, fileBuffer, text }) => {
    if (!m.quoted) return true;
    if (!m.quoted.fromMe) return true;
    
    const config = await import("../config.js").then(mod => mod.default);
    const prefixes = config.PREFIX || ["."];
    const hasPrefix = prefixes.some(p => (m.text || "").startsWith(p));
    if (hasPrefix) return true;
    
    if (!m.text && !fileBuffer) return true;

    const quotedMessageId = m.quoted.key.id;
    const chatId = m.chat;
    const conversationKey = `${chatId}_${quotedMessageId}`;

    console.log(`🔍 Checking conversation: ${conversationKey}`);
    console.log(`📚 Total conversations: ${conversationHistory.size}`);
    
    const conversation = conversationHistory.get(conversationKey);
    if (!conversation) {
        console.log(`❌ Not an AI conversation`);
        return true;
    }

    console.log(`✅ Continuing AI conversation...`);

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

        console.log(`💾 Saved continuation: ${newConversationKey}`);

        await m.react("");
        
        return false;
    } catch (error) {
        console.error("AI Continue Error:", error);
        await reply(`❌ Error: ${error.message}`);
        await m.react("");
        return false;
    }
};