// plugins/ping.js
import os from "os";
import { performance } from "perf_hooks";
import { execSync } from "child_process";
import v8 from "v8";
import process from "process";

export default {
    desc: "Cek kecepatan respons & resource detail",
    rules: {},
    
    async execute({ sock, m, reply }) {
        const start = performance.now();
        
        await m.react("🔄");
        
        const getProcessInfo = () => {
            try {
                const pid = process.pid;
                const psResult = execSync(`ps -p ${pid} -o %cpu,%mem,rss,vsz,etime`, { encoding: "utf8" });
                const lines = psResult.trim().split("\n");
                if (lines.length > 1) {
                    const values = lines[1].trim().split(/\s+/);
                    return {
                        cpu: values[0] + "%",
                        memPercent: values[1] + "%",
                        rss: (parseInt(values[2]) / 1024).toFixed(2) + " MB",
                        vsz: (parseInt(values[3]) / 1024).toFixed(2) + " MB",
                        uptime: values[4]
                    };
                }
            } catch (e) {}
            return null;
        };

        const getNetworkInfo = () => {
            try {
                const netstat = execSync("netstat -i", { encoding: "utf8" });
                const lines = netstat.trim().split("\n");
                const data = [];
                for (let i = 2; i < lines.length; i++) {
                    const cols = lines[i].trim().split(/\s+/);
                    if (cols[0] && cols[0] !== "lo") {
                        data.push({
                            interface: cols[0],
                            rx: parseInt(cols[3]) || 0,
                            tx: parseInt(cols[7]) || 0
                        });
                    }
                }
                return data;
            } catch (e) {
                return [];
            }
        };

        const getDiskInfo = () => {
            try {
                const df = execSync("df -h /", { encoding: "utf8" });
                const lines = df.trim().split("\n");
                if (lines.length > 1) {
                    const cols = lines[1].trim().split(/\s+/);
                    return {
                        total: cols[1],
                        used: cols[2],
                        available: cols[3],
                        usePercent: cols[4]
                    };
                }
            } catch (e) {}
            return null;
        };

        const memUsage = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();
        const heapSpaces = v8.getHeapSpaceStatistics();
        const cpus = os.cpus();
        const processInfo = getProcessInfo();
        const networkInfo = getNetworkInfo();
        const diskInfo = getDiskInfo();
        
        const cpuUsage = cpus.map((cpu, i) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
            const idle = cpu.times.idle;
            const usage = ((total - idle) / total * 100).toFixed(1);
            return `   CPU ${i}: ${usage}% (${cpu.model})`;
        });

        const heapSpaceDetails = heapSpaces.map(space => {
            const used = (space.space_used_size / 1024 / 1024).toFixed(2);
            const available = (space.space_available_size / 1024 / 1024).toFixed(2);
            const size = (space.space_size / 1024 / 1024).toFixed(2);
            const physical = (space.physical_space_size / 1024 / 1024).toFixed(2);
            return `   ${space.space_name}:\n` +
                   `     Size: ${size} MB | Physical: ${physical} MB\n` +
                   `     Used: ${used} MB | Available: ${available} MB`;
        });

        const networkDetails = networkInfo.map(net => {
            const rxMB = (net.rx / 1024 / 1024).toFixed(2);
            const txMB = (net.tx / 1024 / 1024).toFixed(2);
            return `   ${net.interface}: RX ${rxMB} MB | TX ${txMB} MB`;
        });

        const end = performance.now();
        const responseTime = (end - start).toFixed(2);

        let msg = `*🚀 SYSTEM PERFORMANCE REPORT*\n\n`;
        
        msg += `*⚡ RESPONSE TIME*\n`;
        msg += `├ Bot Latency: ${responseTime}ms\n`;
        msg += `└ Status: ${responseTime < 100 ? "Excellent ✨" : responseTime < 300 ? "Good 👍" : responseTime < 500 ? "Normal 😊" : "Slow 🐌"}\n\n`;
        
        msg += `*🖥️ SYSTEM INFO*\n`;
        msg += `├ Platform: ${os.platform()} ${os.arch()}\n`;
        msg += `├ Node: ${process.version}\n`;
        msg += `├ Hostname: ${os.hostname()}\n`;
        msg += `├ Total RAM: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB\n`;
        msg += `├ Free RAM: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB\n`;
        msg += `└ RAM Usage: ${((1 - os.freemem() / os.totalmem()) * 100).toFixed(1)}%\n\n`;
        
        if (processInfo) {
            msg += `*📊 PROCESS STATS*\n`;
            msg += `├ PID: ${process.pid}\n`;
            msg += `├ CPU Usage: ${processInfo.cpu}\n`;
            msg += `├ Memory: ${processInfo.memPercent}\n`;
            msg += `├ RSS: ${processInfo.rss}\n`;
            msg += `├ VSZ: ${processInfo.vsz}\n`;
            msg += `└ Uptime: ${processInfo.uptime}\n\n`;
        }
        
        msg += `*🧠 MEMORY USAGE*\n`;
        msg += `├ RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `├ Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `├ Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `├ External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `└ Array Buffers: ${(memUsage.arrayBuffers / 1024 / 1024).toFixed(2)} MB\n\n`;
        
        msg += `*📈 V8 HEAP STATISTICS*\n`;
        msg += `├ Total Heap Size: ${(heapStats.total_heap_size / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `├ Executable Size: ${(heapStats.total_heap_size_executable / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `├ Physical Size: ${(heapStats.total_physical_size / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `├ Available Size: ${(heapStats.total_available_size / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `├ Used Heap: ${(heapStats.used_heap_size / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `├ Heap Limit: ${(heapStats.heap_size_limit / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `├ Malloced Memory: ${(heapStats.malloced_memory / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `├ Peak Malloced: ${(heapStats.peak_malloced_memory / 1024 / 1024).toFixed(2)} MB\n`;
        msg += `└ Native Contexts: ${heapStats.number_of_native_contexts}\n\n`;
        
        msg += `*🗂️ HEAP SPACES*\n`;
        msg += heapSpaceDetails.join("\n") + "\n\n";
        
        msg += `*💻 CPU DETAILS*\n`;
        msg += `├ Cores: ${cpus.length}\n`;
        msg += cpuUsage.join("\n") + "\n\n";
        
        msg += `*🔧 LOAD AVERAGE*\n`;
        const loadavg = os.loadavg();
        msg += `├ 1 min: ${loadavg[0].toFixed(2)}\n`;
        msg += `├ 5 min: ${loadavg[1].toFixed(2)}\n`;
        msg += `└ 15 min: ${loadavg[2].toFixed(2)}\n\n`;
        
        if (diskInfo) {
            msg += `*💾 DISK USAGE*\n`;
            msg += `├ Total: ${diskInfo.total}\n`;
            msg += `├ Used: ${diskInfo.used} (${diskInfo.usePercent})\n`;
            msg += `└ Available: ${diskInfo.available}\n\n`;
        }
        
        if (networkDetails.length > 0) {
            msg += `*🌐 NETWORK INTERFACES*\n`;
            msg += networkDetails.join("\n") + "\n\n";
        }
        
        msg += `*📁 BOT CACHE*\n`;
        const { default: groupCache } = await import("../lib/groupCache.js");
        const { default: db } = await import("../lib/Database.js");
        const { default: cooldown } = await import("../lib/CooldownManager.js");
        const { default: sessionCleaner } = await import("../lib/SessionCleaner.js");
        
        const cacheStats = groupCache.getStats();
        const cooldownStats = cooldown.getStats();
        const sessionStats = sessionCleaner.getStats();
        
        msg += `├ Group Cache: ${cacheStats.keys} groups\n`;
        msg += `│  └ Hit Rate: ${(cacheStats.hitRate * 100).toFixed(1)}%\n`;
        msg += `├ Cooldowns: ${cooldownStats.total} entries (${cooldownStats.active} active)\n`;
        msg += `├ Message Store: ${this.state?.messageStore?.size || 0} messages\n`;
        
        if (sessionStats) {
            msg += `└ Session Files: ${sessionStats.fileCount} files (${sessionStats.totalSizeMB} MB)\n`;
            msg += `   └ Cleanable: ${sessionStats.unprotectedCount} files (${sessionStats.cleanableSizeMB} MB)\n\n`;
        } else {
            msg += `└ Session: N/A\n\n`;
        }
        
        msg += `*🔌 ACTIVE CONNECTIONS*\n`;
        try {
            const netConnections = execSync("netstat -an | grep ESTABLISHED | wc -l", { encoding: "utf8" });
            msg += `└ Established: ${netConnections.trim()} connections\n\n`;
        } catch (e) {
            msg += `└ Unable to fetch\n\n`;
        }
        
        msg += `_Generated in ${responseTime}ms_`;
        
        await reply(msg);
        await m.react("✅");
    }
};