import os from "os";
import { performance } from "perf_hooks";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatUptime = seconds => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

const getCPUUsage = () => {
    return new Promise(resolve => {
        const startUsage = process.cpuUsage();
        const startTime = performance.now();

        setTimeout(() => {
            const endUsage = process.cpuUsage(startUsage);
            const endTime = performance.now();
            const elapsedTime = endTime - startTime;

            const userPercent = (endUsage.user / 1000 / elapsedTime) * 100;
            const systemPercent = (endUsage.system / 1000 / elapsedTime) * 100;
            const totalPercent = userPercent + systemPercent;

            resolve({
                user: userPercent.toFixed(2),
                system: systemPercent.toFixed(2),
                total: totalPercent.toFixed(2)
            });
        }, 100);
    });
};

const getNetworkStats = async () => {
    try {
        if (process.platform === "linux") {
            const { stdout } = await execPromise("cat /proc/net/dev");
            const lines = stdout.split("\n");
            let totalRx = 0;
            let totalTx = 0;

            for (let i = 2; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const parts = line.split(/\s+/);
                if (parts[0].includes(":")) {
                    totalRx += parseInt(parts[1]) || 0;
                    totalTx += parseInt(parts[9]) || 0;
                }
            }

            return {
                received: formatBytes(totalRx),
                transmitted: formatBytes(totalTx),
                total: formatBytes(totalRx + totalTx)
            };
        }
        return null;
    } catch (e) {
        return null;
    }
};

const getDiskUsage = async () => {
    try {
        if (process.platform === "linux") {
            const { stdout } = await execPromise("df -h / | tail -1");
            const parts = stdout.trim().split(/\s+/);
            return {
                total: parts[1],
                used: parts[2],
                available: parts[3],
                usedPercent: parts[4]
            };
        } else if (process.platform === "win32") {
            const { stdout } = await execPromise(
                "wmic logicaldisk get size,freespace,caption"
            );
            return { info: stdout.trim() };
        }
        return null;
    } catch (e) {
        return null;
    }
};

const getLoadAverage = () => {
    const loadavg = os.loadavg();
    return {
        "1min": loadavg[0].toFixed(2),
        "5min": loadavg[1].toFixed(2),
        "15min": loadavg[2].toFixed(2)
    };
};

const getUserInfo = () => {
    try {
        const userInfo = os.userInfo();
        return {
            username: userInfo.username || "unknown",
            homedir: userInfo.homedir || os.homedir()
        };
    } catch (e) {
        return {
            username: process.env.USER || process.env.USERNAME || "unknown",
            homedir: os.homedir()
        };
    }
};

