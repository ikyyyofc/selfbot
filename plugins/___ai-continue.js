import gemini from "../lib/gemini.js";

const conversations = new Map();
const lastMessageIds = new Map();

export default async ({ m, sock }) => {
    const userId = m.sender;
    
    if (!m.quoted) return true;
    
    const quotedId = m.quoted.key.id;
    const lastAiMessageId = lastMessageIds.get(userId);
    
    if (quotedId !== lastAiMessageId) return true;
    
    if (!m.text || m.text.startsWith(".")) return true;
    
    if (!conversations.has(userId)) return true;
    
    const conversation = conversations.get(userId);
    
    conversation.push({
        role: "user",
        content: m.text
    });

    try {
        await m.react("🤖");
        
        const response = await gemini(conversation);
        
        conversation.push({
            role: "assistant",
            content: response
        });

        if (conversation.length > 20) {
            conversation.splice(0, conversation.length - 20);
        }

        const sent = await m.reply(response);
        lastMessageIds.set(userId, sent.key.id);
        
        await m.react("");
    } catch (error) {
        console.error("AI continue error:", error.message);
        await m.reply("Error nih, coba lagi");
        await m.react("");
    }
    
    return true;
};