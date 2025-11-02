export default {
    name: "status",
    desc: "Cek status bot & resource usage detail",
    rules: {
        private: false,
        group: false,
        owner: false
    },
    async execute(context) {
        const { sock, m, reply } = context;
        
        try {
            await m.react("📊");
            
            const startTime = Date.now();
            const memUsage = process.memoryUsage();
            const os = await import('os');
            
            // Calculate ping
            const endTime = Date.now();
            const ping = endTime - startTime;
            
            // System info
            const uptime = process.uptime();
            const sysUptime = os.uptime();
            const cpuInfo = os.cpus();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const loadAvg = os.loadavg();
            
            // Format time
            const formatUptime = (seconds) => {
                const days = Math.floor(seconds / 86400);
                const hours = Math.floor((seconds % 86400) / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return `${days}d ${hours}h ${minutes}m`;
            };
            
            // Format bytes
            const formatBytes = (bytes) => {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };
            
            // Calculate percentages
            const memUsed = totalMem - freeMem;
            const memPercent = ((memUsed / totalMem) * 100).toFixed(2);
            const rssPercent = ((memUsage.rss / totalMem) * 100).toFixed(2);
            const heapPercent = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2);
            
            // Platform info
            const platform = os.platform();
            const arch = os.arch();
            const release = os.release();
            
            // CPU details
            const cpuModel = cpuInfo[0]?.model || 'Unknown';
            const cpuSpeed = cpuInfo[0]?.speed || 0;
            const cpuCores = cpuInfo.length;
            
            // Build status message
            let statusMsg = `🤖 *BOT STATUS DETAIL*\n\n`;
            
            statusMsg += `⚡ *PERFORMANCE*\n`;
            statusMsg += `📶 Ping: ${ping}ms\n`;
            statusMsg += `⏰ Bot Uptime: ${formatUptime(uptime)}\n`;
            statusMsg += `🖥️ System Uptime: ${formatUptime(sysUptime)}\n\n`;
            
            statusMsg += `💾 *MEMORY USAGE*\n`;
            statusMsg += `📊 System: ${formatBytes(memUsed)} / ${formatBytes(totalMem)} (${memPercent}%)\n`;
            statusMsg += `🔴 RSS: ${formatBytes(memUsage.rss)} (${rssPercent}%)\n`;
            statusMsg += `🔵 Heap Used: ${formatBytes(memUsage.heapUsed)}\n`;
            statusMsg += `🟢 Heap Total: ${formatBytes(memUsage.heapTotal)}\n`;
            statusMsg += `🟡 Heap %: ${heapPercent}%\n`;
            statusMsg += `🟣 External: ${formatBytes(memUsage.external)}\n`;
            statusMsg += `⚪ Array Buffers: ${formatBytes(memUsage.arrayBuffers)}\n\n`;
            
            statusMsg += `🖥️ *CPU & SYSTEM*\n`;
            statusMsg += `🧠 CPU: ${cpuModel}\n`;
            statusMsg += `🚀 Cores: ${cpuCores} cores @ ${cpuSpeed}MHz\n`;
            statusMsg += `📈 Load Avg: ${loadAvg[0].toFixed(2)}, ${loadAvg[1].toFixed(2)}, ${loadAvg[2].toFixed(2)}\n`;
            statusMsg += `💻 Platform: ${platform} ${arch}\n`;
            statusMsg += `🔧 Kernel: ${release}\n\n`;
            
            statusMsg += `📦 *PROCESS INFO*\n`;
            statusMsg += `🆔 PID: ${process.pid}\n`;
            statusMsg += `📚 Node.js: ${process.version}\n`;
            statusMsg += `📁 CWD: ${process.cwd()}\n`;
            
            // Add some emoji flair based on performance
            if (ping < 100) {
                statusMsg += `\n🎯 Status: Excellent! Bot running smoothly`;
            } else if (ping < 500) {
                statusMsg += `\n✅ Status: Good performance`;
            } else {
                statusMsg += `\n⚠️ Status: Slow response detected`;
            }
            
            await reply(statusMsg);
            await m.react("✅");
            
        } catch (error) {
            console.error("Status plugin error:", error);
            await reply("❌ Gagal mengambil status system");
            await m.react("❌");
        }
    }
};