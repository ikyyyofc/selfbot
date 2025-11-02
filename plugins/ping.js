const groupCache = => (await import("../lib/groupCache.js")).default;

export default {
    desc: "Check bot response speed and resource usage",
    rules: {
        owner: true
    },
    execute: async ({ sock, m }) => {
        const startTime = Date.now();
        
        await m.react("⏱️");

        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const formatUptime = (seconds) => {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            const parts = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0) parts.push(`${hours}h`);
            if (minutes > 0) parts.push(`${minutes}m`);
            if (secs > 0) parts.push(`${secs}s`);
            
            return parts.join(' ');
        };

        const getCPUUsage = () => {
            const cpus = os.cpus();
            let totalIdle = 0;
            let totalTick = 0;
            
            cpus.forEach(cpu => {
                for (const type in cpu.times) {
                    totalTick += cpu.times[type];
                }
                totalIdle += cpu.times.idle;
            });
            
            return {
                usage: ((1 - totalIdle / totalTick) * 100).toFixed(2),
                cores: cpus.length,
                model: cpus[0].model,
                speed: cpus[0].speed
            };
        };

        const getMemoryUsage = () => {
            const mem = process.memoryUsage();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            
            return {
                process: {
                    rss: mem.rss,
                    heapTotal: mem.heapTotal,
                    heapUsed: mem.heapUsed,
                    external: mem.external,
                    arrayBuffers: mem.arrayBuffers
                },
                system: {
                    total: totalMem,
                    free: freeMem,
                    used: usedMem,
                    percentage: ((usedMem / totalMem) * 100).toFixed(2)
                }
            };
        };

        const getDiskUsage = () => {
            const stats = fs.statfsSync(process.cwd());
            const total = stats.blocks * stats.bsize;
            const free = stats.bfree * stats.bsize;
            const used = total - free;
            
            return {
                total,
                free,
                used,
                percentage: ((used / total) * 100).toFixed(2)
            };
        };

        const getNetworkStats = () => {
            const interfaces = os.networkInterfaces();
            const stats = [];
            
            for (const [name, addrs] of Object.entries(interfaces)) {
                addrs.forEach(addr => {
                    if (!addr.internal && addr.family === 'IPv4') {
                        stats.push({
                            interface: name,
                            address: addr.address,
                            netmask: addr.netmask,
                            mac: addr.mac
                        });
                    }
                });
            }
            
            return stats;
        };

        const getCacheStats = () => {
            const groupCacheStats = groupCache.getStats();
            const cooldownStats = cooldown.getStats();
            
            return {
                groups: {
                    total: groupCacheStats.total,
                    initialized: groupCacheStats.initialized
                },
                cooldowns: {
                    total: cooldownStats.total,
                    active: cooldownStats.active
                },
                messages: m.constructor.name === 'Object' ? 'N/A' : 'Active'
            };
        };

        const getPluginStats = async () => {
            const state = await import('../lib/BotState.js').then(m => new m.default());
            const messageStoreSize = state.messageStore ? state.messageStore.size : 0;
            const pluginsSize = state.plugins ? state.plugins.size : 0;
            
            return {
                commands: pluginsSize,
                messageStore: messageStoreSize,
                isDirty: state.isDirty || false
            };
        };

        const getSessionStats = () => {
            const sessionCleaner = require('../lib/SessionCleaner.js').default;
            return sessionCleaner.getStats();
        };

        const getDatabaseStats = async () => {
            const dbStats = {
                mode: db.mode,
                connected: db.isConnected
            };
            
            if (db.mode === 'cloud') {
                try {
                    const stats = await db.db.stats();
                    dbStats.collections = stats.collections;
                    dbStats.dataSize = stats.dataSize;
                    dbStats.storageSize = stats.storageSize;
                    dbStats.indexes = stats.indexes;
                } catch (e) {
                    dbStats.error = e.message;
                }
            }
            
            return dbStats;
        };

        const import_os = import('os');
        const import_fs = import('fs');
        
        const [os, fs] = await Promise.all([import_os, import_fs]);

        const cpu = getCPUUsage();
        const memory = getMemoryUsage();
        const disk = getDiskUsage();
        const network = getNetworkStats();
        const cache = getCacheStats();
        const plugins = await getPluginStats();
        const sessionStats = getSessionStats();
        const dbStats = await getDatabaseStats();
        
        const responseTime = Date.now() - startTime;

        let report = `⚡ *BOT PERFORMANCE REPORT*\n\n`;
        
        report += `📊 *1. RESPONSE METRICS*\n`;
        report += `   1.1 Response Time: ${responseTime}ms\n`;
        report += `   1.2 Process Uptime: ${formatUptime(process.uptime())}\n`;
        report += `   1.3 System Uptime: ${formatUptime(os.uptime())}\n`;
        report += `   1.4 Platform: ${os.platform()} ${os.release()}\n`;
        report += `   1.5 Architecture: ${os.arch()}\n\n`;

        report += `🖥️ *2. CPU USAGE*\n`;
        report += `   2.1 Usage: ${cpu.usage}%\n`;
        report += `   2.2 Cores: ${cpu.cores}\n`;
        report += `   2.3 Model: ${cpu.model}\n`;
        report += `   2.4 Speed: ${cpu.speed} MHz\n`;
        report += `   2.5 Load Average:\n`;
        const loadAvg = os.loadavg();
        report += `       2.5.1 1 min: ${loadAvg[0].toFixed(2)}\n`;
        report += `       2.5.2 5 min: ${loadAvg[1].toFixed(2)}\n`;
        report += `       2.5.3 15 min: ${loadAvg[2].toFixed(2)}\n\n`;

        report += `💾 *3. MEMORY USAGE*\n`;
        report += `   3.1 Process Memory:\n`;
        report += `       3.1.1 RSS: ${formatBytes(memory.process.rss)}\n`;
        report += `       3.1.2 Heap Total: ${formatBytes(memory.process.heapTotal)}\n`;
        report += `       3.1.3 Heap Used: ${formatBytes(memory.process.heapUsed)}\n`;
        report += `       3.1.4 External: ${formatBytes(memory.process.external)}\n`;
        report += `       3.1.5 Array Buffers: ${formatBytes(memory.process.arrayBuffers)}\n`;
        report += `   3.2 System Memory:\n`;
        report += `       3.2.1 Total: ${formatBytes(memory.system.total)}\n`;
        report += `       3.2.2 Free: ${formatBytes(memory.system.free)}\n`;
        report += `       3.2.3 Used: ${formatBytes(memory.system.used)}\n`;
        report += `       3.2.4 Usage: ${memory.system.percentage}%\n\n`;

        report += `💿 *4. DISK USAGE*\n`;
        report += `   4.1 Total: ${formatBytes(disk.total)}\n`;
        report += `   4.2 Free: ${formatBytes(disk.free)}\n`;
        report += `   4.3 Used: ${formatBytes(disk.used)}\n`;
        report += `   4.4 Usage: ${disk.percentage}%\n\n`;

        report += `🌐 *5. NETWORK*\n`;
        network.forEach((net, i) => {
            report += `   5.${i + 1} Interface: ${net.interface}\n`;
            report += `       5.${i + 1}.1 IP: ${net.address}\n`;
            report += `       5.${i + 1}.2 Netmask: ${net.netmask}\n`;
            report += `       5.${i + 1}.3 MAC: ${net.mac}\n`;
        });
        report += `\n`;

        report += `📦 *6. CACHE STATUS*\n`;
        report += `   6.1 Groups:\n`;
        report += `       6.1.1 Total: ${cache.groups.total}\n`;
        report += `       6.1.2 Initialized: ${cache.groups.initialized}\n`;
        report += `   6.2 Cooldowns:\n`;
        report += `       6.2.1 Total: ${cache.cooldowns.total}\n`;
        report += `       6.2.2 Active: ${cache.cooldowns.active}\n`;
        report += `   6.3 Messages: ${cache.messages}\n\n`;

        report += `🔌 *7. PLUGINS*\n`;
        report += `   7.1 Commands: ${plugins.commands}\n`;
        report += `   7.2 Message Store: ${plugins.messageStore}\n`;
        report += `   7.3 Store Dirty: ${plugins.isDirty}\n\n`;

        report += `📂 *8. SESSION*\n`;
        if (sessionStats) {
            report += `   8.1 Total Size: ${sessionStats.totalSizeMB} MB\n`;
            report += `   8.2 Cleanable Size: ${sessionStats.cleanableSizeMB} MB\n`;
            report += `   8.3 Files:\n`;
            report += `       8.3.1 Total: ${sessionStats.fileCount}\n`;
            report += `       8.3.2 Protected: ${sessionStats.protectedCount}\n`;
            report += `       8.3.3 Cleanable: ${sessionStats.unprotectedCount}\n`;
            report += `   8.4 Limit: ${sessionStats.maxSizeMB} MB\n`;
            report += `   8.5 Over Limit: ${sessionStats.isOverLimit ? 'Yes' : 'No'}\n`;
        } else {
            report += `   8.1 Status: N/A\n`;
        }
        report += `\n`;

        report += `🗄️ *9. DATABASE*\n`;
        report += `   9.1 Mode: ${dbStats.mode}\n`;
        report += `   9.2 Connected: ${dbStats.connected}\n`;
        if (dbStats.mode === 'cloud' && !dbStats.error) {
            report += `   9.3 Collections: ${dbStats.collections}\n`;
            report += `   9.4 Data Size: ${formatBytes(dbStats.dataSize)}\n`;
            report += `   9.5 Storage Size: ${formatBytes(dbStats.storageSize)}\n`;
            report += `   9.6 Indexes: ${dbStats.indexes}\n`;
        } else if (dbStats.error) {
            report += `   9.3 Error: ${dbStats.error}\n`;
        }

        await m.reply(report);
    }
};