import os from "os";
import { exec } from "child_process";
import fs from "fs";
import util from "util";

const execPromise = util.promisify(exec);

export default async function ping(context) {
    const { reply } = context;
    
    try {
        const startTime = Date.now();
        
        const [
            systemInfo,
            cpuInfo,
            memoryInfo,
            diskInfo,
            networkInfo,
            processInfo,
            uptimeInfo,
            loadAvgInfo,
            platformInfo
        ] = await Promise.allSettled([
            getSystemInfo(),
            getCPUInfo(),
            getMemoryInfo(),
            getDiskInfo(),
            getNetworkInfo(),
            getProcessInfo(),
            getUptimeInfo(),
            getLoadAverage(),
            getPlatformInfo()
        ]);

        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        let message = `🚀 *SERVER SPECIFICATIONS & RESPONSE TIME*\n\n`;
        
        message += `⚡ *Response Time: ${responseTime}ms*\n`;
        message += `🕐 Test Time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n`;
        
        message += `═══════════════════════════════\n`;
        message += `📊 *SYSTEM OVERVIEW*\n`;
        message += `═══════════════════════════════\n`;
        if (systemInfo.status === 'fulfilled') {
            message += systemInfo.value;
        } else {
            message += `❌ System info error: ${systemInfo.reason.message}\n`;
        }
        
        message += `\n═══════════════════════════════\n`;
        message += `🖥️ *PLATFORM DETAILS*\n`;
        message += `═══════════════════════════════\n`;
        if (platformInfo.status === 'fulfilled') {
            message += platformInfo.value;
        } else {
            message += `❌ Platform info error: ${platformInfo.reason.message}\n`;
        }
        
        message += `\n═══════════════════════════════\n`;
        message += `⚙️ *CPU SPECIFICATIONS*\n`;
        message += `═══════════════════════════════\n`;
        if (cpuInfo.status === 'fulfilled') {
            message += cpuInfo.value;
        } else {
            message += `❌ CPU info error: ${cpuInfo.reason.message}\n`;
        }
        
        message += `\n═══════════════════════════════\n`;
        message += `🧠 *MEMORY DETAILS*\n`;
        message += `═══════════════════════════════\n`;
        if (memoryInfo.status === 'fulfilled') {
            message += memoryInfo.value;
        } else {
            message += `❌ Memory info error: ${memoryInfo.reason.message}\n`;
        }
        
        message += `\n═══════════════════════════════\n`;
        message += `💾 *STORAGE INFORMATION*\n`;
        message += `═══════════════════════════════\n`;
        if (diskInfo.status === 'fulfilled') {
            message += diskInfo.value;
        } else {
            message += `❌ Disk info error: ${diskInfo.reason.message}\n`;
        }
        
        message += `\n═══════════════════════════════\n`;
        message += `🌐 *NETWORK INTERFACES*\n`;
        message += `═══════════════════════════════\n`;
        if (networkInfo.status === 'fulfilled') {
            message += networkInfo.value;
        } else {
            message += `❌ Network info error: ${networkInfo.reason.message}\n`;
        }
        
        message += `\n═══════════════════════════════\n`;
        message += `📈 *PERFORMANCE METRICS*\n`;
        message += `═══════════════════════════════\n`;
        if (loadAvgInfo.status === 'fulfilled') {
            message += loadAvgInfo.value;
        } else {
            message += `❌ Load average error: ${loadAvgInfo.reason.message}\n`;
        }
        
        message += `\n═══════════════════════════════\n`;
        message += `⏱️ *UPTIME & PROCESS INFO*\n`;
        message += `═══════════════════════════════\n`;
        if (uptimeInfo.status === 'fulfilled') {
            message += uptimeInfo.value;
        } else {
            message += `❌ Uptime info error: ${uptimeInfo.reason.message}\n`;
        }
        
        message += `\n═══════════════════════════════\n`;
        message += `🔧 *PROCESS DETAILS*\n`;
        message += `═══════════════════════════════\n`;
        if (processInfo.status === 'fulfilled') {
            message += processInfo.value;
        } else {
            message += `❌ Process info error: ${processInfo.reason.message}\n`;
        }
        
        await reply(message);
        
    } catch (error) {
        await reply(`❌ *Error occurred:*\n${error.message}`);
    }
}

