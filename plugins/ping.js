import os from 'os';
import { performance } from 'perf_hooks';

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d} hari, ${h} jam, ${m} menit, ${s} detik`;
};

export default async function spec({ m, reply }) {
    try {
        const start = performance.now();
        
        const cpus = os.cpus();
        const cpuModel = cpus[0].model;
        const cpuCores = cpus.length;
        const cpuSpeed = (cpus[0].speed / 1000).toFixed(2);
        
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        const nodeVersion = process.version;
        const processMem = formatBytes(process.memoryUsage().rss);
        
        const platform = os.platform();
        const arch = os.arch();
        const release = os.release();
        const hostname = os.hostname();
        const systemUptime = formatUptime(os.uptime());
        
        const end = performance.now();
        const processingTime = (end - start).toFixed(2);
        const latency = (Date.now() - (m.timestamp * 1000));
        
        let responseText = `*📊 Server & Response Speed*\n\n`;
        
        responseText += `*⏱️ Kecepatan Respon*\n`;
        responseText += `  • *Latency:* ${latency} ms\n`;
        responseText += `  • *Waktu Proses:* ${processingTime} ms\n\n`;
        
        responseText += `*💻 Spesifikasi Server*\n\n`;
        
        responseText += `  *OS & Platform*\n`;
        responseText += `  • *Hostname:* ${hostname}\n`;
        responseText += `  • *Platform:* ${platform}\n`;
        responseText += `  • *Arsitektur:* ${arch}\n`;
        responseText += `  • *Rilis OS:* ${release}\n\n`;

        responseText += `  *CPU (Central Processing Unit)*\n`;
        responseText += `  • *Model:* ${cpuModel}\n`;
        responseText += `  • *Jumlah Core:* ${cpuCores} Core\n`;
        responseText += `  • *Kecepatan Dasar:* ~${cpuSpeed} GHz\n\n`;
        
        responseText += `  *RAM (Random-Access Memory)*\n`;
        responseText += `  • *Total:* ${formatBytes(totalMem)}\n`;
        responseText += `  • *Terpakai:* ${formatBytes(usedMem)}\n`;
        responseText += `  • *Sisa:* ${formatBytes(freeMem)}\n\n`;

        responseText += `  *🤖 Proses Bot*\n`;
        responseText += `  • *Versi Node.js:* ${nodeVersion}\n`;
        responseText += `  • *Penggunaan Memori:* ${processMem}\n\n`;

        responseText += `  *🕒 Uptime Sistem*\n`;
        responseText += `  • *Nyala Selama:* ${systemUptime}\n`;

        await reply(responseText);
        
    } catch (error) {
        console.error('Error fetching server specs:', error);
        await reply(`❌ Gagal mengambil spesifikasi server: ${error.message}`);
    }
}