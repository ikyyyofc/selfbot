import os from 'os';
import db from '../lib/Database.js';
import groupCache from '../lib/groupCache.js';
import sessionCleaner from '../lib/SessionCleaner.js';
import cooldown from '../lib/CooldownManager.js';
import config from '../config.js';

/**
 * Formats seconds into a human-readable string (d, h, m, s).
 * @param {number} seconds - The total seconds.
 * @returns {string} The formatted uptime string.
 */
function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);

    return parts.join(' ') || '0s';
}

/**
 * Formats bytes into a human-readable string (KB, MB, GB).
 * @param {number} bytes - The number of bytes.
 * @returns {string} The formatted size string.
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
    name: 'status',
    desc: 'Cek kecepatan respons dan status sumber daya bot.',
    rules: {
        limit: 1, // Memberi limit 1 untuk mencegah spam
    },
    async execute(context) {
        const startTime = Date.now();
        const latency = startTime - (context.m.timestamp || startTime);

        // Mengumpulkan data secara paralel jika memungkinkan
        const [users, groups, sessionStats, cooldownStats, groupCacheStats] = await Promise.all([
            db.getAllUsers(),
            db.getAllGroups(),
            sessionCleaner.getStats(),
            cooldown.getStats(),
            groupCache.getStats(),
        ]);

        const memUsage = process.memoryUsage();
        const uptime = process.uptime();
        
        const responseTime = Date.now() - startTime;

        // Menyusun teks respons
        const statusText = `
*🤖 Bot & System Status*

*📊 Performance*
- Latency: *${latency} ms*
- Bot Speed: *${responseTime} ms*

*⚙️ System*
- Uptime: *${formatUptime(uptime)}*
- RAM Usage: *${formatBytes(memUsage.rss)}*
- OS: *${os.type()} (${os.arch()})*
- CPU Model: *${os.cpus()[0].model}*

*📦 Bot Resources*
- Mode: *${config.BOT_MODE.toUpperCase()}*
- DB Mode: *${db.mode.toUpperCase()}*
- Total Users: *${users.length}*
- Total Groups (DB): *${groups.length}*
- Group Cache: *${groupCacheStats.total}*
- Session Size: *${sessionStats.cleanableSizeMB} MB (Cleanable)*
- Active Cooldowns: *${cooldownStats.active}*
- Plugins Loaded: *${context.state.plugins.size} commands*
        `.trim();

        await context.reply(statusText);
    },
};