import gemini from "../lib/gemini.js";
import { sendInteractiveMessage } from "../lib/button.js";

// In-memory chat history biar dia inget konteks (Context Awareness)
// Key: remoteJid, Value: Array of messages
const chatHistory = new Map();

export default {
    cmd: ["code", "coding", "dev"],
    tag: ["ai"],
    help: ["code <pertanyaan>"],
    
    execute: async (ctx) => {
        const { sock, m, args, text, chat, reply } = ctx;

        // 1. Handle Reset Chat
        if (args[0] === "--reset") {
            chatHistory.delete(chat);
            return reply("♻️ Chat history sama AI coding udah gue reset. Mulai dari nol ya ngab!");
        }

        if (!text) {
            return reply("Kasih prompt kodenya dong. Contoh:\n*.code buatin fungsi login php pake pdo*");
        }

        await m.react("👨‍💻");

        // 2. Manage History
        if (!chatHistory.has(chat)) {
            chatHistory.set(chat, [
                {
                    role: "system",
                    content: `You are an expert coding assistant named Ikyy-Code. 
                    - You support ALL programming languages.
                    - Be concise and efficient. 
                    - Always wrap code output in markdown code blocks like \`\`\`language ... \`\`\`. 
                    - Use casual, cool, and helpful tone (Indonesian slang mixed with English).
                    - If there are multiple files/snippets, separate them clearly.`
                }
            ]);
        }

        const history = chatHistory.get(chat);
        
        // Push user message
        history.push({ role: "user", content: text });

        // Limit history biar ga bloated (max 20 messages)
        if (history.length > 20) {
            // Keep system prompt (index 0), slice the rest
            const newHistory = [history[0], ...history.slice(history.length - 10)];
            chatHistory.set(chat, newHistory);
        }

        try {
            // 3. Call Gemini API (Custom Model: gemini-3-pro-preview)
            // Cek lib/gemini.js support file buffer kalo ada media yg di-quote
            let fileBuffer = null;
            if (ctx.m.quoted && ctx.m.quoted.isMedia) {
                fileBuffer = await ctx.getFile();
            } else if (ctx.m.isMedia) {
                fileBuffer = await ctx.getFile();
            }

            const response = await gemini(history, fileBuffer, "gemini-3-pro-preview");

            if (!response || response.success === false) {
                return reply(`❌ Gagal connect ke brain center. Error: ${response?.msg || "Unknown"}`);
            }

            // Push model response to history
            history.push({ role: "assistant", content: response });

            // 4. Parse Code Blocks for "Copy Code" Buttons
            // Regex buat nangkep content di dalem ``` ```
            const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
            let match;
            const interactiveButtons = [];
            let codeIndex = 1;

            while ((match = codeBlockRegex.exec(response)) !== null) {
                const codeContent = match[1].trim(); // Ini kode murninya doang
                
                // Button Copy Code (limit character biar ga error di header button)
                // Note: copy_code di WA kadang ada limit, tapi kita coba push max.
                interactiveButtons.push({
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: `📋 Copy Code ${codeIndex}`,
                        copy_code: codeContent
                    })
                });
                codeIndex++;
            }

            // Tambahin tombol reset di bawah
            interactiveButtons.push({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "🔄 Reset Context",
                    id: ".code --reset"
                })
            });

            // 5. Send Result
            // Kita pake sendInteractiveMessage dari lib/button.js biar rapi
            await sendInteractiveMessage(sock, chat, {
                text: response, // Penjelasan + Kode visual
                footer: `🧠 Gemini 3 Pro Preview | ${codeIndex - 1} snippet(s) detected`,
                interactiveButtons: interactiveButtons
            }, { quoted: m });

        } catch (error) {
            console.error(error);
            reply("❌ Duh, error nih pas generating code. Coba lagi bentar lagi.");
        }
    }
};