async function getSystemInfo() {
    try {
        const hostname = os.hostname();
        const platform = os.platform();
        const arch = os.arch();
        const release = os.release();
        const version = os.version();
        const type = os.type();
        
        let osInfo = '';
        try {
            if (platform === 'linux') {
                const { stdout } = await execPromise('cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d"=" -f2 | tr -d \'"\'');
                osInfo = stdout.trim() || 'Unknown Linux Distribution';
            } else {
                osInfo = `${type} ${release}`;
            }
        } catch {
            osInfo = `${type} ${release}`;
        }
        
        return `🖥️ Hostname: ${hostname}\n` +
               `🐧 OS: ${osInfo}\n` +
               `⚙️ Platform: ${platform}\n` +
               `🏗️ Architecture: ${arch}\n` +
               `📋 Release: ${release}\n` +
               `📦 Version: ${version || 'N/A'}\n` +
               `🔧 Type: ${type}`;
    } catch (error) {
        throw new Error(`System info: ${error.message}`);
    }
}

async function getPlatformInfo() {
    try {
        let details = '';
        const platform = os.platform();
        
        try {
            if (platform === 'linux') {
                const kernelInfo = await execPromise('uname -r 2>/dev/null').catch(() => ({ stdout: 'Unknown' }));
                const cpuModel = await execPromise('cat /proc/cpuinfo 2>/dev/null | grep "model name" | head -1 | cut -d":" -f2 | xargs').catch(() => ({ stdout: 'Unknown' }));
                const timezone = await execPromise('timedatectl show -p Timezone --value 2>/dev/null || date +%Z').catch(() => ({ stdout: 'Unknown' }));
                
                details += `🐧 Kernel: ${kernelInfo.stdout.trim()}\n`;
                details += `🕐 Timezone: ${timezone.stdout.trim()}\n`;
                details += `💻 CPU Model: ${cpuModel.stdout.trim()}`;
            } else if (platform === 'win32') {
                const windowsInfo = await execPromise('wmic os get Caption,Version /format:list 2>nul').catch(() => ({ stdout: 'Unknown' }));
                details += `🪟 Windows Info: ${windowsInfo.stdout.replace(/\r?\n/g, ' ').trim()}`;
            } else if (platform === 'darwin') {
                const macInfo = await execPromise('sw_vers 2>/dev/null').catch(() => ({ stdout: 'Unknown' }));
                details += `🍎 macOS Info: ${macInfo.stdout.replace(/\r?\n/g, ' ').trim()}`;
            } else {
                details += `❓ Platform: ${platform} (Limited info available)`;
            }
        } catch {
            details += `❓ Platform: ${platform} (Error getting details)`;
        }
        
        return details;
    } catch (error) {
        throw new Error(`Platform info: ${error.message}`);
    }
}

