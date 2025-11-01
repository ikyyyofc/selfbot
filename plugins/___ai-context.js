// Nama file: plugins/___ai-context.js

import chat from "../lib/gemini.js"; // pastiin path ini bener
import { aiConversations } from "../lib/aiStore.js"; // tempat kita nyimpen history

export default {
    async execute(context) {
        const { m, reply, sock } = context;

        // Cek kalo ini bukan command, ada quoted message, dari bot, dan ada history chatnya
        const isCommand = (sock.prefix || ".").some(p => m.text.startsWith(p));
        if (isCommand || !m.quoted || !m.quoted.fromMe) {
            return true; // Lanjutin, ini bukan urusan kita
        }

        const conversation = aiConversations.get(m.sender);

        // Kalo ada history DAN user nge-reply pesan AI yang terakhir
        if (conversation && m.quoted.id === conversation.lastMessageId) {
            
            try {
                await m.react("🤔");

                const currentHistory = conversation.history;
                const newHistory = [...currentHistory, { role: "user", content: m.text }];

                const responseText = await chat(newHistory);
                
                const sentMessage = await reply(responseText);
                
                // Update history dengan chat terbaru
                aiConversations.set(m.sender, {
                    history: [...newHistory, { role: "assistant", content: responseText }],
                    lastMessageId: sentMessage.key.id
                });
                
                await m.react("");

            } catch (e) {
                await m.react("❌");
                console.error("AI Context Error:", e);
                await reply(`Waduh, ada error nih dari AI-nya: ${e.message}`);
            }

            return false; // Berhenti di sini, jangan proses command lain
        }

        return true; // Bukan reply ke AI, biarin aja
    }
};