import os from 'os';
import { exec } from 'child_process';
import db from '../lib/Database.js';
import cooldown from '../lib/CooldownManager.js';
import sessionCleaner from '../lib/SessionCleaner.js';
import groupCache from '../lib/groupCache.js';
import { monitorEmitter } from '../server.js'; 

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatSeconds = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

export default {
    name: 'status',
    desc: 'Menampilkan status dan penggunaan resource bot secara detail.',
    rules: {
        owner: true,
        cooldown: 10
    },
    execute(context) {
        const startTime = Date.now();
        exec('df -h', (err, stdout, stderr) => {
            const diskUsage = err ? `Gagal mengambil data disk: ${stderr}` : stdout.trim();
            const endTime = Date.now();

            const platform = os.platform();
            const arch = os.arch();
            const release = os.release();
            const hostname = os.hostname();
            
            const nodeVersion = process.version;
            const processUptime = process.uptime();
            const systemUptime = os.uptime();
            
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const memoryUsage = process.memoryUsage();
            
            const cpuData = os.cpus();
            
            const loadedPlugins = Array.from(context.state.plugins.keys());
            const pluginManager = context.pluginManager;
            const loadedListeners = pluginManager ? Array.from(pluginManager.listeners.keys()) : [];

            const dbStats = {
                mode: db.mode,
                connected: db.isConnected,
                userCache: db.userCache.size,
                groupCache: db.groupCache.size,
            };

            const cooldownStats = cooldown.getStats();
            const sessionStats = sessionCleaner.getStats();
            const groupCacheStats = groupCache.getStats();

            let response = `*🤖 BOT STATUS & RESOURCES 🤖*\n\n`;
            response += ` merespons dalam *${endTime - startTime} ms*\n\n`;

            response += `*💻 Sistem & Proses:*\n`;
            response += `  - Host: ${hostname}\n`;
            response += `  - Platform: ${platform} (${arch})\n`;
            response += `  - OS Release: ${release}\n`;
            response += `  - Node.js: ${nodeVersion}\n`;
            response += `  - Uptime Bot: ${formatSeconds(processUptime)}\n`;
            response += `  - Uptime Sistem: ${formatSeconds(systemUptime)}\n\n`;

            response += `*🧠 CPU (${cpuData.length} Core):*\n`;
            cpuData.forEach((cpu, i) => {
                const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
                response += `  *Core ${i + 1} | ${cpu.model.split('@')[0].trim()}*\n`;
                response += `    - User: ${(100 * cpu.times.user / total).toFixed(2)}%\n`;
                response += `    - Nice: ${(100 * cpu.times.nice / total).toFixed(2)}%\n`;
                response += `    - System: ${(100 * cpu.times.sys / total).toFixed(2)}%\n`;
                response += `    - Idle: ${(100 * cpu.times.idle / total).toFixed(2)}%\n`;
                response += `    - IRQ: ${(100 * cpu.times.irq / total).toFixed(2)}%\n`;
            });
            response += `\n`;

            response += `*💾 Memori (RAM):*\n`;
            response += `  *Sistem:*\n`;
            response += `    - Total: ${formatBytes(totalMem)}\n`;
            response += `    - Terpakai: ${formatBytes(usedMem)} (${(100 * usedMem / totalMem).toFixed(2)}%)\n`;
            response += `    - Bebas: ${formatBytes(freeMem)}\n`;
            response += `  *Proses Bot:*\n`;
            response += `    - RSS: ${formatBytes(memoryUsage.rss)}\n`;
            response += `    - Heap Total: ${formatBytes(memoryUsage.heapTotal)}\n`;
            response += `    - Heap Used: ${formatBytes(memoryUsage.heapUsed)}\n`;
            response += `    - External: ${formatBytes(memoryUsage.external)}\n\n`;

            response += `*💽 Penggunaan Disk:*\n\`\`\`${diskUsage}\`\`\`\n\n`;

            response += `*🔧 Utilitas & Fitur Internal:*\n`;
            response += `  *Plugin Manager:*\n`;
            response += `    - Perintah: ${loadedPlugins.length} dimuat\n`;
            response += `    - Listener: ${loadedListeners.length} aktif\n`;
            response += `  *Database (${dbStats.mode}):*\n`;
            response += `    - Status: ${dbStats.connected ? 'Terhubung' : 'Terputus'}\n`;
            response += `    - Cache User: ${dbStats.userCache} entri\n`;
            response += `    - Cache Grup: ${dbStats.groupCache} entri\n`;
            response += `  *Cache Grup (groupCache):*\n`;
            response += `    - Status: ${groupCacheStats.initialized ? 'Terinisialisasi' : 'Belum'}\n`;
            response += `    - Grup Dicache: ${groupCacheStats.total}\n`;
            response += `  *Cooldown Manager:*\n`;
            response += `    - Total Cooldown: ${cooldownStats.total}\n`;
            response += `    - Aktif Saat Ini: ${cooldownStats.active}\n`;
            response += `  *Session Cleaner:*\n`;
            response += `    - Ukuran Total: ${sessionStats.totalSizeMB} MB\n`;
            response += `    - Ukuran Dapat Dibersihkan: ${sessionStats.cleanableSizeMB} MB\n`;
            response += `    - File: ${sessionStats.fileCount} (P: ${sessionStats.protectedCount}, C: ${sessionStats.unprotectedCount})\n`;

            context.m.reply(response);
        });
    }
};