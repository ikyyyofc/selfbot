import os from "os";

export default {
    async execute({ m, sock }) {
        const start = Date.now();
        
        const sent = await m.reply("⏳");
        const ping = Date.now() - start;
        
        const cpus = os.cpus();
        const cpuModel = cpus[0]?.model || "Unknown";
        const cpuCores = cpus.length;
        
        let cpuUsage = 0;
        const cpuStart = os.cpus();
        await new Promise(r => setTimeout(r, 100));
        const cpuEnd = os.cpus();
        
        cpuStart.forEach((start, i) => {
            const end = cpuEnd[i];
            const startTotal = Object.values(start.times).reduce((a, b) => a + b, 0);
            const endTotal = Object.values(end.times).reduce((a, b) => a + b, 0);
            const startIdle = start.times.idle;
            const endIdle = end.times.idle;
            cpuUsage += ((endTotal - startTotal) - (endIdle - startIdle)) / (endTotal - startTotal) * 100;
        });
        cpuUsage = (cpuUsage / cpuCores).toFixed(1);
        
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
        
        const proc = process.memoryUsage();
        const heapUsed = (proc.heapUsed / 1024 / 1024).toFixed(1);
        const heapTotal = (proc.heapTotal / 1024 / 1024).toFixed(1);
        const rss = (proc.rss / 1024 / 1024).toFixed(1);
        
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const secs = Math.floor(uptime % 60);
        
        const sysUptime = os.uptime();
        const sysDays = Math.floor(sysUptime / 86400);
        const sysHours = Math.floor((sysUptime % 86400) / 3600);
        const sysMins = Math.floor((sysUptime % 3600) / 60);
        
        const formatBytes = bytes => {
            if (bytes < 1024) return bytes + " B";
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
            if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
            return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
        };
        
        const text = `🤖 *BOT STATUS*

⚡ *Response Time*
├ Ping: ${ping}ms
└ Status: ${ping < 100 ? "🟢 Excellent" : ping < 300 ? "🟡 Good" : "🔴 Slow"}

💻 *System Info*
├ Platform: ${os.platform()}
├ Arch: ${os.arch()}
├ Hostname: ${os.hostname()}
├ Node: ${process.version}
└ Uptime: ${sysDays}d ${sysHours}h ${sysMins}m

🔧 *CPU*
├ Model: ${cpuModel.trim()}
├ Cores: ${cpuCores}
└ Usage: ${cpuUsage}%

🧠 *RAM System*
├ Total: ${formatBytes(totalMem)}
├ Used: ${formatBytes(usedMem)}
├ Free: ${formatBytes(freeMem)}
└ Usage: ${memPercent}%

📦 *Process Memory*
├ RSS: ${rss} MB
├ Heap Used: ${heapUsed} MB
├ Heap Total: ${heapTotal} MB
└ External: ${(proc.external / 1024 / 1024).toFixed(1)} MB

⏱️ *Bot Uptime*
└ ${days}d ${hours}h ${mins}m ${secs}s`;

        await sock.sendMessage(m.chat, { text, edit: sent.key });
    }
};