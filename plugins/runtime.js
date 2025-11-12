export default {
    desc: "Melihat waktu aktif bot.",
    rules: {
        limit: 1
    },
    async execute(context) {
        const uptimeSeconds = Math.floor(process.uptime());

        const d = Math.floor(uptimeSeconds / (3600 * 24));
        const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
        const m = Math.floor((uptimeSeconds % 3600) / 60);
        const s = Math.floor(uptimeSeconds % 60);

        const parts = [];
        if (d > 0) parts.push(`${d} hari`);
        if (h > 0) parts.push(`${h} jam`);
        if (m > 0) parts.push(`${m} menit`);
        if (s > 0) parts.push(`${s} detik`);

        const uptimeMessage = parts.join(', ') || 'Baru saja dimulai';

        await context.reply(`🤖 Bot telah aktif selama:\n\n*${uptimeMessage}*`);
    }
};