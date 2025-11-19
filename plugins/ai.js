import gemini from "../lib/gemini.js";

// Menyimpan riwayat percakapan untuk setiap chat (key: chatId, value: array messages)
const chatHistories = new Map();

// Helper function untuk mengirim balasan dengan tombol reset
async function sendReplyWithResetButton(sock, chatId, text, quotedMessage) {
    await sock.sendButtons(chatId, {
        text: text,
        buttons: [{
            id: ".ai reset",
            text: "🔄 Reset Konteks"
        }],
        footer: "Ketik '.ai reset' untuk memulai percakapan baru."
    }, {
        quoted: quotedMessage
    });
}

// Helper function untuk eksekusi plugin lain
async function executePlugin(command, args, context) {
    const {
        sock,
        m,
        state
    } = context;
    const plugin = state.plugins.get(command);

    if (!plugin) {
        return m.reply(`Maaf, perintah '${command}' gak ketemu.`);
    }

    console.log(`🤖 AI is executing command: '${command}' with args: [${args.join(", ")}]`);
    await m.reply(`🤖 Oke, aku jalankan perintah *${command}*...`);

    // Membuat konteks baru untuk plugin yang akan dieksekusi
    const newContext = {
        ...context,
        args: args,
        text: args.join(" "),
    };

    // Menjalankan plugin
    try {
        await plugin.execute(newContext);
    } catch (error) {
        console.error(`Error executing plugin '${command}' from AI:`, error);
        await m.reply(`Duh, gagal ngejalanin perintah *${command}*.\nError: ${error.message}`);
    }
}

export default {
    name: "ai",
    aliases: ["iky"],
    desc: "Asisten AI serba guna dengan memori percakapan dan eksekusi plugin.",
    rules: {
        limit: 5 // Menggunakan 5 limit per pemanggilan
    },
    execute: async (context) => {
        const {
            m,
            text,
            sock,
            state
        } = context;
        const chatId = m.chat;

        // Perintah untuk mereset histori
        if (text.toLowerCase() === 'reset') {
            if (chatHistories.has(chatId)) {
                chatHistories.delete(chatId);
                return m.reply("🤖 Konteks percakapan telah di-reset. Kita mulai dari awal, ya!");
            }
            return m.reply("🤖 Gak ada percakapan yang perlu di-reset.");
        }

        if (!text) {
            return m.reply("Mau ngobrol apa atau butuh bantuan apa? Kasih tau aja.\n\nContoh:\n`.ai jelaskan tentang black hole`\n`.ai buatkan stiker` (sambil reply gambar)");
        }

        // Ambil daftar plugin yang tersedia, kecuali plugin 'ai' itu sendiri
        const availablePlugins = Array.from(state.plugins.keys()).filter(p => p !== 'ai');

        // Prompt sistem untuk menginstruksikan AI
        const systemPrompt = `Kamu adalah Ikyy, asisten AI canggih di dalam WhatsApp yang dibuat oleh ikyyofc. Kamu cerdas, santai, dan bisa mengeksekusi perintah.
Daftar perintah yang bisa kamu jalankan: ${availablePlugins.join(', ')}.

TUGAS UTAMA:
1.  Jika user memintamu melakukan sesuatu yang cocok dengan salah satu perintah, balas HANYA dengan format JSON seperti ini: {"command": "nama_perintah", "args": ["argumen1", "argumen2"]}.
    -   Contoh permintaan: "buatkan stiker" -> {"command": "sticker", "args": []}
    -   Contoh permintaan: "cari gambar anjing corgi" -> {"command": "image", "args": ["anjing", "corgi"]}
    -   Contoh permintaan: "download video tiktok ini https://vt.tiktok.com/xxxx" -> {"command": "tiktok", "args": ["https://vt.tiktok.com/xxxx"]}
2.  Jika user hanya bertanya, mengobrol, atau permintaannya tidak cocok dengan perintah mana pun, jawablah pertanyaannya secara natural sebagai asisten AI. JANGAN gunakan format JSON.
3.  Analisa gambar atau media yang dikirim user jika ada, dan gunakan itu sebagai konteks. Jika user mengirim gambar dan bilang "ini apa?", jelaskan gambar itu. Jika dia bilang "buat stiker", eksekusi perintah stiker.
4.  Jaga jawabanmu tetap singkat dan relevan seperti sedang chat.`;


        // Ambil atau buat histori baru
        if (!chatHistories.has(chatId)) {
            chatHistories.set(chatId, [{
                role: 'system',
                content: systemPrompt
            }]);
        }

        const history = chatHistories.get(chatId);
        const userMessage = {
            role: 'user',
            content: text
        };

        // Tambahkan pesan user ke histori
        history.push(userMessage);

        try {
            await m.react("🤖");

            // Cek apakah ada media yang di-reply atau dikirim
            const fileBuffer = await context.getFile();

            // Panggil Gemini API dengan histori dan media (jika ada)
            const aiResponse = await gemini(history, fileBuffer);

            // Simpan balasan AI ke histori
            history.push({
                role: 'assistant',
                content: aiResponse
            });

            // Coba parse respons AI sebagai JSON
            let commandData;
            if (aiResponse.trim().startsWith('{') && aiResponse.trim().endsWith('}')) {
                try {
                    commandData = JSON.parse(aiResponse);
                } catch (e) {
                    // Abaikan jika bukan JSON valid, anggap sebagai teks biasa
                }
            }

            // Jika respons adalah JSON perintah yang valid, eksekusi
            if (commandData && commandData.command && state.plugins.has(commandData.command)) {
                await executePlugin(commandData.command, commandData.args || [], context);
            } else {
                // Jika tidak, kirim sebagai balasan teks biasa dengan tombol reset
                await sendReplyWithResetButton(sock, chatId, aiResponse, m);
            }

            await m.react("✅");

        } catch (error) {
            console.error("AI Plugin Error:", error);
            await m.reply(`Waduh, AI-nya lagi pusing nih, coba lagi nanti ya.\n\nError: ${error.message}`);
            await m.react("❌");
            // Hapus pesan terakhir user dari histori jika terjadi error
            history.pop();
        }
    }
};