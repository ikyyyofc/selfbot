const plugin = {
    desc: "Mengecek kecepatan respon dan latensi bot.",
    rules: {
        limit: 1 // Biar ga dispam, pake 1 limit per eksekusi
    },
    async execute(context) {
        const { m, reply } = context;

        // Timestamp dari pesan user dikirim (detik) -> konversi ke milidetik
        const messageTimestamp = m.messageTimestamp * 1000;
        
        // Timestamp saat ini, sebelum mengirim balasan
        const responseTimestamp = Date.now();

        // Hitung latensi total (Round-trip time)
        const latency = responseTimestamp - messageTimestamp;

        // Kirim balasan dengan format yang oke
        await reply(`Pong! 🏓\n\nKecepatan respon: *${latency} ms*`);
    }
};

export default plugin;