async function getCPUInfo() {
    try {
        const cpus = os.cpus();
        const cpuCount = cpus.length;
        const cpuModel = cpus[0]?.model || 'Unknown';
        const cpuSpeed = cpus[0]?.speed || 0;
        
        let cpuUsage = 'N/A';
        let temperature = 'N/A';
        let cacheInfo = 'N/A';
        
        try {
            if (os.platform() === 'linux') {
                const loadavg = os.loadavg();
                cpuUsage = `${(loadavg[0] * 100 / cpuCount).toFixed(2)}%`;
                
                try {
                    const tempResult = await execPromise('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null');
                    const temp = parseInt(tempResult.stdout) / 1000;
                    temperature = `${temp.toFixed(1)}°C`;
                } catch {
                    const tempResult2 = await execPromise('sensors 2>/dev/null | grep "Core 0" | cut -d"+" -f2 | cut -d" " -f1').catch(() => ({ stdout: '' }));
                    if (tempResult2.stdout.trim()) {
                        temperature = tempResult2.stdout.trim();
                    }
                }
                
                try {
                    const cacheResult = await execPromise('lscpu 2>/dev/null | grep -E "L[1-3] cache"').catch(() => ({ stdout: '' }));
                    if (cacheResult.stdout.trim()) {
                        cacheInfo = cacheResult.stdout.replace(/\n/g, ', ').trim();
                    }
                } catch {}
            }
        } catch {}
        
        const cpuFeatures = [];
        try {
            if (cpus[0]?.features) {
                cpuFeatures.push(...cpus[0].features.slice(0, 5));
            }
        } catch {}
        
        return `💻 Model: ${cpuModel}\n` +
               `🔢 Cores: ${cpuCount}\n` +
               `⚡ Speed: ${cpuSpeed} MHz\n` +
               `📊 Usage: ${cpuUsage}\n` +
               `🌡️ Temperature: ${temperature}\n` +
               `💾 Cache: ${cacheInfo}\n` +
               `🚀 Features: ${cpuFeatures.length > 0 ? cpuFeatures.join(', ') : 'N/A'}`;
    } catch (error) {
        throw new Error(`CPU info: ${error.message}`);
    }
}

async function getMemoryInfo() {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const usagePercent = ((usedMem / totalMem) * 100).toFixed(2);
        
        let swapInfo = 'N/A';
        let bufferCache = 'N/A';
        let memoryType = 'N/A';
        let memorySpeed = 'N/A';
        
        try {
            if (os.platform() === 'linux') {
                try {
                    const meminfo = await execPromise('cat /proc/meminfo 2>/dev/null');
                    const meminfoLines = meminfo.stdout.split('\n');
                    
                    const swapTotal = meminfoLines.find(line => line.startsWith('SwapTotal:'));
                    const swapFree = meminfoLines.find(line => line.startsWith('SwapFree:'));
                    const buffers = meminfoLines.find(line => line.startsWith('Buffers:'));
                    const cached = meminfoLines.find(line => line.startsWith('Cached:'));
                    
                    if (swapTotal && swapFree) {
                        const swapTotalKB = parseInt(swapTotal.split(/\s+/)[1]);
                        const swapFreeKB = parseInt(swapFree.split(/\s+/)[1]);
                        const swapUsedKB = swapTotalKB - swapFreeKB;
                        swapInfo = `${formatBytes(swapUsedKB * 1024)} / ${formatBytes(swapTotalKB * 1024)} (${((swapUsedKB / swapTotalKB) * 100).toFixed(2)}%)`;
                    }
                    
                    if (buffers && cached) {
                        const buffersKB = parseInt(buffers.split(/\s+/)[1]);
                        const cachedKB = parseInt(cached.split(/\s+/)[1]);
                        bufferCache = `${formatBytes((buffersKB + cachedKB) * 1024)}`;
                    }
                } catch {}
                
                try {
                    const dmidecode = await execPromise('sudo dmidecode -t memory 2>/dev/null | grep -E "(Type:|Speed:)" | head -2').catch(() => ({ stdout: '' }));
                    if (dmidecode.stdout.trim()) {
                        const lines = dmidecode.stdout.trim().split('\n');
                        memoryType = lines[0]?.split(':')[1]?.trim() || 'N/A';
                        memorySpeed = lines[1]?.split(':')[1]?.trim() || 'N/A';
                    }
                } catch {}
            }
        } catch {}
        
        return `💾 Total: ${formatBytes(totalMem)}\n` +
               `✅ Used: ${formatBytes(usedMem)} (${usagePercent}%)\n` +
               `🆓 Free: ${formatBytes(freeMem)}\n` +
               `🔄 Swap: ${swapInfo}\n` +
               `📦 Buffer/Cache: ${bufferCache}\n` +
               `🏷️ Type: ${memoryType}\n` +
               `⚡ Speed: ${memorySpeed}`;
    } catch (error) {
        throw new Error(`Memory info: ${error.message}`);
    }
}

