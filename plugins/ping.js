import os from "os";
import { execSync } from "child_process";
import fs from "fs";
import { performance } from "perf_hooks";
import v8 from "v8";

export default async function ({ m, reply }) {
    const startTime = performance.now();
    
    try {
        await m.react("🔍");

        // System Information
        const platform = os.platform();
        const arch = os.arch();
        const hostname = os.hostname();
        const uptime = formatUptime(os.uptime());
        const nodeVersion = process.version;
        const homeDir = os.homedir();
        const tmpDir = os.tmpdir();
        let userInfo = { username: "N/A", uid: "N/A", gid: "N/A" };
        try {
            userInfo = os.userInfo();
        } catch (e) {
            console.error("Unable to get user info:", e.message);
        }
        const endianness = os.endianness();
        const type = os.type();
        const release = os.release();

        // CPU Information - DETAIL PER CORE
        const cpus = os.cpus();
        const cpuModel = cpus[0].model;
        const cpuCores = cpus.length;
        const cpuSpeed = cpus[0].speed;
        
        // Calculate CPU usage per core
        let cpuDetails = [];
        cpus.forEach((cpu, index) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
            const idle = cpu.times.idle;
            const usage = ((1 - idle / total) * 100).toFixed(2);
            cpuDetails.push({
                core: index,
                model: cpu.model,
                speed: cpu.speed,
                usage: usage,
                times: {
                    user: cpu.times.user,
                    nice: cpu.times.nice,
                    sys: cpu.times.sys,
                    idle: cpu.times.idle,
                    irq: cpu.times.irq
                }
            });
        });
        const avgCpuUsage = (cpuDetails.reduce((a, b) => parseFloat(a) + parseFloat(b.usage), 0) / cpuDetails.length).toFixed(2);

        // Memory Information - SANGAT DETAIL
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);
        
        // Linux memory details
        let memoryDetails = null;
        try {
            if (platform === "linux" && fs.existsSync("/proc/meminfo")) {
                const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
                memoryDetails = parseMeminfo(meminfo);
            }
        } catch (e) {
            console.error("Memory details error:", e.message);
        }

        // Load Average
        const loadAvg = os.loadavg().map(load => load.toFixed(2));

        // Network Interfaces - DETAIL LENGKAP
        const networkInterfaces = os.networkInterfaces();
        let networkInfo = [];
        Object.keys(networkInterfaces).forEach(iface => {
            networkInterfaces[iface].forEach(addr => {
                networkInfo.push({
                    name: iface,
                    family: addr.family,
                    address: addr.address,
                    netmask: addr.netmask,
                    mac: addr.mac,
                    internal: addr.internal,
                    cidr: addr.cidr,
                    scopeid: addr.scopeid
                });
            });
        });

        // Disk Information - SEMUA PARTISI
        let diskInfo = [];
        try {
            if (platform === "linux") {
                const dfOutput = execSync("df -h").toString().trim();
                dfOutput.split("\n").slice(1).forEach(line => {
                    const parts = line.split(/\s+/);
                    if (parts.length >= 6) {
                        diskInfo.push({
                            filesystem: parts[0],
                            total: parts[1],
                            used: parts[2],
                            available: parts[3],
                            usePercent: parts[4],
                            mount: parts[5]
                        });
                    }
                });

                // Disk I/O stats
                try {
                    const iostat = execSync("iostat -x 1 2 | tail -n +4").toString();
                    // Parse iostat if available
                } catch (e) {
                    // iostat not available
                }
            }
        } catch (e) {
            console.error("Disk info error:", e.message);
        }

        // OS Release
        let osRelease = getOSRelease(platform);
        let kernelVersion = release;

        // Process Information - SANGAT DETAIL
        const pid = process.pid;
        const ppid = process.ppid;
        const processUptime = formatUptime(process.uptime());
        const memUsage = process.memoryUsage();
        const cpuUsageProcess = process.cpuUsage();
        const resourceUsage = process.resourceUsage();

        // Environment
        const env = process.env;
        const shell = env.SHELL || "N/A";
        const term = env.TERM || "N/A";
        const nodeEnv = env.NODE_ENV || "production";
        const path = env.PATH || "N/A";

        // System Limits (Linux)
        let limits = {};
        try {
            if (platform === "linux") {
                const limitsOutput = execSync(`cat /proc/${pid}/limits`).toString();
                limits = parseLimits(limitsOutput);
            }
        } catch (e) {
            // Ignore
        }

        // Temperature (Linux) - SEMUA SENSOR
        let temperatures = [];
        try {
            if (platform === "linux") {
                const thermalZones = fs.readdirSync("/sys/class/thermal").filter(f => f.startsWith("thermal_zone"));
                thermalZones.forEach(zone => {
                    try {
                        const tempPath = `/sys/class/thermal/${zone}/temp`;
                        const typePath = `/sys/class/thermal/${zone}/type`;
                        if (fs.existsSync(tempPath)) {
                            const temp = fs.readFileSync(tempPath, "utf8");
                            const type = fs.existsSync(typePath) ? fs.readFileSync(typePath, "utf8").trim() : zone;
                            temperatures.push({
                                sensor: type,
                                temp: (parseInt(temp) / 1000).toFixed(1) + "°C"
                            });
                        }
                    } catch (e) {
                        // Skip this sensor
                    }
                });
            }
        } catch (e) {
            // Ignore
        }

        // Battery Info (if available)
        let batteryInfo = [];
        try {
            if (platform === "linux" && fs.existsSync("/sys/class/power_supply")) {
                const batteries = fs.readdirSync("/sys/class/power_supply").filter(f => f.startsWith("BAT"));
                batteries.forEach(bat => {
                    try {
                        const basePath = `/sys/class/power_supply/${bat}`;
                        const capacity = fs.readFileSync(`${basePath}/capacity`, "utf8").trim();
                        const status = fs.readFileSync(`${basePath}/status`, "utf8").trim();
                        const voltage = fs.existsSync(`${basePath}/voltage_now`) 
                            ? (parseInt(fs.readFileSync(`${basePath}/voltage_now`, "utf8")) / 1000000).toFixed(2) + "V"
                            : "N/A";
                        const current = fs.existsSync(`${basePath}/current_now`)
                            ? (parseInt(fs.readFileSync(`${basePath}/current_now`, "utf8")) / 1000000).toFixed(2) + "A"
                            : "N/A";
                        batteryInfo.push({
                            name: bat,
                            capacity: capacity + "%",
                            status: status,
                            voltage: voltage,
                            current: current
                        });
                    } catch (e) {
                        // Skip
                    }
                });
            }
        } catch (e) {
            // Ignore
        }

        // V8 Engine Info - DETAIL
        const v8Versions = process.versions;
        const v8HeapStats = v8.getHeapStatistics();
        const v8HeapSpaceStats = v8.getHeapSpaceStatistics();

        // Calculate response time
        const endTime = performance.now();
        const responseTime = (endTime - startTime).toFixed(2);

        // Build message - SPLIT MENJADI BEBERAPA PESAN
        let messages = [];
        
        // Message 1: Performance & System
        let msg1 = "╭━━━『 🖥️ *SERVER SPECS* 』━━━╮\n\n";
        msg1 += "┏━━━ *⚡ PERFORMANCE* ━━━\n";
        msg1 += `┃ • Response Time: ${responseTime}ms\n`;
        msg1 += `┃ • CPU Usage: ${avgCpuUsage}%\n`;
        msg1 += `┃ • Memory Usage: ${memUsagePercent}%\n`;
        msg1 += `┃ • Load [1m/5m/15m]: ${loadAvg.join(" / ")}\n`;
        msg1 += "┗━━━━━━━━━━━━━━━━━━\n\n";

        msg1 += "┏━━━ *💻 SYSTEM INFO* ━━━\n";
        msg1 += `┃ • OS: ${osRelease}\n`;
        msg1 += `┃ • Kernel: ${kernelVersion}\n`;
        msg1 += `┃ • Type: ${type}\n`;
        msg1 += `┃ • Platform: ${platform}\n`;
        msg1 += `┃ • Architecture: ${arch}\n`;
        msg1 += `┃ • Endianness: ${endianness}\n`;
        msg1 += `┃ • Hostname: ${hostname}\n`;
        msg1 += `┃ • User: ${userInfo.username}\n`;
        msg1 += `┃ • UID: ${userInfo.uid}\n`;
        msg1 += `┃ • GID: ${userInfo.gid}\n`;
        msg1 += `┃ • Shell: ${shell}\n`;
        msg1 += `┃ • Terminal: ${term}\n`;
        msg1 += `┃ • System Uptime: ${uptime}\n`;
        msg1 += "┗━━━━━━━━━━━━━━━━━━\n\n";
        msg1 += "╰━━━━━━━━━━━━━━━━━━━╯";
        messages.push(msg1);

        // Message 2: CPU Details - PER CORE
        let msg2 = "╭━━━『 🔧 *CPU DETAILS* 』━━━╮\n\n";
        msg2 += "┏━━━ *CPU INFO* ━━━\n";
        msg2 += `┃ • Model: ${cpuModel}\n`;
        msg2 += `┃ • Cores: ${cpuCores}\n`;
        msg2 += `┃ • Speed: ${cpuSpeed} MHz\n`;
        msg2 += `┃ • Average Usage: ${avgCpuUsage}%\n`;
        msg2 += "┗━━━━━━━━━━━━━━━━━━\n\n";

        cpuDetails.forEach(cpu => {
            msg2 += `┏━━━ *CORE ${cpu.core}* ━━━\n`;
            msg2 += `┃ • Speed: ${cpu.speed} MHz\n`;
            msg2 += `┃ • Usage: ${cpu.usage}%\n`;
            msg2 += `┃ • User Time: ${cpu.times.user}ms\n`;
            msg2 += `┃ • Nice Time: ${cpu.times.nice}ms\n`;
            msg2 += `┃ • System Time: ${cpu.times.sys}ms\n`;
            msg2 += `┃ • Idle Time: ${cpu.times.idle}ms\n`;
            msg2 += `┃ • IRQ Time: ${cpu.times.irq}ms\n`;
            msg2 += "┗━━━━━━━━━━━━━━━━━━\n";
            if (cpu.core < cpuDetails.length - 1) msg2 += "\n";
        });
        
        if (temperatures.length > 0) {
            msg2 += "\n┏━━━ *🌡️ TEMPERATURES* ━━━\n";
            temperatures.forEach(temp => {
                msg2 += `┃ • ${temp.sensor}: ${temp.temp}\n`;
            });
            msg2 += "┗━━━━━━━━━━━━━━━━━━\n";
        }
        msg2 += "\n╰━━━━━━━━━━━━━━━━━━━╯";
        messages.push(msg2);

        // Message 3: Memory Details
        let msg3 = "╭━━━『 💾 *MEMORY DETAILS* 』━━━╮\n\n";
        msg3 += "┏━━━ *SYSTEM MEMORY* ━━━\n";
        msg3 += `┃ • Total: ${formatBytes(totalMem)}\n`;
        msg3 += `┃ • Used: ${formatBytes(usedMem)} (${memUsagePercent}%)\n`;
        msg3 += `┃ • Free: ${formatBytes(freeMem)}\n`;
        
        if (memoryDetails) {
            msg3 += `┃ • Available: ${formatBytes(memoryDetails.MemAvailable)}\n`;
            msg3 += `┃ • Buffers: ${formatBytes(memoryDetails.Buffers)}\n`;
            msg3 += `┃ • Cached: ${formatBytes(memoryDetails.Cached)}\n`;
            msg3 += `┃ • Active: ${formatBytes(memoryDetails.Active)}\n`;
            msg3 += `┃ • Inactive: ${formatBytes(memoryDetails.Inactive)}\n`;
            msg3 += `┃ • Dirty: ${formatBytes(memoryDetails.Dirty)}\n`;
            msg3 += `┃ • Writeback: ${formatBytes(memoryDetails.Writeback)}\n`;
            msg3 += `┃ • Slab: ${formatBytes(memoryDetails.Slab)}\n`;
            if (memoryDetails.SwapTotal > 0) {
                msg3 += "┃\n";
                msg3 += `┃ • Swap Total: ${formatBytes(memoryDetails.SwapTotal)}\n`;
                msg3 += `┃ • Swap Free: ${formatBytes(memoryDetails.SwapFree)}\n`;
                msg3 += `┃ • Swap Used: ${formatBytes(memoryDetails.SwapTotal - memoryDetails.SwapFree)}\n`;
            }
        }
        msg3 += "┗━━━━━━━━━━━━━━━━━━\n\n";

        msg3 += "┏━━━ *PROCESS MEMORY* ━━━\n";
        msg3 += `┃ • RSS: ${formatBytes(memUsage.rss)}\n`;
        msg3 += `┃ • Heap Total: ${formatBytes(memUsage.heapTotal)}\n`;
        msg3 += `┃ • Heap Used: ${formatBytes(memUsage.heapUsed)}\n`;
        msg3 += `┃ • External: ${formatBytes(memUsage.external)}\n`;
        msg3 += `┃ • Array Buffers: ${formatBytes(memUsage.arrayBuffers)}\n`;
        msg3 += "┗━━━━━━━━━━━━━━━━━━\n\n";

        msg3 += "┏━━━ *V8 HEAP* ━━━\n";
        msg3 += `┃ • Total: ${formatBytes(v8HeapStats.total_heap_size)}\n`;
        msg3 += `┃ • Executable: ${formatBytes(v8HeapStats.total_heap_size_executable)}\n`;
        msg3 += `┃ • Physical: ${formatBytes(v8HeapStats.total_physical_size)}\n`;
        msg3 += `┃ • Available: ${formatBytes(v8HeapStats.total_available_size)}\n`;
        msg3 += `┃ • Used: ${formatBytes(v8HeapStats.used_heap_size)}\n`;
        msg3 += `┃ • Limit: ${formatBytes(v8HeapStats.heap_size_limit)}\n`;
        msg3 += `┃ • Malloced: ${formatBytes(v8HeapStats.malloced_memory)}\n`;
        msg3 += `┃ • Peak Malloced: ${formatBytes(v8HeapStats.peak_malloced_memory)}\n`;
        msg3 += "┗━━━━━━━━━━━━━━━━━━\n\n";

        msg3 += "┏━━━ *V8 HEAP SPACES* ━━━\n";
        v8HeapSpaceStats.forEach(space => {
            msg3 += `┃ • ${space.space_name}:\n`;
            msg3 += `┃   Size: ${formatBytes(space.space_size)}\n`;
            msg3 += `┃   Used: ${formatBytes(space.space_used_size)}\n`;
            msg3 += `┃   Available: ${formatBytes(space.space_available_size)}\n`;
            msg3 += `┃   Physical: ${formatBytes(space.physical_space_size)}\n`;
        });
        msg3 += "┗━━━━━━━━━━━━━━━━━━\n\n";
        msg3 += "╰━━━━━━━━━━━━━━━━━━━╯";
        messages.push(msg3);

        // Message 4: Disk & Network
        let msg4 = "╭━━━『 💿 *STORAGE & NETWORK* 』━━━╮\n\n";
        
        if (diskInfo.length > 0) {
            diskInfo.forEach((disk, i) => {
                msg4 += `┏━━━ *DISK ${i + 1}* ━━━\n`;
                msg4 += `┃ • Filesystem: ${disk.filesystem}\n`;
                msg4 += `┃ • Mount: ${disk.mount}\n`;
                msg4 += `┃ • Total: ${disk.total}\n`;
                msg4 += `┃ • Used: ${disk.used} (${disk.usePercent})\n`;
                msg4 += `┃ • Available: ${disk.available}\n`;
                msg4 += "┗━━━━━━━━━━━━━━━━━━\n";
                if (i < diskInfo.length - 1) msg4 += "\n";
            });
            msg4 += "\n";
        }

        networkInfo.forEach((net, i) => {
            msg4 += `┏━━━ *NETWORK ${i + 1}* ━━━\n`;
            msg4 += `┃ • Interface: ${net.name}\n`;
            msg4 += `┃ • Type: ${net.family}\n`;
            msg4 += `┃ • Address: ${net.address}\n`;
            msg4 += `┃ • Netmask: ${net.netmask}\n`;
            msg4 += `┃ • MAC: ${net.mac}\n`;
            msg4 += `┃ • CIDR: ${net.cidr || "N/A"}\n`;
            msg4 += `┃ • Internal: ${net.internal ? "Yes" : "No"}\n`;
            if (net.scopeid) msg4 += `┃ • Scope ID: ${net.scopeid}\n`;
            msg4 += "┗━━━━━━━━━━━━━━━━━━\n";
            if (i < networkInfo.length - 1) msg4 += "\n";
        });
        
        msg4 += "\n╰━━━━━━━━━━━━━━━━━━━╯";
        messages.push(msg4);

        // Message 5: Process & Environment
        let msg5 = "╭━━━『 🚀 *PROCESS & ENV* 』━━━╮\n\n";
        msg5 += "┏━━━ *PROCESS INFO* ━━━\n";
        msg5 += `┃ • PID: ${pid}\n`;
        msg5 += `┃ • PPID: ${ppid}\n`;
        msg5 += `┃ • Uptime: ${processUptime}\n`;
        msg5 += `┃ • Title: ${process.title}\n`;
        msg5 += `┃ • Exec Path: ${process.execPath}\n`;
        msg5 += `┃ • Working Dir: ${process.cwd()}\n`;
        msg5 += "┗━━━━━━━━━━━━━━━━━━\n\n";

        msg5 += "┏━━━ *VERSIONS* ━━━\n";
        Object.keys(v8Versions).forEach(key => {
            msg5 += `┃ • ${key}: ${v8Versions[key]}\n`;
        });
        msg5 += "┗━━━━━━━━━━━━━━━━━━\n\n";

        msg5 += "┏━━━ *RESOURCE USAGE* ━━━\n";
        msg5 += `┃ • User CPU Time: ${(resourceUsage.userCPUTime / 1000).toFixed(2)}ms\n`;
        msg5 += `┃ • System CPU Time: ${(resourceUsage.systemCPUTime / 1000).toFixed(2)}ms\n`;
        msg5 += `┃ • Max RSS: ${formatBytes(resourceUsage.maxRSS * 1024)}\n`;
        msg5 += `┃ • Shared Memory: ${formatBytes(resourceUsage.sharedMemorySize)}\n`;
        msg5 += `┃ • Minor Page Fault: ${resourceUsage.minorPageFault}\n`;
        msg5 += `┃ • Major Page Fault: ${resourceUsage.majorPageFault}\n`;
        msg5 += `┃ • Swapped Out: ${resourceUsage.swappedOut}\n`;
        msg5 += `┃ • FS Read: ${resourceUsage.fsRead}\n`;
        msg5 += `┃ • FS Write: ${resourceUsage.fsWrite}\n`;
        msg5 += `┃ • IPC Sent: ${resourceUsage.ipcSent}\n`;
        msg5 += `┃ • IPC Received: ${resourceUsage.ipcReceived}\n`;
        msg5 += `┃ • Signals: ${resourceUsage.signalsCount}\n`;
        msg5 += `┃ • Context Switches (V): ${resourceUsage.voluntaryContextSwitches}\n`;
        msg5 += `┃ • Context Switches (IV): ${resourceUsage.involuntaryContextSwitches}\n`;
        msg5 += "┗━━━━━━━━━━━━━━━━━━\n\n";

        msg5 += "┏━━━ *ENVIRONMENT* ━━━\n";
        msg5 += `┃ • NODE_ENV: ${nodeEnv}\n`;
        msg5 += `┃ • Home Dir: ${homeDir}\n`;
        msg5 += `┃ • Temp Dir: ${tmpDir}\n`;
        msg5 += `┃ • Shell: ${shell}\n`;
        msg5 += `┃ • Terminal: ${term}\n`;
        msg5 += "┗━━━━━━━━━━━━━━━━━━\n\n";

        if (Object.keys(limits).length > 0) {
            msg5 += "┏━━━ *SYSTEM LIMITS* ━━━\n";
            Object.keys(limits).forEach(key => {
                msg5 += `┃ • ${key}:\n`;
                msg5 += `┃   Soft: ${limits[key].soft}\n`;
                msg5 += `┃   Hard: ${limits[key].hard}\n`;
            });
            msg5 += "┗━━━━━━━━━━━━━━━━━━\n\n";
        }

        if (batteryInfo.length > 0) {
            batteryInfo.forEach((bat, i) => {
                msg5 += `┏━━━ *BATTERY ${i + 1}* ━━━\n`;
                msg5 += `┃ • Name: ${bat.name}\n`;
                msg5 += `┃ • Capacity: ${bat.capacity}\n`;
                msg5 += `┃ • Status: ${bat.status}\n`;
                msg5 += `┃ • Voltage: ${bat.voltage}\n`;
                msg5 += `┃ • Current: ${bat.current}\n`;
                msg5 += "┗━━━━━━━━━━━━━━━━━━\n";
                if (i < batteryInfo.length - 1) msg5 += "\n";
            });
            msg5 += "\n";
        }

        msg5 += "╰━━━━━━━━━━━━━━━━━━━╯";
        messages.push(msg5);

        // Send all messages
        for (let i = 0; i < messages.length; i++) {
            await reply(messages[i]);
            if (i < messages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Delay between messages
            }
        }

        await m.react("✅");
    } catch (error) {
        await m.react("❌");
        await reply(`❌ Error: ${error.message}\n\nStack: ${error.stack}`);
        console.error(error);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let result = [];
    if (days > 0) result.push(`${days}d`);
    if (hours > 0) result.push(`${hours}h`);
    if (minutes > 0) result.push(`${minutes}m`);
    if (secs > 0 || result.length === 0) result.push(`${secs}s`);

    return result.join(" ");
}

