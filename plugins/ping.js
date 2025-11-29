export default {
    desc: "Mengecek kecepatan respon dan status bot.",
    execute({ m }) {
        const receivedTime = m.timestamp * 1000;
        const currentTime = Date.now();
        const latency = (currentTime - receivedTime) / 1000;

        const uptimeSeconds = process.uptime();

        const d = Math.floor(uptimeSeconds / (3600 * 24));
        const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
        const min = Math.floor((uptimeSeconds % 3600) / 60);
        const sec = Math.floor(uptimeSeconds % 60);

        const uptimeParts = [];
        if (d > 0) uptimeParts.push(`${d} hari`);
        if (h > 0) uptimeParts.push(`${h} jam`);
        if (min > 0) uptimeParts.push(`${min} menit`);
        if (sec > 0) uptimeParts.push(`${sec} detik`);
        const uptimeText = uptimeParts.join(' ') || 'Baru saja dimulai';

        const responseText = `Pong! 🏓\n\n` +
                             `Kecepatan: ${latency.toFixed(3)} detik\n` +
                             `Aktif Selama: ${uptimeText}`;
        
        m.reply(responseText);
    }
};