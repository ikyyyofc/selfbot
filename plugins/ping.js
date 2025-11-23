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
        const sentMsg = await sock.sendMessage(m.chat, { text: `Pong! \n\n${(performance.now() - start).toFixed(2)} ms` });
    }
};