function getOSRelease(platform) {
    try {
        if (platform === "linux" && fs.existsSync("/etc/os-release")) {
            const release = fs.readFileSync("/etc/os-release", "utf8");
            const prettyName = release.split("\n").find(line => line.startsWith("PRETTY_NAME="));
            if (prettyName) {
                return prettyName.split("=")[1].replace(/"/g, "").trim();
            }
        } else if (platform === "darwin") {
            const version = execSync("sw_vers -productVersion").toString().trim();
            return `macOS ${version}`;
        } else if (platform === "win32") {
            const version = execSync("ver").toString().trim();
            return version;
        }
    } catch (e) {
        // Ignore
    }
    return `${platform} ${os.release()}`;
}

function parseMeminfo(meminfo) {
    const lines = meminfo.split("\n");
    const result = {};
    
    lines.forEach(line => {
        const match = line.match(/^(\w+):\s+(\d+)/);
        if (match) {
            const key = match[1];
            const value = parseInt(match[2]) * 1024; // Convert KB to bytes
            result[key] = value;
        }
    });
    
    return result;
}

function parseLimits(limitsOutput) {
    const lines = limitsOutput.split("\n").slice(1); // Skip header
    const result = {};
    
    lines.forEach(line => {
        const parts = line.split(/\s{2,}/);
        if (parts.length >= 3) {
            const name = parts[0].trim();
            const soft = parts[1].trim();
            const hard = parts[2].trim();
            if (name) {
                result[name] = { soft, hard };
            }
        }
    });
    
    return result;
}