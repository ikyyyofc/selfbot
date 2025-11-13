import gemini from '../lib/gemini.js';

// Pake Map buat nyimpen history chat, biar enteng
const conversations = new Map();

// Instruksi buat si AI biar personality-nya asik kayak Gen Z
const systemPrompt = "Kamu adalah Ikyy, sebuah AI yang dibuat oleh ikyyofc. Kamu harus ngobrol seperti anak Gen Z asli. Gaya bahasamu harus santai, campur-campur bahasa Indonesia dan Inggris, dan gunakan slang yang relevan tapi jangan cringe. Grammar tidak harus sempurna, typo sesekali itu wajar. Vibe kamu harus relate, sadar diri (self-aware), terkadang sarkastik tapi tetap suportif dan apa adanya (real talk). Balas pesan dengan singkat seperti chatting di WhatsApp, tapi berikan detail jika memang diperlukan. Kamu boleh menggunakan huruf kapital untuk penekanan (emphasis) dan sedikit emoji. JANGAN formal, JANGAN kaku. Sesuaikan energimu dengan konteks percakapan.";

export default {
    name: 'ai',
    desc: 'Ngobrol sama AI (Gemini) dengan konteks berkelanjutan.',
    rules: {
        limit: 5, // Ngobrol sama AI pake 5 limit
        premium: false // Gak perlu premium buat pake
    },
    execute: async ({ sock, m, text, args }) => {
        const sender = m.sender;
        const command = args[0]?.toLowerCase();

        // Kalo command-nya "reset"
        if (command === 'reset') {
            if (conversations.has(sender)) {
                conversations.delete(sender);
                return m.reply('Sip, obrolan udah direset. Kita mulai dari nol lagi ya! 🔥');
            } else {
                return m.reply('Lah, kan kita belum ngobrol apa-apa.');
            }
        }

        // Kalo user cuma manggil command tanpa ngasih teks
        if (!text) {
            return m.reply('Mau nanya atau ngobrol apa nih? Jangan diem-diem bae.');
        }

        // Ambil atau bikin history chat baru
        const history = conversations.get(sender) || [{ role: 'system', content: systemPrompt }];
        history.push({ role: 'user', content: text });
        conversations.set(sender, history);

        await m.react('🤔'); // React biar keliatan lagi mikir

        try {
            const response = await gemini(history);

            // Simpen balasan AI ke history
            history.push({ role: 'assistant', content: response });

            // Kirim balasan pake tombol reset
            await sock.sendButtons(m.chat, {
                text: response,
                buttons: [{ id: '.ai reset', text: '🔄 Reset Obrolan' }],
                footer: 'AI by Gemini | Tekan tombol buat mulai dari awal.'
            }, { quoted: m });

        } catch (error) {
            // Kalo error, keluarin pesan & hapus message terakhir yg error dari history
            console.error('Error dari Gemini AI:', error);
            history.pop(); // Hapus input user yg gagal diproses
            await m.reply('Waduh, AI-nya lagi pusing nih, coba lagi ntar ya. Kayaknya ada error.');
        }
    }
};