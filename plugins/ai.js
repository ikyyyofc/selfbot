import gemini from "../lib/gemini.js";

const conversations = new Map();

export default async ({ sock, m, args, text, fileBuffer, reply }) => {
    const userId = m.sender;
    
    if (!conversations.has(userId)) {
        conversations.set(userId, []);
    }

    const conversation = conversations.get(userId);
    
    if (!text && !fileBuffer) {
        return reply("Lu mau nanya apa?");
    }

    const userMessage = text || "Ini gambarnya gimana?";
    
    conversation.push({
        role: "user",
        content: userMessage
    });

    try {
        await m.react("🤖");
        
        const response = await gemini(conversation, fileBuffer);
        
        conversation.push({
            role: "assistant",
            content: response
        });

        if (conversation.length > 20) {
            conversation.splice(0, conversation.length - 20);
        }

        await reply(response);
        await m.react("");
    } catch (error) {
        console.error("AI error:", error.message);
        await reply("Waduh error nih, coba lagi deh");
        await m.react("");
    }
};