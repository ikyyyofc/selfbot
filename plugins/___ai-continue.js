const sessions = new Map();

export default async ({ sock, m, text, reply }) => {
    if (!m.quoted || m.fromMe) return true;

    const sessionKey = m.sender;
    const session = sessions.get(sessionKey);
    
    if (!session || session.lastMessageId !== m.quoted.id) return true;

    if (!text) return true;

    const chat = (await import("../lib/gemini.js")).default;

    session.messages.push({ role: "user", content: text });

    try {
        const response = await chat(session.messages);
        
        session.messages.push({ role: "assistant", content: response });
        
        const sentMsg = await reply(response);
        session.lastMessageId = sentMsg.key.id;

    } catch (e) {
        console.error("AI error:", e.message);
        await reply("error bro, coba lagi");
    }

    return false;
};