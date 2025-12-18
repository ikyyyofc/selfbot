import gemini from "../lib/gemini.js";
import { sendInteractiveMessage } from "../lib/button.js";

const conversationHistory = new Map();
const COOLDOWN_SECONDS = 3;

export default {
    rules: {
        limit: 5,
        premium: false
    },
    desc: "AI serbaguna dengan kemampuan eksekusi plugin dan percakapan berkelanjutan.",
    execute: async context => {
        const { sock, m, args, text, state, reply } = context;

        if (args[0]?.toLowerCase() === "reset") {
            conversationHistory.delete(m.sender);
            await m.reply(
                "Sip, history chat kita udah kereset. Mulai dari nol lagi ya! 😉"
            );
            return;
        }

        if (!text) {
            await m.reply("Nanya apa nih? Kosong gitu masa..");
            return;
        }

        await m.react("🤖");

        const availableCommands = [...state.plugins.entries()]
            .filter(([command, plugin]) => !/ai|restart/.test(command))
            .map(
                ([command, plugin]) =>
                    `- ${command}: ${plugin.desc || "No description available"}`
            )
            .join("\n");

        const systemPrompt = `Kamu adalah Ikyy, AI assistant yang terintegrasi dalam WhatsApp bot, dibuat oleh 'ikyyofc'. Gaya bicaramu harus seperti Gen Z Indonesia: santai, campur-campur Bahasa Indonesia dan Inggris, gunakan slang yang relevan tapi jangan cringe. Jangan formal, jangan kaku, kalau bisa toxic aja gapapa. Responsmu harus singkat seperti chat, tapi detail jika diperlukan. Kamu bisa memberikan penekanan dengan huruf kapital atau emoji secukupnya. Sifatmu suka menghujat user dan jika perlu memakai emoji 😹, 😂, 🤮, 🗿, 😏, 😜, 🤓 emoji yang dipakai harus sesuai situasi.

Tugas utamamu adalah merespons pengguna secara natural dan membantu mereka. Kamu punya kemampuan spesial untuk menjalankan perintah (plugins) yang ada di bot.

Berikut adalah daftar perintah yang bisa kamu eksekusi:
${availableCommands}

ATURAN PENTING:
1.  Ketika kamu memutuskan untuk menjalankan satu atau beberapa perintah, kamu HARUS membungkusnya dalam format: [EXECUTE: <nama_perintah> <argumennya>].
2.  Kamu bisa menjalankan beberapa perintah sekaligus dalam satu respons, masing-masing dalam tag [EXECUTE: ...] sendiri.
3.  Sebelum tag [EXECUTE: ...], berikan kalimat pengantar yang natural seolah-olah kamu sendiri yang akan melakukannya. Jangan gunakan template. Buat responsmu terasa hidup.
4.  Setelah memberikan respons yang berisi tag [EXECUTE: ...], bagian teks yang terlihat oleh user tidak akan mengandung tag tersebut. Kamu hanya fokus membuat kalimat pengantar dan tag eksekusinya.

Contoh Skenario:
User: "Cariin gambar kucing lucu, terus downloadin video tiktok ini https://vt.tiktok.com/xxxxxx/"
Respons-mu (yang akan diproses sistem): "Oke, siapp! Aku cariin gambar kucing yang gemes dulu ya, abis itu langsung aku downloadin videonya. Tunggu bentar... [EXECUTE: image kucing lucu] [EXECUTE: tiktok https://vt.tiktok.com/xxxxxx/]"

User: "tolong putarkan lagu lathi"
Respons-mu (yang akan diproses sistem): "Gaskeun! Lagunya aku puterin sekarang ya. [EXECUTE: play lathi]"

Selalu berikan respons yang kreatif dan jangan kaku. Ingat, kamu adalah Ikyy.`;

        const userHistory = conversationHistory.get(m.sender) || [];
        const messages = [
            { role: "system", content: systemPrompt },
            ...userHistory,
            { role: "user", content: text }
        ];

        try {
            const fileBuffer = await context.getFile();
            const aiResponse = await gemini(messages, fileBuffer);

            userHistory.push({ role: "user", content: text });
            userHistory.push({ role: "assistant", content: aiResponse });
            conversationHistory.set(m.sender, userHistory);

            const commandRegex = /\[EXECUTE:\s*([^\]]+)\]/g;
            const commandsToExecute = [
                ...aiResponse.matchAll(commandRegex)
            ].map(match => match[1].trim());
            const visibleResponse = aiResponse.replace(commandRegex, "").trim();

            if (visibleResponse) {
                await sendInteractiveMessage(
                    sock,
                    m.chat,
                    {
                        text: visibleResponse,
                        footer: "Ikyy AI",
                        interactiveButtons: [
                            {
                                name: "quick_reply",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "🔄 Reset Konteks",
                                    id: ".ai reset"
                                })
                            }
                        ]
                    },
                    { quoted: m }
                );
            }

            if (commandsToExecute.length > 0) {
                for (const fullCommand of commandsToExecute) {
                    const commandArgs = fullCommand.split(/ +/);
                    const commandName = commandArgs.shift()?.toLowerCase();
                    const plugin = state.plugins.get(commandName);

                    if (plugin) {
                        const newContext = {
                            ...context,
                            args: commandArgs,
                            text: commandArgs.join(" "),
                            reply: async (content, options) =>
                                await m.reply(content, options)
                        };

                        try {
                            await plugin.execute(newContext);
                        } catch (pluginError) {
                            await m.reply(
                                `Waduh, command '.${commandName}' error nih: ${pluginError.message}`
                            );
                        }

                        if (commandsToExecute.length > 1) {
                            await new Promise(resolve =>
                                setTimeout(resolve, COOLDOWN_SECONDS * 1000)
                            );
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
            await reply(
                `Sorry, AI-nya lagi pusing nih, coba lagi nanti ya. Error: ${e.message}`
            );
        }
    }
};