export default {
  desc: "menampilkan kecepatan respon",
    async execute({ m, sock }) {
        const startTime = performance.now();

        const cpuUsage = await getCPUUsage();
        const networkStats = await getNetworkStats();
        const diskUsage = await getDiskUsage();
        const loadAvg = getLoadAverage();
        const userInfo = getUserInfo();

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memPercent = ((usedMem / totalMem) * 100).toFixed(2);

        const cpus = os.cpus();
        const cpuModel = cpus[0].model;
        const cpuCores = cpus.length;
        const cpuSpeed = cpus[0].speed;

        let cpuTimes = {
            user: 0,
            nice: 0,
            sys: 0,
            idle: 0,
            irq: 0
        };

        cpus.forEach(cpu => {
            cpuTimes.user += cpu.times.user;
            cpuTimes.nice += cpu.times.nice;
            cpuTimes.sys += cpu.times.sys;
            cpuTimes.idle += cpu.times.idle;
            cpuTimes.irq += cpu.times.irq;
        });

        const total =
            cpuTimes.user +
            cpuTimes.nice +
            cpuTimes.sys +
            cpuTimes.idle +
            cpuTimes.irq;
        const cpuTimePercent = {
            user: ((cpuTimes.user / total) * 100).toFixed(2),
            nice: ((cpuTimes.nice / total) * 100).toFixed(2),
            sys: ((cpuTimes.sys / total) * 100).toFixed(2),
            idle: ((cpuTimes.idle / total) * 100).toFixed(2),
            irq: ((cpuTimes.irq / total) * 100).toFixed(2)
        };

        const networkInterfaces = os.networkInterfaces();
        let networkInfo = "";
        Object.keys(networkInterfaces).forEach(iface => {
            networkInterfaces[iface].forEach(addr => {
                if (!addr.internal) {
                    networkInfo += `\n ${iface}: ${addr.address} (${addr.family})`;
                }
            });
        });

        const processMemUsage = process.memoryUsage();
        const heapUsedPercent = (
            (processMemUsage.heapUsed / processMemUsage.heapTotal) *
            100
        ).toFixed(2);

        const endTime = performance.now();
        const responseTime = (endTime - startTime).toFixed(2);

        let msg = `╔════════════════════════════════\n`;
        msg += `║ ⚡ BOT SYSTEM DIAGNOSTICS\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║\n`;
        msg += `║ 🎯 RESPONSE TIME\n`;
        msg += `║ ${responseTime} ms\n`;
        msg += `║\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║ 💻 SYSTEM INFORMATION\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║\n`;
        msg += `║ 🖥️ Platform: ${os.platform()}\n`;
        msg += `║ 📦 Architecture: ${os.arch()}\n`;
        msg += `║ 🏷️ OS Type: ${os.type()}\n`;
        msg += `║ 📝 OS Release: ${os.release()}\n`;
        msg += `║ 🏠 Hostname: ${os.hostname()}\n`;
        msg += `║ 👤 User: ${userInfo.username}\n`;
        msg += `║ 🏡 Home Dir: ${userInfo.homedir}\n`;
        msg += `║ 📁 Temp Dir: ${os.tmpdir()}\n`;
        msg += `║ ⏰ Uptime: ${formatUptime(os.uptime())}\n`;
        msg += `║ 🔢 Endianness: ${os.endianness()}\n`;
        msg += `║\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║ 🧠 CPU DETAILS\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║\n`;
        msg += `║ 🔧 Model: ${cpuModel}\n`;
        msg += `║ 🔢 Cores: ${cpuCores}\n`;
        msg += `║ ⚡ Speed: ${cpuSpeed} MHz\n`;
        msg += `║\n`;
        msg += `║ 📊 CPU USAGE (PROCESS)\n`;
        msg += `║ User: ${cpuUsage.user}%\n`;
        msg += `║ System: ${cpuUsage.system}%\n`;
        msg += `║ Total: ${cpuUsage.total}%\n`;
        msg += `║\n`;
        msg += `║ ⏱️ CPU TIME DISTRIBUTION\n`;
        msg += `║ User: ${cpuTimePercent.user}%\n`;
        msg += `║ Nice: ${cpuTimePercent.nice}%\n`;
        msg += `║ System: ${cpuTimePercent.sys}%\n`;
        msg += `║ Idle: ${cpuTimePercent.idle}%\n`;
        msg += `║ IRQ: ${cpuTimePercent.irq}%\n`;
        msg += `║\n`;
        msg += `║ 📈 LOAD AVERAGE\n`;
        msg += `║ 1 min: ${loadAvg["1min"]}\n`;
        msg += `║ 5 min: ${loadAvg["5min"]}\n`;
        msg += `║ 15 min: ${loadAvg["15min"]}\n`;
        msg += `║\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║ 🧮 MEMORY (SYSTEM)\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║\n`;
        msg += `║ 💾 Total: ${formatBytes(totalMem)}\n`;
        msg += `║ 📊 Used: ${formatBytes(usedMem)} (${memPercent}%)\n`;
        msg += `║ 🆓 Free: ${formatBytes(freeMem)}\n`;
        msg += `║\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║ 🔬 MEMORY (PROCESS)\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║\n`;
        msg += `║ 📦 RSS: ${formatBytes(processMemUsage.rss)}\n`;
        msg += `║ 🏔️ Heap Total: ${formatBytes(processMemUsage.heapTotal)}\n`;
        msg += `║ 📊 Heap Used: ${formatBytes(
            processMemUsage.heapUsed
        )} (${heapUsedPercent}%)\n`;
        msg += `║ 🔧 External: ${formatBytes(processMemUsage.external)}\n`;
        msg += `║ 🔢 Array Buffers: ${formatBytes(
            processMemUsage.arrayBuffers
        )}\n`;
        msg += `║\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║ 🌐 NETWORK INTERFACES\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║${networkInfo}\n`;
        msg += `║\n`;

        if (networkStats) {
            msg += `╠════════════════════════════════\n`;
            msg += `║ 📡 NETWORK STATISTICS\n`;
            msg += `╠════════════════════════════════\n`;
            msg += `║\n`;
            msg += `║ 📥 Received: ${networkStats.received}\n`;
            msg += `║ 📤 Transmitted: ${networkStats.transmitted}\n`;
            msg += `║ 📊 Total: ${networkStats.total}\n`;
            msg += `║\n`;
        }

        if (diskUsage) {
            msg += `╠════════════════════════════════\n`;
            msg += `║ 💿 DISK USAGE\n`;
            msg += `╠════════════════════════════════\n`;
            msg += `║\n`;
            if (diskUsage.total) {
                msg += `║ 💾 Total: ${diskUsage.total}\n`;
                msg += `║ 📊 Used: ${diskUsage.used} (${diskUsage.usedPercent})\n`;
                msg += `║ 🆓 Available: ${diskUsage.available}\n`;
            } else if (diskUsage.info) {
                msg += `║ ${diskUsage.info}\n`;
            }
            msg += `║\n`;
        }

        msg += `╠════════════════════════════════\n`;
        msg += `║ 🔧 NODE.JS RUNTIME\n`;
        msg += `╠════════════════════════════════\n`;
        msg += `║\n`;
        msg += `║ 📦 Version: ${process.version}\n`;
        msg += `║ 🏗️ V8: ${process.versions.v8}\n`;
        msg += `║ 🔐 OpenSSL: ${process.versions.openssl}\n`;
        msg += `║ 📚 UV: ${process.versions.uv}\n`;
        msg += `║ 🔗 Zlib: ${process.versions.zlib}\n`;
        msg += `║ 🌐 HTTP Parser: ${process.versions.http_parser}\n`;
        msg += `║ 🔢 Process ID: ${process.pid}\n`;
        msg += `║ 🔢 Parent PID: ${process.ppid}\n`;
        msg += `║ ⏰ Uptime: ${formatUptime(process.uptime())}\n`;
        msg += `║ 📂 Working Dir: ${process.cwd()}\n`;
        msg += `║ 🔧 Exec Path: ${process.execPath}\n`;
        msg += `║\n`;
        msg += `╚════════════════════════════════`;

        await m.reply(msg);
    }
};
