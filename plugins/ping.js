import os from "os";
import { execSync } from "child_process";
import fs from "fs";
import { performance } from "perf_hooks";
import v8 from "v8";

export default async function ({ m, reply }) {
    const startTime = performance.now();
    
    try {
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

        // Build complete message
        let msg = "╭━━━『 🖥️ *SERVER SPECIFICATIONS* 』━━━╮\n\n";

        // Performance
        msg += "┏━━━ *⚡ PERFORMANCE* ━━━\n";
        msg += `┃ • Response: ${responseTime}ms\n`;
        msg += `┃ • CPU: ${avgCpuUsage}%\n`;
        msg += `┃ • Memory: ${memUsagePercent}%\n`;
        msg += `┃ • Load: ${loadAvg.join(" / ")}\n`;
        if (temperatures.length > 0) {
            temperatures.forEach(temp => {
                msg += `┃ • ${temp.sensor}: ${temp.temp}\n`;
            });
        }
        msg += "┗━━━━━━━━━━━━━━━━━━\n\n";

        // System Info
        msg += "┏━━━ *💻 SYSTEM* ━━━\n";
        msg += `┃ • OS: ${osRelease}\n`;
        msg += `┃ • Kernel: ${kernelVersion}\n`;
        msg += `┃ • Platform: ${platform} (${arch})\n`;
        msg += `┃ • Type: ${type}\n`;
        msg += `┃ • Endian: ${endianness}\n`;
        msg += `┃ • Host: ${hostname}\n`;
        msg += `┃ • User: ${userInfo.username}\n`;
        msg += `┃ • UID/GID: ${userInfo.uid}/${userInfo.gid}\n`;
        msg += `┃ • Shell: ${shell}\n`;
        msg += `┃ • Uptime: ${uptime}\n`;
        msg += "┗━━━━━━━━━━━━━━━━━━\n\n";

        // CPU Summary
        msg += "┏━━━ *🔧 CPU* ━━━\n";
        msg += `┃ • Model: ${cpuModel}\n`;
        msg += `┃ • Cores: ${cpuCores}\n`;
        msg += `┃ • Speed: ${cpuSpeed} MHz\n`;
        msg += `┃ • Avg Usage: ${avgCpuUsage}%\n`;
        msg += "┃\n";
        cpuDetails.forEach(cpu => {
            msg += `┃ Core ${cpu.core}: ${cpu.usage}% @ ${cpu.speed}MHz\n`;
        });
        msg += "┗━━━━━━━━━━━━━━━━━━\n\n";

        // Memory
        msg += "┏━━━ *💾 MEMORY* ━━━\n";
        msg += `┃ Total: ${formatBytes(totalMem)}\n`;
        msg += `┃ Used: ${formatBytes(usedMem)} (${memUsagePercent}%)\n`;
        msg += `┃ Free: ${formatBytes(freeMem)}\n`;
        if (memoryDetails) {
            msg += `┃ Available: ${formatBytes(memoryDetails.MemAvailable)}\n`;
            msg += `┃ Buffers: ${formatBytes(memoryDetails.Buffers)}\n`;
            msg += `┃ Cached: ${formatBytes(memoryDetails.Cached)}\n`;
            msg += `┃ Active: ${formatBytes(memoryDetails.Active)}\n`;
            msg += `┃ Inactive: ${formatBytes(memoryDetails.Inactive)}\n`;
            if (memoryDetails.SwapTotal > 0) {
                msg += `┃ Swap: ${formatBytes(memoryDetails.SwapTotal - memoryDetails.SwapFree)}/${formatBytes(memoryDetails.SwapTotal)}\n`;
            }
        }
        msg += "┗━━━━━━━━━━━━━━━━━━\n\n";

        // Process Memory
        msg += "┏━━━ *🚀 PROCESS* ━━━\n";
        msg += `┃ PID: ${pid} | PPID: ${ppid}\n`;
        msg += `┃ Uptime: ${processUptime}\n`;
        msg += `┃ Node: ${nodeVersion}\n`;
        msg += `┃ V8: ${v8Versions.v8}\n`;
        msg += "┃\n";
        msg += `┃ RSS: ${formatBytes(memUsage.rss)}\n`;
        msg += `┃ Heap: ${formatBytes(memUsage.heapUsed)}/${formatBytes(memUsage.heapTotal)}\n`;
        msg += `┃ External: ${formatBytes(memUsage.external)}\n`;
        msg += `┃ Buffers: ${formatBytes(memUsage.arrayBuffers)}\n`;
        msg += "┃\n";
        msg += `┃ V8 Heap: ${formatBytes(v8HeapStats.used_heap_size)}/${formatBytes(v8HeapStats.heap_size_limit)}\n`;
        msg += `┃ Physical: ${formatBytes(v8HeapStats.total_physical_size)}\n`;
        msg += `┃ Available: ${formatBytes(v8HeapStats.total_available_size)}\n`;
        msg += "┗━━━━━━━━━━━━━━━━━━\n\n";

        // Disk
        if (diskInfo.length > 0) {
            msg += "┏━━━ *💿 DISK* ━━━\n";
            diskInfo.forEach((disk, i) => {
                if (i > 0) msg += "┃\n";
                msg += `┃ ${disk.filesystem}\n`;
                msg += `┃ Mount: ${disk.mount}\n`;
                msg += `┃ ${disk.used}/${disk.total} (${disk.usePercent})\n`;
                msg += `┃ Free: ${disk.available}\n`;
            });
            msg += "┗━━━━━━━━━━━━━━━━━━\n\n";
        }

        // Network
        msg += "┏━━━ *🌐 NETWORK* ━━━\n";
        const externalNets = networkInfo.filter(n => !n.internal);
        if (externalNets.length > 0) {
            externalNets.forEach((net, i) => {
                if (i > 0) msg += "┃\n";
                msg += `┃ ${net.name} (${net.family})\n`;
                msg += `┃ IP: ${net.address}\n`;
                msg += `┃ MAC: ${net.mac}\n`;
                msg += `┃ Mask: ${net.netmask}\n`;
            });
        } else {
            msg += `┃ No external interfaces\n`;
        }
        msg += "┗━━━━━━━━━━━━━━━━━━\n\n";

        // Versions
        msg += "┏━━━ *📦 VERSIONS* ━━━\n";
        Object.keys(v8Versions).forEach(key => {
            msg += `┃ ${key}: ${v8Versions[key]}\n`;
        });
        msg += "┗━━━━━━━━━━━━━━━━━━\n\n";

        // Resource Usage
        msg += "┏━━━ *📊 RESOURCES* ━━━\n";
        msg += `┃ User CPU: ${(resourceUsage.userCPUTime / 1000).toFixed(2)}ms\n`;
        msg += `┃ System CPU: ${(resourceUsage.systemCPUTime / 1000).toFixed(2)}ms\n`;
        msg += `┃ Max RSS: ${formatBytes(resourceUsage.maxRSS * 1024)}\n`;
        msg += `┃ Page Faults: ${resourceUsage.minorPageFault}/${resourceUsage.majorPageFault}\n`;
        msg += `┃ FS Read: ${resourceUsage.fsRead}\n`;
        msg += `┃ FS Write: ${resourceUsage.fsWrite}\n`;
        msg += `┃ IPC: ${resourceUsage.ipcSent}/${resourceUsage.ipcReceived}\n`;
        msg += `┃ Context Switch: ${resourceUsage.voluntaryContextSwitches}/${resourceUsage.involuntaryContextSwitches}\n`;
        msg += "┗━━━━━━━━━━━━━━━━━━\n\n";

        // Directories
        msg += "┏━━━ *📁 PATHS* ━━━\n";
        msg += `┃ Home: ${homeDir}\n`;
        msg += `┃ Temp: ${tmpDir}\n`;
        msg += `┃ CWD: ${process.cwd()}\n`;
        msg += `┃ Exec: ${process.execPath}\n`;
        msg += "┗━━━━━━━━━━━━━━━━━━\n\n";

        // V8 Heap Spaces
        msg += "┏━━━ *🔧 V8 HEAP SPACES* ━━━\n";
        v8HeapSpaceStats.forEach(space => {
            msg += `┃ ${space.space_name}:\n`;
            msg += `┃ ${formatBytes(space.space_used_size)}/${formatBytes(space.space_size)}\n`;
        });
        msg += "┗━━━━━━━━━━━━━━━━━━\n\n";

        // Limits (if available)
        if (Object.keys(limits).length > 0) {
            msg += "┏━━━ *⚙️ LIMITS* ━━━\n";
            const importantLimits = ["Max open files", "Max processes", "Max locked memory"];
            Object.keys(limits).forEach(key => {
                if (importantLimits.some(l => key.includes(l))) {
                    msg += `┃ ${key}:\n`;
                    msg += `┃ ${limits[key].soft} / ${limits[key].hard}\n`;
                }
            });
            msg += "┗━━━━━━━━━━━━━━━━━━\n\n";
        }

        // Battery (if available)
        if (batteryInfo.length > 0) {
            batteryInfo.forEach((bat, i) => {
                msg += `┏━━━ *🔋 ${bat.name}* ━━━\n`;
                msg += `┃ Capacity: ${bat.capacity}\n`;
                msg += `┃ Status: ${bat.status}\n`;
                msg += `┃ Voltage: ${bat.voltage}\n`;
                msg += `┃ Current: ${bat.current}\n`;
                msg += "┗━━━━━━━━━━━━━━━━━━\n";
                if (i < batteryInfo.length - 1) msg += "\n";
            });
            msg += "\n";
        }

        msg += "╰━━━━━━━━━━━━━━━━━━━╯";

        await reply(msg);
        await m.react("✅");
    } catch (error) {
        await m.react("❌");
        await reply(`❌ Error: ${error.message}`);
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