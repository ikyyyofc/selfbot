import os from 'os';
import util from 'util';
import { exec } from 'child_process';

const execPromise = util.promisify(exec);

/**
 * Konversi byte ke format yang lebih mudah dibaca (KB, MB, GB, etc.)
 * @param {number} bytes - Ukuran dalam byte
 * @returns {string}
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Konversi detik ke format durasi (hari, jam, menit, detik)
 * @param {number} seconds - Durasi dalam detik
 * @returns {string}
 */
function formatUptime(seconds) {
    function pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);

    let result = '';
    if (d > 0) result += d + ' hari, ';
    if (h > 0) result += h + ' jam, ';
    if (m > 0) result += m + ' menit, ';
    result += s + ' detik';
    return result;
}

export default {
    desc: 'Mengecek spesifikasi lengkap server dan penggunaan resource.',
    rules: {
        owner: true,
        private: false,
        group: false
    },
    execute: async (context) => {
        await context.m.react("⚙️");
        
        try {
            // --- OS & System Info ---
            const platform = os.platform();
            const release = os.release();
            const arch = os.arch();
            const hostname = os.hostname();
            const systemUptime = os.uptime();
            let osName = os.type();

            if (platform === 'linux') {
                try {
                    const { stdout } = await execPromise('cat /etc/os-release');
                    const prettyName = stdout.match(/PRETTY_NAME="([^"]+)"/);
                    if (prettyName && prettyName[1]) {
                        osName = prettyName[1];
                    }
                } catch (e) {
                    // Biarin, pake os.type() aja kalo gagal
                }
            }
            
            // --- CPU Info ---
            const cpus = os.cpus();
            const cpuModel = cpus[0].model;
            const cpuCores = cpus.length;
            const cpuSpeed = (cpus[0].speed / 1000).toFixed(2);
            const loadAvg = os.loadavg().map(load => load.toFixed(2)).join(', ');

            // --- Memory Info ---
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const memoryUsage = (usedMem / totalMem * 100).toFixed(2);

            // --- Disk Info ---
            let diskInfo = 'N/A';
            try {
                const { stdout } = await execPromise('df -h /');
                const lines = stdout.trim().split('\n');
                if (lines.length > 1) {
                    const parts = lines[1].split(/\s+/);
                    diskInfo = `Total: ${parts[1]}, Used: ${parts[2]} (${parts[4]}), Free: ${parts[3]}`;
                }
            } catch (e) {
                diskInfo = 'Gagal mendapatkan info disk';
            }

            // --- Node.js & Bot Process Info ---
            const nodeVersion = process.version;
            const botUptime = process.uptime();
            const botMemory = process.memoryUsage();
            
            let response = `*🤖 Spesifikasi & Status Server Lengkap ⚙️*\n\n`;
            
            response += `*💻 SYSTEM & OS*\n`;
            response += `› Hostname: ${hostname}\n`;
            response += `› OS: ${osName}\n`;
            response += `› Platform: ${platform}\n`;
            response += `› Kernel: ${release}\n`;
            response += `› Arsitektur: ${arch}\n`;
            response += `› Uptime: ${formatUptime(systemUptime)}\n\n`;

            response += `*🧠 CPU (Central Processing Unit)*\n`;
            response += `› Model: ${cpuModel}\n`;
            response += `› Cores: ${cpuCores} Core\n`;
            response += `› Speed: ${cpuSpeed} GHz\n`;
            response += `› Load Avg (1, 5, 15m): ${loadAvg}\n\n`;

            response += `*💾 MEMORY (RAM)*\n`;
            response += `› Total: ${formatBytes(totalMem)}\n`;
            response += `› Used: ${formatBytes(usedMem)} (${memoryUsage}%)\n`;
            response += `› Free: ${formatBytes(freeMem)}\n\n`;
            
            response += `*💽 STORAGE (Disk)*\n`;
            response += `› Filesystem (/): ${diskInfo}\n\n`;
            
            response += `*▶️ NODE.JS & BOT PROCESS*\n`;
            response += `› Node.js Version: ${nodeVersion}\n`;
            response += `› Bot Uptime: ${formatUptime(botUptime)}\n`;
            response += `› Memory Usage (Bot):\n`;
            response += `  ├─ RSS: ${formatBytes(botMemory.rss)} _(Resident Set Size)_\n`;
            response += `  ├─ Heap Total: ${formatBytes(botMemory.heapTotal)} _(V8 Engine)_\n`;
            response += `  └─ Heap Used: ${formatBytes(botMemory.heapUsed)} _(V8 Engine)_\n`;
            
            await context.reply(response.trim());
            
        } catch (error) {
            console.error('Error saat mengambil spek server:', error);
            await context.reply(`❌ Gagal mengambil data server. Coba cek console log, bro.`);
        }
    }
};