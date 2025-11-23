import os from 'os';
import { performance } from 'perf_hooks';
import { version as baileysVersion } from '@whiskeysockets/baileys';

const config = await import("../config.js").then(m => m.default);

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d} hari`);
    if (h > 0) parts.push(`${h} jam`);
    if (m > 0) parts.push(`${m} menit`);
    if (s > 0) parts.push(`${s} detik`);

    return parts.join(', ');
}

export default {
    name: "speedtest",
    desc: "Menampilkan kecepatan respon bot dan informasi resource.",
    rules: {
        limit: 1
    },
    execute: async (context) => {
        const start = performance.now();

        const used = process.memoryUsage();
        const totalmem = os.totalmem();
        const freemem = os.freemem();
        const cpus = os.cpus();
        const uptime = process.uptime();
        
        const latency = (performance.now() - start).toFixed(2);

        const responseText = `
*💨 Speed Test & Resources 💨*

📈 *Respons:* ${latency} ms

💻 *Info Server:*
- *RAM:* ${formatBytes(totalmem - freemem)} / ${formatBytes(totalmem)}
- *CPU:* ${cpus[0].model} (${cpus.length} core)
- *Platform:* ${os.platform()}

🤖 *Info Bot:*
- *Mode:* ${config.BOT_MODE.toUpperCase()}
- *Database:* ${config.DB_MODE.toUpperCase()}
- *Uptime:* ${formatUptime(uptime)}
- *Plugins:* ${context.state.plugins.size} Commands
- *NodeJS:* ${process.version}
- *Baileys:* v${baileysVersion.join('.')}
        `.trim();

        await context.reply(responseText);
    }
};