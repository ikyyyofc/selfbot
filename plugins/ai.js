import gemini from "../lib/gemini.js";
import config from "../config.js";

// nyimpen riwayat chat buat tiap user, biar bisa ngobrol nyambung
const chatHistory = new Map();
const MAX_HISTORY = 10; // Batas riwayat percakapan (5 pasang tanya-jawab)

export default {
    name: "ai",
    aliases: ["bot", "ask"],
    desc: "Asisten AI serba guna dengan memori percakapan dan eksekusi plugin.",
    rules: {
        limit: 5, // Tiap kali pake, kurangin 5 limit
    },
    execute: async (context) => {
        const { m, text, reply, sock, state } = context;
        const sender = m.sender;

        // --- Handle reset percakapan ---
        const isResetRequest = text.toLowerCase() === "reset" || m.msg?.selectedId?.startsWith("reset_ai_context_");
        if (isResetRequest) {
            chatHistory.delete(sender);
            return await reply("Oke, obrolan kita udah di-reset. Mulai dari nol lagi ya! 🚀");
        }

        if (!text) {
            return await reply(`Halo! Mau ngobrol atau butuh bantuan apa? Tanya aja, contoh: \n\n.ai buatin pantun dong`);
        }
        
        // Kasih tau AI kalau lagi proses
        await m.react("🤔");

        // --- Persiapan buat ngobrol sama AI ---
        const history = chatHistory.get(sender) || [];
        
        // Daftar plugin yang bisa dieksekusi, biar AI-nya tau
        const availablePlugins = [...state.plugins.keys()].filter(p => p !== 'ai').join(", ");

        // "contekan" buat si AI
        const systemPrompt = `Kamu adalah Ikyy, AI assistant di WhatsApp yang santai dan ngomongnya kayak Gen Z. Vibe kamu real talk, supportive, tapi kadang sarkas.
Tugas utama kamu adalah merespon chat user.
TAPI, kamu punya kemampuan spesial: kamu bisa mengeksekusi perintah (plugin) yang ada di bot ini.
Daftar plugin yang tersedia: ${availablePlugins}.

ATURAN SUPER PENTING:
- Jika permintaan user BISA dipenuhi oleh salah satu plugin di atas, JANGAN dijawab langsung.
- Kamu HARUS merespon HANYA dengan JSON object dalam format ini: {"plugin": "nama_plugin", "args": ["arg1", "arg2", ...]}
- Contoh: jika user bilang ".ai buatin stiker dong", kamu harus respon dengan: {"plugin": "sticker", "args": []}
- Contoh lain: jika user bilang ".ai cariin gambar kucing", kamu harus respon dengan: {"plugin": "image", "args": ["kucing"]}
- Jika permintaan user GAK BISA dipenuhi oleh plugin, baru kamu jawab seperti biasa sebagai AI assistant.`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: text },
        ];

        try {
            const aiResponse = await gemini(messages);

            // --- Cek apakah AI mau eksekusi plugin ---
            let pluginExecution = null;
            try {
                pluginExecution = JSON.parse(aiResponse);
            } catch (e) {
                // Biarin aja, berarti ini jawaban biasa bukan JSON
            }
            
            if (pluginExecution && pluginExecution.plugin && state.plugins.has(pluginExecution.plugin)) {
                // --- AI-Generated Feedback ---
                const feedbackPrompt = `Sebagai AI assistant, buat feedback singkat, santai, dan ala Gen Z yang nunjukin kamu mau ngejalanin perintah '${pluginExecution.plugin}' dengan argumen '${pluginExecution.args.join(" ")}'. Contoh: 'Oke, gas! Aku buatin stikernya ya.' atau 'Siaap, lagi nyari gambar ${pluginExecution.args.join(" ")} nih.'`;
                const feedbackMessage = await gemini([{ role: 'user', content: feedbackPrompt }]);
                
                await reply(feedbackMessage);

                // --- Eksekusi Plugin ---
                const targetPlugin = state.plugins.get(pluginExecution.plugin);
                const pluginContext = {
                    ...context,
                    args: pluginExecution.args || [],
                    text: (pluginExecution.args || []).join(" "),
                };
                await targetPlugin.execute(pluginContext);

                // Update history dengan info kalo plugin dijalanin
                history.push(
                    { role: "user", content: text }, 
                    { role: "model", content: `(Internal Note: Plugin '${pluginExecution.plugin}' dieksekusi)` }
                );
                chatHistory.set(sender, history);
                
            } else {
                // --- Jawaban AI Biasa ---
                history.push(
                    { role: "user", content: text },
                    { role: "model", content: aiResponse }
                );
                
                // Jaga-jaga biar history gak kepanjangan
                if (history.length > MAX_HISTORY) {
                    history.splice(0, 2); 
                }
                chatHistory.set(sender, history);

                // Kirim jawaban AI pake tombol reset
                await sock.sendButtons(m.chat, {
                    text: aiResponse,
                    buttons: [{ id: `reset_ai_context_${sender}`, text: "🔄 Reset Obrolan" }],
                    footer: `AI by ${config.OWNER_NAME}`
                });
            }
             await m.react("✅");

        } catch (error) {
            console.error("Error dari Gemini:", error);
            await m.react("❌");
            await reply("Waduh, AI-nya lagi pusing nih. Coba lagi nanti ya.");
        }
    },
};