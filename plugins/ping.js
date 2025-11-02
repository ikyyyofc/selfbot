const os = require('os');
const process = require('process');

const plugin = {
    name: 'ping',
    desc: 'Cek kecepatan respons & status resource bot',
    
    rules: {
        owner: false,
        group: false,
        private: false,
        admin: false,
        premium: false,
        limit: 0
    },

    async execute(context) {
        const startTime = Date.now();
        
        try {
            const stats = await this.getDetailedStats();
            const endTime = Date.now();
            const pingTime = endTime - startTime;
            
            const message = this.formatStatsMessage(stats, pingTime);
            await context.reply(message);
            
        } catch (error) {
            await context.reply(`❌ Gagal mengambil stats: ${error.message}`);
        }
    },

    async getDetailedStats() {
        return {
            timestamp: Date.now(),
            performance: this.getPerformanceStats(),
            memory: this.getMemoryStats(),
            system: this.getSystemStats(),
            process: this.getProcessStats(),
            network: this.getNetworkStats(),
            bot: this.getBotStats()
        };
    },

    getPerformanceStats() {
        const uptime = process.uptime();
        const loadAvg = os.loadavg();
        
        return {
            uptime: this.formatUptime(uptime),
            loadAverage: loadAvg.map(load => load.toFixed(2)),
            userCPUTime: process.cpuUsage().user / 1000000,
            systemCPUTime: process.cpuUsage().system / 1000000,
            eventLoopDelay: this.getEventLoopDelay()
        };
    },

    getMemoryStats() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        return {
            total: this.formatBytes(totalMem),
            used: this.formatBytes(usedMem),
            free: this.formatBytes(freeMem),
            usagePercent: ((usedMem / totalMem) * 100).toFixed(2),
            processHeap: this.formatBytes(process.memoryUsage().heapUsed),
            processRSS: this.formatBytes(process.memoryUsage().rss),
            processExternal: this.formatBytes(process.memoryUsage().external)
        };
    },

    getSystemStats() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            hostname: os.hostname(),
            cpus: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'Unknown',
            cpuSpeed: os.cpus()[0]?.speed || 0
        };
    },

    getProcessStats() {
        return {
            pid: process.pid,
            version: process.version,
            versions: process.versions,
            argv: process.argv.slice(2).join(' ') || 'None',
            execPath: process.execPath,
            cwd: process.cwd(),
            envKeys: Object.keys(process.env).length
        };
    },

    getNetworkStats() {
        const interfaces = os.networkInterfaces();
        const networkInfo = {};
        
        Object.keys(interfaces).forEach(iface => {
            networkInfo[iface] = interfaces[iface].map(info => ({
                family: info.family,
                address: info.address,
                internal: info.internal
            }));
        });
        
        return networkInfo;
    },

    getBotStats() {
        const botState = global.state;
        return {
            pluginsLoaded: botState?.plugins?.size || 0,
            messagesStored: botState?.messageStore?.size || 0,
            activeQueues: botState?.queues?.size || 0,
            cooldownEntries: global.cooldown?.cooldowns?.size || 0
        };
    },

    getEventLoopDelay() {
        const start = process.hrtime.bigint();
        const end = process.hrtime.bigint();
        return Number(end - start) / 1000000;
    },

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    },

    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },

    formatStatsMessage(stats, pingTime) {
        const { performance, memory, system, process: proc, network, bot } = stats;
        
        let message = `⚡ *BOT STATUS & PERFORMANCE*\n\n`;
        
        message += `📊 *RESPONSE TIME*\n`;
        message += `⏱️ Ping: ${pingTime}ms\n\n`;
        
        message += `🚀 *PERFORMANCE*\n`;
        message += `🕐 Uptime: ${performance.uptime}\n`;
        message += `📈 Load Avg: ${performance.loadAverage.join(', ')}\n`;
        message += `💻 CPU User: ${performance.userCPUTime.toFixed(2)}s\n`;
        message += `💻 CPU System: ${performance.systemCPUTime.toFixed(2)}s\n`;
        message += `🔄 Event Loop: ${performance.eventLoopDelay.toFixed(2)}ms\n\n`;
        
        message += `💾 *MEMORY USAGE*\n`;
        message += `📦 Total: ${memory.total}\n`;
        message += `🟢 Used: ${memory.used} (${memory.usagePercent}%)\n`;
        message += `🔵 Free: ${memory.free}\n`;
        message += `🧠 Process Heap: ${memory.processHeap}\n`;
        message += `📱 Process RSS: ${memory.processRSS}\n`;
        message += `🔗 Process External: ${memory.processExternal}\n\n`;
        
        message += `🖥️ *SYSTEM INFO*\n`;
        message += `⚙️ Platform: ${system.platform}\n`;
        message += `🏗️ Architecture: ${system.arch}\n`;
        message += `🔧 Release: ${system.release}\n`;
        message += `🏠 Hostname: ${system.hostname}\n`;
        message += `🔢 CPUs: ${system.cpus} cores\n`;
        message += `🚀 CPU Model: ${system.cpuModel}\n`;
        message += `💨 CPU Speed: ${system.cpuSpeed}MHz\n\n`;
        
        message += `🔧 *PROCESS INFO*\n`;
        message += `🆔 PID: ${proc.pid}\n`;
        message += `📋 Node.js: ${proc.version}\n`;
        message += `🎯 Arguments: ${proc.argv}\n`;
        message += `📁 Working Dir: ${proc.cwd().split('/').pop()}\n`;
        message += `🔑 Env Variables: ${proc.envKeys}\n\n`;
        
        message += `🤖 *BOT STATS*\n`;
        message += `🔌 Plugins: ${bot.pluginsLoaded}\n`;
        message += `💬 Messages: ${bot.messagesStored}\n`;
        message += `⏳ Queues: ${bot.activeQueues}\n`;
        message += `⏰ Cooldowns: ${bot.cooldownEntries}\n\n`;
        
        message += `🌐 *NETWORK INTERFACES*\n`;
        Object.keys(network).slice(0, 2).forEach(iface => {
            message += `📡 ${iface}:\n`;
            network[iface].slice(0, 2).forEach(addr => {
                message += `  ${addr.family} ${addr.address} ${addr.internal ? '(internal)' : ''}\n`;
            });
        });
        
        message += `\n⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;
        
        return message;
    }
};

export default plugin;