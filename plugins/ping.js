
import os from 'os';
import process from 'process';

export default {
    name: 'ping',
    desc: 'Cek kecepatan bot & resource usage',
    execute: async (context) => {
        const startTime = Date.now();
        
        try {
            // Hitung ping
            const latency = Date.now() - startTime;
            
            // System info
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            // OS info
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const loadAvg = os.loadavg();
            const cpus = os.cpus();
            
            // Process info
            const pid = process.pid;
            const nodeVersion = process.version;
            const platform = os.platform();
            const arch = os.arch();
            
            // Format waktu
            const formatUptime = (seconds) => {
                const days = Math.floor(seconds / 86400);
                const hours = Math.floor((seconds % 86400) / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                return `${days}d ${hours}h ${minutes}m ${secs}s`;
            };
            
            // Format memory
            const formatBytes = (bytes) => {
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                if (bytes === 0) return '0 Bytes';
                const i = Math.floor(Math.log(bytes) / Math.log(1024));
                return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
            };
            
            // Build message
            let message = `⚡ *PING STATISTICS*\n\n`;
            
            // Ping & Latency
            message += `📡 *RESPONSE TIME*\n`;
            message += `• Ping: ${latency}ms\n`;
            message += `• Timestamp: ${new Date().toLocaleString('id-ID')}\n\n`;
            
            // Process Info
            message += `🖥️ *PROCESS INFO*\n`;
            message += `• PID: ${pid}\n`;
            message += `• Uptime: ${formatUptime(uptime)}\n`;
            message += `• Node.js: ${nodeVersion}\n`;
            message += `• Platform: ${platform} ${arch}\n\n`;
            
            // Memory Usage
            message += `💾 *MEMORY USAGE*\n`;
            message += `• RSS: ${formatBytes(memoryUsage.rss)}\n`;
            message += `• Heap Total: ${formatBytes(memoryUsage.heapTotal)}\n`;
            message += `• Heap Used: ${formatBytes(memoryUsage.heapUsed)}\n`;
            message += `• External: ${formatBytes(memoryUsage.external)}\n`;
            message += `• Array Buffers: ${formatBytes(memoryUsage.arrayBuffers)}\n\n`;
            
            // System Memory
            message += `🖥️ *SYSTEM MEMORY*\n`;
            message += `• Total: ${formatBytes(totalMem)}\n`;
            message += `• Free: ${formatBytes(freeMem)}\n`;
            message += `• Used: ${formatBytes(totalMem - freeMem)}\n`;
            message += `• Usage: ${((1 - freeMem / totalMem) * 100).toFixed(2)}%\n\n`;
            
            // CPU Info
            message += `🔧 *CPU INFORMATION*\n`;
            message += `• Model: ${cpus[0]?.model || 'N/A'}\n`;
            message += `• Cores: ${cpus.length}\n`;
            message += `• Speed: ${cpus[0]?.speed || 'N/A'} MHz\n\n`;
            
            // CPU Usage
            message += `📊 *CPU USAGE*\n`;
            message += `• User: ${(cpuUsage.user / 1000000).toFixed(2)}s\n`;
            message += `• System: ${(cpuUsage.system / 1000000).toFixed(2)}s\n`;
            
            // Load Average (Unix/Linux only)
            if (platform !== 'win32') {
                message += `• Load Avg (1m): ${loadAvg[0].toFixed(2)}\n`;
                message += `• Load Avg (5m): ${loadAvg[1].toFixed(2)}\n`;
                message += `• Load Avg (15m): ${loadAvg[2].toFixed(2)}\n`;
            }
            
            message += `\n⏰ *TIMING*\n`;
            message += `• Start: ${new Date(startTime).toLocaleTimeString('id-ID')}\n`;
            message += `• End: ${new Date().toLocaleTimeString('id-ID')}\n`;
            message += `• Processing: ${Date.now() - startTime}ms`;
            
            await context.reply(message);
            
        } catch (error) {
            await context.reply(`❌ Error: ${error.message}`);
        }
    }
};