async function getDiskInfo() {
    try {
        let diskInfo = '';
        
        try {
            if (os.platform() === 'linux') {
                const df = await execPromise('df -h 2>/dev/null | grep -E "^/dev/"').catch(() => ({ stdout: '' }));
                if (df.stdout) {
                    const lines = df.stdout.trim().split('\n');
                    diskInfo += '📁 *Mounted Filesystems:*\n';
                    lines.forEach((line, index) => {
                        const parts = line.split(/\s+/);
                        if (parts.length >= 6) {
                            diskInfo += `   ${index + 1}. ${parts[0]}: ${parts[2]}/${parts[1]} (${parts[4]}) → ${parts[5]}\n`;
                        }
                    });
                } else {
                    diskInfo += '❌ Could not get filesystem info\n';
                }
                
                try {
                    const lsblk = await execPromise('lsblk -d -o NAME,SIZE,TYPE,MODEL 2>/dev/null | grep disk').catch(() => ({ stdout: '' }));
                    if (lsblk.stdout) {
                        diskInfo += '\n💽 *Physical Disks:*\n';
                        const diskLines = lsblk.stdout.trim().split('\n');
                        diskLines.forEach((line, index) => {
                            const parts = line.split(/\s+/);
                            if (parts.length >= 3) {
                                const model = parts.slice(3).join(' ') || 'Unknown';
                                diskInfo += `   ${index + 1}. /dev/${parts[0]}: ${parts[1]} (${model})\n`;
                            }
                        });
                    }
                } catch {}
                
                try {
                    const iostat = await execPromise('iostat -d 1 1 2>/dev/null | tail -n +4 | grep -E "^[a-z]"').catch(() => ({ stdout: '' }));
                    if (iostat.stdout) {
                        diskInfo += '\n📊 *Disk I/O Stats:*\n';
                        const ioLines = iostat.stdout.trim().split('\n');
                        ioLines.slice(0, 3).forEach((line, index) => {
                            const parts = line.split(/\s+/);
                            if (parts.length >= 6) {
                                diskInfo += `   ${index + 1}. ${parts[0]}: Read ${parts[2]} KB/s, Write ${parts[3]} KB/s\n`;
                            }
                        });
                    }
                } catch {}
                
            } else if (os.platform() === 'win32') {
                try {
                    const wmic = await execPromise('wmic logicaldisk get size,freespace,caption 2>nul').catch(() => ({ stdout: '' }));
                    if (wmic.stdout) {
                        diskInfo += '💽 *Windows Drives:*\n';
                        const lines = wmic.stdout.trim().split('\n').slice(1);
                        lines.forEach((line, index) => {
                            const parts = line.trim().split(/\s+/);
                            if (parts.length >= 3) {
                                const caption = parts[0];
                                const freeSpace = formatBytes(parseInt(parts[1]) || 0);
                                const totalSpace = formatBytes(parseInt(parts[2]) || 0);
                                diskInfo += `   ${index + 1}. ${caption} ${freeSpace}/${totalSpace}\n`;
                            }
                        });
                    }
                } catch {}
            } else {
                diskInfo += `❓ Disk info not available for ${os.platform()}\n`;
            }
        } catch (error) {
            diskInfo += `❌ Error getting disk info: ${error.message}\n`;
        }
        
        if (!diskInfo.trim()) {
            diskInfo = '❌ No disk information available';
        }
        
        return diskInfo;
    } catch (error) {
        throw new Error(`Disk info: ${error.message}`);
    }
}

