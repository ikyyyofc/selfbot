
const plugin = {
    name: "status",
    desc: "🖥️ Cek status bot & resource sistem",
    rules: {
        owner: false
    },
    
    async execute(context) {
        const { sock, m, reply } = context;
        
        const startTime = Date.now();
        
        try {
            const statusData = await this.getSystemStatus();
            const ping = Date.now() - startTime;
            
            const statusMsg = this.formatStatusMessage(statusData, ping);
            await reply(statusMsg);
            
        } catch (error) {
            console.error("Status plugin error:", error);
            await reply("❌ Gagal mengambil status sistem");
        }
    },
    
    async getSystemStatus() {
        const os = await import('os');
        const process = await import('process');
        
        // Memory usage
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        // CPU info
        const cpus = os.cpus();
        const cpuModel = cpus[0]?.model || "Unknown";
        const cpuCores = cpus.length;
        
        // Load average
        const loadAvg = os.loadavg();
        
        // Uptime
        const uptime = process.uptime();
        const systemUptime = os.uptime();
        
        // Platform info
        const platform = os.platform();
        const arch = os.arch();
        const release = os.release();
        
        // Network interfaces
        const network = os.networkInterfaces();
        
        // Process info
        const nodeVersion = process.version;
        const pid = process.pid;
        const ppid = process.ppid;
        
        // Disk usage (simplified)
        const cwd = process.cwd();
        
        return {
            memory: {
                total: this.formatBytes(totalMem),
                used: this.formatBytes(usedMem),
                free: this.formatBytes(freeMem),
                usagePercent: ((usedMem / totalMem) * 100).toFixed(2),
                process: {
                    rss: this.formatBytes(memUsage.rss),
                    heapTotal: this.formatBytes(memUsage.heapTotal),
                    heapUsed: this.formatBytes(memUsage.heapUsed),
                    external: this.formatBytes(memUsage.external),
                    arrayBuffers: this.formatBytes(memUsage.arrayBuffers)
                }
            },
            cpu: {
                model: cpuModel,
                cores: cpuCores,
                load: {
                    '1min': loadAvg[0].toFixed(2),
                    '5min': loadAvg[1].toFixed(2),
                    '15min': loadAvg[2].toFixed(2)
                }
            },
            uptime: {
                process: this.formatUptime(uptime),
                system: this.formatUptime(systemUptime)
            },
            system: {
                platform,
                arch,
                release,
                hostname: os.hostname(),
                type: os.type(),
                userInfo: os.userInfo()
            },
            process: {
                pid,
                ppid,
                nodeVersion,
                cwd,
                execPath: process.execPath,
                argv: process.argv.slice(0, 3).join(' ') + '...'
            },
            network: Object.keys(network).length
        };
    },
    
    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },
    
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        
        return parts.join(' ');
    },
    
    formatStatusMessage(data, ping) {
        return `🖥️ *SYSTEM STATUS BOT*

⚡ *RESPONSE TIME*
• Ping: ${ping}ms
• Uptime: ${data.uptime.process}

💾 *MEMORY USAGE*
• Total: ${data.memory.total}
• Used: ${data.memory.used} (${data.memory.usagePercent}%)
• Free: ${data.memory.free}

🔧 *PROCESS MEMORY*
• RSS: ${data.memory.process.rss}
• Heap Total: ${data.memory.process.heapTotal}
• Heap Used: ${data.memory.process.heapUsed}
• External: ${data.memory.process.external}
• Array Buffers: ${data.memory.process.arrayBuffers}

🖥️ *CPU INFO*
• Model: ${data.cpu.model}
• Cores: ${data.cpu.cores}
• Load (1/5/15m): ${data.cpu.load['1min']}/${data.cpu.load['5min']}/${data.cpu.load['15min']}

📊 *SYSTEM INFO*
• OS: ${data.system.platform} ${data.system.arch}
• Kernel: ${data.system.release}
• Hostname: ${data.system.hostname}
• System Uptime: ${data.uptime.system}

🔗 *PROCESS INFO*
• PID: ${data.process.pid}
• Parent PID: ${data.process.ppid}
• Node.js: ${data.process.nodeVersion}
• Network Interfaces: ${data.network}
• Working Dir: ${data.process.cwd.split('/').pop()}

⏰ *TIMESTAMP*
${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

_📊 Real-time system monitoring_`;
    }
};

export default plugin;