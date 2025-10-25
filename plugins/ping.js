import os from "os";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async ({ m, reply }) => {
    const startTime = Date.now();

    try {
        const pingResult = await Promise.race([
            execAsync("ping -c 1 8.8.8.8"),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 5000)
            )
        ]);

        const diskInfo = await execAsync("df -h /").catch(() => ({
            stdout: "N/A"
        }));
        const memInfo = await execAsync("free -h").catch(() => ({
            stdout: "N/A"
        }));
        const cpuInfo = await execAsync("lscpu").catch(() => ({
            stdout: "N/A"
        }));
        const uptimeInfo = await execAsync("uptime -p").catch(() => ({
            stdout: "N/A"
        }));
        const networkInfo = await execAsync("ip route | grep default").catch(
            () => ({ stdout: "N/A" })
        );
        const processInfo = await execAsync(
            "ps aux --sort=-%cpu | head -10"
        ).catch(() => ({ stdout: "N/A" }));
        const kernelInfo = await execAsync("uname -a").catch(() => ({
            stdout: "N/A"
        }));
        const thermalInfo = await execAsync("sensors").catch(() => ({
            stdout: "Sensor tidak tersedia"
        }));
        const ioInfo = await execAsync("iostat -x 1 1").catch(() => ({
            stdout: "N/A"
        }));
        const networkStats = await execAsync("cat /proc/net/dev").catch(() => ({
            stdout: "N/A"
        }));

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        const platform = os.platform();
        const architecture = os.arch();
        const hostname = os.hostname();
        const release = os.release();
        const type = os.type();
        const uptime = os.uptime();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const cpus = os.cpus();
        const loadAvg = os.loadavg();
        const networkInterfaces = os.networkInterfaces();

        const formatBytes = bytes => {
            const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
            if (bytes === 0) return "0 Bytes";
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return (
                Math.round((bytes / Math.pow(1024, i)) * 100) / 100 +
                " " +
                sizes[i]
            );
        };

        const formatUptime = seconds => {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return `${days}d ${hours}h ${minutes}m ${secs}s`;
        };

        const getPingLatency = pingOutput => {
            const match = pingOutput.match(/time=([0-9.]+)\s*ms/);
            return match ? parseFloat(match[1]) : "N/A";
        };

        const getMemoryUsagePercent = () => {
            return ((usedMem / totalMem) * 100).toFixed(2);
        };

        const getCpuUsage = async () => {
            try {
                const { stdout } = await execAsync(
                    "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1"
                );
                return stdout.trim() || "N/A";
            } catch {
                return "N/A";
            }
        };

        const getSwapInfo = async () => {
            try {
                const { stdout } = await execAsync("free -h | grep Swap");
                return stdout.trim() || "Tidak ada swap";
            } catch {
                return "N/A";
            }
        };

        const getDiskUsage = diskOutput => {
            const lines = diskOutput.split("\n");
            const rootLine = lines.find(
                line => line.includes("/") && line.includes("%")
            );
            return rootLine ? rootLine.split(/\s+/) : ["N/A"];
        };

        const getNetworkInterfaces = () => {
            let interfaceInfo = "";
            Object.keys(networkInterfaces).forEach(interface => {
                const addresses = networkInterfaces[interface];
                interfaceInfo += `\n   🔌 ${interface}:\n`;
                addresses.forEach(addr => {
                    if (addr.family === "IPv4") {
                        interfaceInfo += `      IPv4: ${addr.address}/${addr.netmask}\n`;
                        interfaceInfo += `      MAC: ${addr.mac}\n`;
                        interfaceInfo += `      Internal: ${
                            addr.internal ? "Ya" : "Tidak"
                        }\n`;
                    }
                });
            });
            return interfaceInfo;
        };

        const getTopProcesses = processOutput => {
            const lines = processOutput.split("\n").slice(1, 6);
            let processInfo = "";
            lines.forEach((line, index) => {
                if (line.trim()) {
                    const parts = line.split(/\s+/);
                    if (parts.length >= 11) {
                        processInfo += `   ${index + 1}. ${parts[10]} (CPU: ${
                            parts[2]
                        }%, MEM: ${parts[3]}%)\n`;
                    }
                }
            });
            return processInfo || "N/A";
        };

        const cpuUsage = await getCpuUsage();
        const swapInfo = await getSwapInfo();
        const diskUsage = getDiskUsage(diskInfo.stdout);
        const pingLatency = getPingLatency(pingResult.stdout);

        let response = `🤖 *SISTEM MONITORING LENGKAP*\n\n`;

        response += `⚡ *PERFORMA & RESPONS*\n`;
        response += `├─ Response Time: ${responseTime}ms\n`;
        response += `├─ Ping Latency: ${pingLatency}ms\n`;
        response += `├─ Load Average: ${loadAvg[0].toFixed(
            2
        )}, ${loadAvg[1].toFixed(2)}, ${loadAvg[2].toFixed(2)}\n`;
        response += `└─ CPU Usage: ${cpuUsage}%\n\n`;

        response += `💻 *SISTEM OPERASI*\n`;
        response += `├─ Platform: ${platform}\n`;
        response += `├─ Type: ${type}\n`;
        response += `├─ Architecture: ${architecture}\n`;
        response += `├─ Release: ${release}\n`;
        response += `├─ Hostname: ${hostname}\n`;
        response += `├─ Kernel: ${kernelInfo.stdout.split("\n")[0] || "N/A"}\n`;
        response += `└─ Uptime: ${formatUptime(uptime)}\n\n`;

        response += `🧠 *MEMORI & STORAGE*\n`;
        response += `├─ Total RAM: ${formatBytes(totalMem)}\n`;
        response += `├─ Used RAM: ${formatBytes(
            usedMem
        )} (${getMemoryUsagePercent()}%)\n`;
        response += `├─ Free RAM: ${formatBytes(freeMem)}\n`;
        response += `├─ Swap: ${swapInfo}\n`;
        response += `├─ Disk Usage: ${diskUsage[4] || "N/A"} used of ${
            diskUsage[1] || "N/A"
        }\n`;
        response += `└─ Disk Available: ${diskUsage[3] || "N/A"}\n\n`;

        response += `⚙️ *PROSESOR DETAIL*\n`;
        response += `├─ Model: ${cpus[0]?.model || "N/A"}\n`;
        response += `├─ Cores: ${cpus.length}\n`;
        response += `├─ Speed: ${cpus[0]?.speed || "N/A"} MHz\n`;
        response += `└─ Architecture: ${architecture}\n\n`;

        response += `🌡️ *THERMAL & SENSOR*\n`;
        if (thermalInfo.stdout.includes("Sensor tidak tersedia")) {
            response += `└─ Sensor thermal tidak tersedia\n\n`;
        } else {
            const tempLines = thermalInfo.stdout
                .split("\n")
                .filter(line => line.includes("°C") && !line.includes("N/A"))
                .slice(0, 3);
            tempLines.forEach(line => {
                response += `├─ ${line.trim()}\n`;
            });
            response += `\n`;
        }

        response += `🌐 *JARINGAN & KONEKTIVITAS*\n`;
        response += `├─ Gateway: ${
            networkInfo.stdout.split(" ")[2] || "N/A"
        }\n`;
        response += `├─ Interface Aktif: ${
            Object.keys(networkInterfaces)
                .filter(iface =>
                    networkInterfaces[iface].some(
                        addr => !addr.internal && addr.family === "IPv4"
                    )
                )
                .join(", ") || "N/A"
        }\n`;
        response += getNetworkInterfaces();
        response += `\n`;

        response += `📊 *STATISTIK JARINGAN*\n`;
        const netLines = networkStats.stdout.split("\n").slice(2, 5);
        netLines.forEach(line => {
            if (line.trim() && !line.includes("lo:")) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 10) {
                    const iface = parts[0].replace(":", "");
                    const rxBytes = formatBytes(parseInt(parts[1]) || 0);
                    const txBytes = formatBytes(parseInt(parts[9]) || 0);
                    response += `├─ ${iface}: RX ${rxBytes}, TX ${txBytes}\n`;
                }
            }
        });
        response += `\n`;

        response += `🔄 *I/O & DISK PERFORMANCE*\n`;
        const ioLines = ioInfo.stdout
            .split("\n")
            .filter(
                line =>
                    line.includes("sd") ||
                    line.includes("nvme") ||
                    line.includes("vd")
            )
            .slice(0, 3);
        ioLines.forEach(line => {
            if (line.trim()) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 10) {
                    response += `├─ ${parts[0]}: Read ${parts[5]}KB/s, Write ${parts[6]}KB/s, Util ${parts[9]}%\n`;
                }
            }
        });
        if (ioLines.length === 0) {
            response += `└─ Data I/O tidak tersedia\n`;
        }
        response += `\n`;

        response += `📈 *TOP PROCESSES (CPU)*\n`;
        response += getTopProcesses(processInfo.stdout);
        response += `\n`;

        response += `🔧 *SISTEM TUNING*\n`;
        try {
            const { stdout: vmstat } = await execAsync(
                'cat /proc/vmstat | grep -E "nr_dirty|nr_writeback"'
            );
            const { stdout: schedstat } = await execAsync(
                "cat /proc/schedstat | head -1"
            );
            response += `├─ VM Stats: ${vmstat.replace(/\n/g, ", ")}\n`;
            response += `└─ Scheduler: ${schedstat
                .trim()
                .split(" ")
                .slice(0, 3)
                .join(" ")}\n\n`;
        } catch {
            response += `└─ VM Stats tidak tersedia\n\n`;
        }

        response += `⚡ *KINERJA REAL-TIME*\n`;
        const memPercent = getMemoryUsagePercent();
        const diskPercent = diskUsage[4] ? diskUsage[4].replace("%", "") : "0";

        const getStatus = (value, thresholds) => {
            if (value < thresholds[0]) return "🟢 Optimal";
            if (value < thresholds[1]) return "🟡 Normal";
            return "🔴 Tinggi";
        };

        response += `├─ CPU: ${getStatus(
            parseFloat(cpuUsage) || 0,
            [50, 80]
        )}\n`;
        response += `├─ Memory: ${getStatus(
            parseFloat(memPercent),
            [70, 90]
        )}\n`;
        response += `├─ Disk: ${getStatus(
            parseFloat(diskPercent),
            [80, 95]
        )}\n`;
        response += `├─ Network: ${getStatus(
            pingLatency !== "N/A" ? parseFloat(pingLatency) : 0,
            [100, 300]
        )}\n`;
        response += `└─ Overall: ${
            responseTime < 1000
                ? "🟢 Excellent"
                : responseTime < 3000
                ? "🟡 Good"
                : "🔴 Slow"
        }\n\n`;

        response += `📋 *RINGKASAN TEKNIS*\n`;
        response += `├─ Node.js: ${process.version}\n`;
        response += `├─ Process ID: ${process.pid}\n`;
        response += `├─ Process Uptime: ${formatUptime(process.uptime())}\n`;
        response += `├─ Memory Usage: ${formatBytes(
            process.memoryUsage().rss
        )}\n`;
        response += `└─ Working Directory: ${process.cwd()}\n\n`;

        response += `⏱️ *Scan completed in ${responseTime}ms*`;

        await reply(response);
    } catch (error) {
        await reply(
            `❌ Error: ${error.message}\nResponse time: ${
                Date.now() - startTime
            }ms`
        );
    }
};