async function getNetworkInfo() {
    try {
        const networkInterfaces = os.networkInterfaces();
        let netInfo = '';
        
        let interfaceCount = 0;
        for (const [name, addresses] of Object.entries(networkInterfaces)) {
            if (interfaceCount >= 5) break;
            
            netInfo += `🌐 *${name}:*\n`;
            
            if (addresses && addresses.length > 0) {
                addresses.forEach((addr, index) => {
                    if (index < 2) {
                        netInfo += `   ${addr.family}: ${addr.address}`;
                        if (addr.netmask) netInfo += ` (${addr.netmask})`;
                        if (addr.mac && addr.mac !== '00:00:00:00:00:00') netInfo += ` [${addr.mac}]`;
                        netInfo += `\n`;
                    }
                });
            } else {
                netInfo += '   No addresses\n';
            }
            
            interfaceCount++;
        }
        
        try {
            if (os.platform() === 'linux') {
                const publicIp = await execPromise('curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "N/A"').catch(() => ({ stdout: 'N/A' }));
                netInfo += `\n🌍 Public IP: ${publicIp.stdout.trim()}\n`;
                
                const netstat = await execPromise('netstat -i 2>/dev/null | grep -E "^[a-z]" | head -3').catch(() => ({ stdout: '' }));
                if (netstat.stdout) {
                    netInfo += '\n📊 *Interface Stats:*\n';
                    const lines = netstat.stdout.trim().split('\n');
                    lines.forEach((line, index) => {
                        const parts = line.split(/\s+/);
                        if (parts.length >= 8) {
                            netInfo += `   ${index + 1}. ${parts[0]}: RX ${parts[3]} packets, TX ${parts[7]} packets\n`;
                        }
                    });
                }
            }
        } catch {}
        
        return netInfo || '❌ No network information available';
    } catch (error) {
        throw new Error(`Network info: ${error.message}`);
    }
}

async function getProcessInfo() {
    try {
        const pid = process.pid;
        const ppid = process.ppid;
        const nodeVersion = process.version;
        const platform = process.platform;
        const arch = process.arch;
        const title = process.title;
        const argv = process.argv.slice(0, 3);
        
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        let processDetails = '';
        processDetails += `🆔 PID: ${pid}\n`;
        processDetails += `👨‍👦 PPID: ${ppid}\n`;
        processDetails += `🟢 Node.js: ${nodeVersion}\n`;
        processDetails += `🏗️ Platform: ${platform}\n`;
        processDetails += `⚙️ Architecture: ${arch}\n`;
        processDetails += `📋 Title: ${title}\n`;
        processDetails += `🚀 Command: ${argv.join(' ')}\n\n`;
        
        processDetails += `💾 *Memory Usage:*\n`;
        processDetails += `   RSS: ${formatBytes(memUsage.rss)}\n`;
        processDetails += `   Heap Total: ${formatBytes(memUsage.heapTotal)}\n`;
        processDetails += `   Heap Used: ${formatBytes(memUsage.heapUsed)}\n`;
        processDetails += `   External: ${formatBytes(memUsage.external)}\n`;
        processDetails += `   Array Buffers: ${formatBytes(memUsage.arrayBuffers)}\n\n`;
        
        processDetails += `⚡ *CPU Usage:*\n`;
        processDetails += `   User: ${cpuUsage.user} μs\n`;
        processDetails += `   System: ${cpuUsage.system} μs\n\n`;
        
        const envVars = ['NODE_ENV', 'PATH', 'HOME', 'USER', 'SHELL'];
        processDetails += `🌍 *Environment Variables:*\n`;
        envVars.forEach(envVar => {
            const value = process.env[envVar];
            if (value) {
                const displayValue = envVar === 'PATH' ? value.split(':').slice(0, 3).join(':') + '...' : value;
                processDetails += `   ${envVar}: ${displayValue.substring(0, 50)}${displayValue.length > 50 ? '...' : ''}\n`;
            }
        });
        
        try {
            if (os.platform() === 'linux') {
                const processCount = await execPromise('ps aux 2>/dev/null | wc -l').catch(() => ({ stdout: '0' }));
                processDetails += `\n📊 Total Processes: ${parseInt(processCount.stdout) - 1}`;
            }
        } catch {}
        
        return processDetails;
    } catch (error) {
        throw new Error(`Process info: ${error.message}`);
    }
}

