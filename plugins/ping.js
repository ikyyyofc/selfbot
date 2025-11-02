
export default {
    rules: {
        owner: true
    },
    desc: "Check bot performance and resource usage",
    async execute({ sock, m }) {
        const start = Date.now();
        
        const formatBytes = (bytes) => {
            if (bytes === 0) return "0 B";
            const k = 1024;
            const sizes = ["B", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
        };

        const formatUptime = (ms) => {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
        };

        const getMemoryDetails = () => {
            const usage = process.memoryUsage();
            return {
                rss: usage.rss,
                heapTotal: usage.heapTotal,
                heapUsed: usage.heapUsed,
                external: usage.external,
                arrayBuffers: usage.arrayBuffers
            };
        };

        const getCPUUsage = () => {
            const usage = process.cpuUsage();
            return {
                user: (usage.user / 1000000).toFixed(2),
                system: (usage.system / 1000000).toFixed(2)
            };
        };

        const getSystemInfo = async () => {
            const os = await import("os");
            return {
                platform: os.platform(),
                arch: os.arch(),
                cpus: os.cpus().length,
                totalMem: os.totalmem(),
                freeMem: os.freemem(),
                uptime: os.uptime()
            };
        };

        const getModuleStats = async () => {
            const db = await import("./Database.js").then(m => m.default);
            const groupCache = await import("./groupCache.js").then(m => m.default);
            const cooldown = await import("./CooldownManager.js").then(m => m.default);
            const sessionCleaner = await import("./SessionCleaner.js").then(m => m.default);

            return {
                database: {
                    mode: db.mode,
                    connected: db.isConnected,
                    userCache: db.userCache.size,
                    groupCache: db.groupCache.size
                },
                groupCache: groupCache.getStats(),
                cooldown: cooldown.getStats(),
                session: sessionCleaner.getStats(),
                messageStore: {
                    total: m.sock.state?.messageStore?.size || 0
                }
            };
        };

        const getPluginStats = () => {
            return {
                commands: m.sock.state?.plugins?.size || 0,
                listeners: m.sock.state?.listeners?.size || 0
            };
        };

        await m.react("⏳");

        const memory = getMemoryDetails();
        const cpu = getCPUUsage();
        const system = await getSystemInfo();
        const modules = await getModuleStats();
        const plugins = getPluginStats();

        const responseTime = Date.now() - start;

        let msg = `╭─────「 *BOT PERFORMANCE* 」\n`;
        msg += `│\n`;
        msg += `│ *1. RESPONSE TIME*\n`;
        msg += `│    1.1 Latency: ${responseTime}ms\n`;
        msg += `│    1.2 Processing: ${Date.now() - start}ms\n`;
        msg += `│\n`;
        msg += `│ *2. MEMORY USAGE*\n`;
        msg += `│    2.1 RSS: ${formatBytes(memory.rss)}\n`;
        msg += `│    2.2 Heap Total: ${formatBytes(memory.heapTotal)}\n`;
        msg += `│    2.3 Heap Used: ${formatBytes(memory.heapUsed)}\n`;
        msg += `│        • Percentage: ${((memory.heapUsed / memory.heapTotal) * 100).toFixed(2)}%\n`;
        msg += `│    2.4 External: ${formatBytes(memory.external)}\n`;
        msg += `│    2.5 Array Buffers: ${formatBytes(memory.arrayBuffers)}\n`;
        msg += `│\n`;
        msg += `│ *3. CPU USAGE*\n`;
        msg += `│    3.1 User: ${cpu.user}ms\n`;
        msg += `│    3.2 System: ${cpu.system}ms\n`;
        msg += `│    3.3 Total: ${(parseFloat(cpu.user) + parseFloat(cpu.system)).toFixed(2)}ms\n`;
        msg += `│\n`;
        msg += `│ *4. SYSTEM INFO*\n`;
        msg += `│    4.1 Platform: ${system.platform}\n`;
        msg += `│    4.2 Architecture: ${system.arch}\n`;
        msg += `│    4.3 CPU Cores: ${system.cpus}\n`;
        msg += `│    4.4 Total Memory: ${formatBytes(system.totalMem)}\n`;
        msg += `│    4.5 Free Memory: ${formatBytes(system.freeMem)}\n`;
        msg += `│        • Used: ${formatBytes(system.totalMem - system.freeMem)}\n`;
        msg += `│        • Percentage: ${(((system.totalMem - system.freeMem) / system.totalMem) * 100).toFixed(2)}%\n`;
        msg += `│    4.6 System Uptime: ${formatUptime(system.uptime * 1000)}\n`;
        msg += `│\n`;
        msg += `│ *5. PROCESS INFO*\n`;
        msg += `│    5.1 PID: ${process.pid}\n`;
        msg += `│    5.2 Node Version: ${process.version}\n`;
        msg += `│    5.3 Process Uptime: ${formatUptime(process.uptime() * 1000)}\n`;
        msg += `│\n`;
        msg += `│ *6. DATABASE*\n`;
        msg += `│    6.1 Mode: ${modules.database.mode}\n`;
        msg += `│    6.2 Connected: ${modules.database.connected ? "Yes" : "No"}\n`;
        msg += `│    6.3 Cache Status:\n`;
        msg += `│        • User Cache: ${modules.database.userCache} entries\n`;
        msg += `│        • Group Cache: ${modules.database.groupCache} entries\n`;
        msg += `│\n`;
        msg += `│ *7. GROUP CACHE*\n`;
        msg += `│    7.1 Total Groups: ${modules.groupCache.total}\n`;
        msg += `│    7.2 Initialized: ${modules.groupCache.initialized ? "Yes" : "No"}\n`;
        msg += `│\n`;
        msg += `│ *8. COOLDOWN MANAGER*\n`;
        msg += `│    8.1 Total Entries: ${modules.cooldown.total}\n`;
        msg += `│    8.2 Active: ${modules.cooldown.active}\n`;
        msg += `│    8.3 Expired: ${modules.cooldown.total - modules.cooldown.active}\n`;
        msg += `│\n`;
        msg += `│ *9. SESSION CLEANER*\n`;
        msg += `│    9.1 Total Files: ${modules.session.total || 0}\n`;
        msg += `│    9.2 Protected: ${modules.session.protected || 0}\n`;
        msg += `│    9.3 Cleanable: ${modules.session.cleanable || 0}\n`;
        msg += `│\n`;
        msg += `│ *10. MESSAGE STORE*\n`;
        msg += `│    10.1 Stored Messages: ${modules.messageStore.total}\n`;
        msg += `│\n`;
        msg += `│ *11. PLUGINS*\n`;
        msg += `│    11.1 Commands: ${plugins.commands}\n`;
        msg += `│    11.2 Listeners: ${plugins.listeners}\n`;
        msg += `│    11.3 Total: ${plugins.commands + plugins.listeners}\n`;
        msg += `│\n`;
        msg += `╰────────────────────────`;

        await m.reply(msg);
    }
};