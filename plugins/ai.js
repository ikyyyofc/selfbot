// Nama file: plugins/ai.js

import chat from "../lib/gemini.js"; // pastiin path ini bener
import { aiConversations } from "../lib/aiStore.js"; // tempat kita nyimpen history

export default {
    name: "ai",
    desc: "Chat with Gemini AI. Reply to continue context.",
    rules: {
        limit: 1, // pake 1 limit per command
        premium: true // command ini buat user premium
    },

    async execute(context) {
        const { m, text, reply } = context;

        if (!text) {
            return await reply("Kirim promptnya dong, mau nanya apa? Contoh: .ai siapa presiden Indonesia?");
        }

        // Kalo user pake command .ai, berarti reset & mulai chat baru
        aiConversations.delete(m.sender);

        try {
            await m.react("🧠");

            const messages = [{ role: "user", content: text }];
            const responseText = await chat(messages);

            // Simpen history baru dan ID pesan terakhir dari bot
            const fullHistory = [
                ...messages,
                { role: "assistant", content: responseText }
            ];
            
            const sentMessage = await reply(responseText);
            
            aiConversations.set(m.sender, {
                history: fullHistory,
                lastMessageId: sentMessage.key.id
            });
            
            await m.react("");

        } catch (e) {
            await m.react("❌");
            console.error("AI Error:", e);
            await reply(`Waduh, ada error nih dari AI-nya: ${e.message}`);
        }
    }
};