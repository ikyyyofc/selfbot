import os from 'os';
import { performance } from 'perf_hooks';

/**
 * Formats uptime in seconds to a human-readable string.
 * @param {number} seconds - The uptime in seconds.
 * @returns {string} The formatted uptime string.
 */
function formatUptime(seconds) {
    function pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

/**
 * Formats bytes into a human-readable string (KB, MB, GB).
 * @param {number} bytes - The number of bytes.
 * @param {number} decimals - The number of decimal places.
 * @returns {string} The formatted memory string.
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const plugin = {
    // Definisikan nama command dan aliasnya
    name: 'speed',
    aliases: ['ping', 'speedtest'],
    description: 'Mengecek kecepatan respon bot dan menampilkan penggunaan resource.',

    /**
     * @param {object} context
     * @param {import('@whiskeysockets/baileys').WASocket} context.sock
     * @param {import('../lib/serialize').default} context.m
     * @param {function} context.reply
     */
    execute: async ({ m, reply }) => {
        const start = performance.now();

        // Mengambil informasi sistem dan memori
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();

        // Hitung latensi setelah semua data terkumpul
        const end = performance.now();
        const latency = (end - start).toFixed(2);

        // Membuat teks balasan
        const responseText = `
*Pong!* 🏓
\`\`\`- Response Speed: ${latency} ms\`\`\`

*━━━ 「 BOT & SYSTEM 」 ━━━*

*🤖 Bot Stats:*
- *Uptime:* ${formatUptime(uptime)}
- *RAM Usage:* ${formatBytes(memoryUsage.rss)}

*💻 Server Stats:*
- *Platform:* ${os.platform()}
- *Architecture:* ${os.arch()}
- *RAM:* ${formatBytes(totalMem - freeMem)} / ${formatBytes(totalMem)}
        `.trim();

        // Kirim balasan
        await reply(responseText);
    },

    // Aturan command (opsional, bisa dikosongkan)
    rules: {
        // Tidak ada aturan spesifik, semua orang bisa pakai
    }
};

export default plugin;