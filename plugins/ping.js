import { performance } from "perf_hooks";

export default {
    desc: "Mengecek kecepatan respon bot.",
    rules: {
        limit: 1 // Biar ga di-spam, kita kasih limit 1
    },
    execute: async ({ sock, m }) => {
        // Timestamp sebelum pesan dikirim
        const start = performance.now();

        // Kirim pesan awal untuk diukur & mendapatkan message key
        const sentMsg = await sock.sendMessage(m.chat, { text: "Pong!" });

        // Timestamp setelah pesan berhasil dikirim
        const end = performance.now();

        // Hitung selisih waktu dan format ke dua angka desimal
        const latency = (end - start).toFixed(2);

        // Edit pesan awal dengan hasil kecepatan respons
        await sock.sendMessage(m.chat, {
            text: `${latency} ms`,
            edit: sentMsg.key
        });
    }
};