async function getUptimeInfo() {
    try {
        const osUptime = os.uptime();
        const processUptime = process.uptime();
        
        let uptimeDetails = '';
        uptimeDetails += `🖥️ System Uptime: ${formatUptime(osUptime)}\n`;
        uptimeDetails += `🤖 Process Uptime: ${formatUptime(processUptime)}\n`;
        
        try {
            if (os.platform() === 'linux') {
                const bootTime = await execPromise('stat -c %Y /proc/1 2>/dev/null').catch(() => ({ stdout: '0' }));
                const bootDate = new Date(parseInt(bootTime.stdout) * 1000);
                uptimeDetails += `🚀 Boot Time: ${bootDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`;
                
                const users = await execPromise('who 2>/dev/null | wc -l').catch(() => ({ stdout: '0' }));
                uptimeDetails += `👥 Active Users: ${users.stdout.trim()}\n`;
                
                const lastReboot = await execPromise('last reboot 2>/dev/null | head -1 | awk \'{print $5, $6, $7, $8}\'').catch(() => ({ stdout: 'N/A' }));
                uptimeDetails += `🔄 Last Reboot: ${lastReboot.stdout.trim()}`;
            }
        } catch {}
        
        return uptimeDetails;
    } catch (error) {
        throw new Error(`Uptime info: ${error.message}`);
    }
}

async function getLoadAverage() {
    try {
        const loadavg = os.loadavg();
        const cpuCount = os.cpus().length;
        
        let loadInfo = '';
        loadInfo += `📊 Load Average:\n`;
        loadInfo += `   1 min: ${loadavg[0].toFixed(2)} (${((loadavg[0] / cpuCount) * 100).toFixed(1)}%)\n`;
        loadInfo += `   5 min: ${loadavg[1].toFixed(2)} (${((loadavg[1] / cpuCount) * 100).toFixed(1)}%)\n`;
        loadInfo += `   15 min: ${loadavg[2].toFixed(2)} (${((loadavg[2] / cpuCount) * 100).toFixed(1)}%)\n`;
        
        const loadStatus = loadavg[0] / cpuCount;
        if (loadStatus < 0.7) {
            loadInfo += `✅ Status: Low Load\n`;
        } else if (loadStatus < 1.0) {
            loadInfo += `⚠️ Status: Moderate Load\n`;
        } else {
            loadInfo += `🔴 Status: High Load\n`;
        }
        
        try {
            if (os.platform() === 'linux') {
                const vmstat = await execPromise('vmstat 1 1 2>/dev/null | tail -1').catch(() => ({ stdout: '' }));
                if (vmstat.stdout) {
                    const parts = vmstat.stdout.trim().split(/\s+/);
                    if (parts.length >= 15) {
                        loadInfo += `\n📈 *System Stats:*\n`;
                        loadInfo += `   Running: ${parts[1]} processes\n`;
                        loadInfo += `   Blocked: ${parts[2]} processes\n`;
                        loadInfo += `   User CPU: ${parts[12]}%\n`;
                        loadInfo += `   System CPU: ${parts[13]}%\n`;
                        loadInfo += `   Idle CPU: ${parts[14]}%\n`;
                        loadInfo += `   I/O Wait: ${parts[15] || 'N/A'}%`;
                    }
                }
            }
        } catch {}
        
        return loadInfo;
    } catch (error) {
        throw new Error(`Load average: ${error.message}`);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;
    
    return result;
}