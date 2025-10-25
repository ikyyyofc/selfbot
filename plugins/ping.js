import os from "os";
import fs from "fs";
import { performance } from "perf_hooks";
import { execSync } from "child_process";

export default async ({ reply }) => {
    const startTime = performance.now();
    
    try {
        const getSystemInfo = () => {
            try {
                const cpus = os.cpus();
                const totalMem = os.totalmem();
                const freeMem = os.freemem();
                const usedMem = totalMem - freeMem;
                const platform = os.platform();
                const arch = os.arch();
                const release = os.release();
                const hostname = os.hostname();
                const uptime = os.uptime();
                const loadAvg = os.loadavg();
                const networkInterfaces = os.networkInterfaces();
                
                return {
                    cpus,
                    memory: { total: totalMem, free: freeMem, used: usedMem },
                    platform,
                    arch,
                    release,
                    hostname,
                    uptime,
                    loadAvg,
                    networkInterfaces
                };
            } catch (error) {
                throw new Error(`Failed to get system info: ${error.message}`);
            }
        };

        const getProcessInfo = () => {
            try {
                const processUptime = process.uptime();
                const processMemory = process.memoryUsage();
                const processCpuUsage = process.cpuUsage();
                const processVersion = process.version;
                const processVersions = process.versions;
                const processPid = process.pid;
                const processPpid = process.ppid;
                const processTitle = process.title;
                const processArgv = process.argv;
                const processEnv = {
                    NODE_ENV: process.env.NODE_ENV || 'not set',
                    PATH: process.env.PATH ? 'set' : 'not set',
                    HOME: process.env.HOME || 'not set'
                };

                return {
                    uptime: processUptime,
                    memory: processMemory,
                    cpuUsage: processCpuUsage,
                    version: processVersion,
                    versions: processVersions,
                    pid: processPid,
                    ppid: processPpid,
                    title: processTitle,
                    argv: processArgv,
                    env: processEnv
                };
            } catch (error) {
                throw new Error(`Failed to get process info: ${error.message}`);
            }
        };

        const getDiskInfo = () => {
            try {
                let diskInfo = {};
                
                if (os.platform() === 'linux') {
                    try {
                        const df = execSync('df -h /', { encoding: 'utf8' });
                        const lines = df.split('\n');
                        if (lines[1]) {
                            const parts = lines[1].split(/\s+/);
                            diskInfo = {
                                filesystem: parts[0],
                                size: parts[1],
                                used: parts[2],
                                available: parts[3],
                                usePercent: parts[4],
                                mountpoint: parts[5]
                            };
                        }
                    } catch (e) {
                        diskInfo = { error: 'Unable to get disk info on Linux' };
                    }
                } else if (os.platform() === 'win32') {
                    try {
                        const wmic = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf8' });
                        diskInfo = { raw: wmic };
                    } catch (e) {
                        diskInfo = { error: 'Unable to get disk info on Windows' };
                    }
                } else {
                    diskInfo = { error: `Disk info not supported for ${os.platform()}` };
                }

                return diskInfo;
            } catch (error) {
                return { error: `Failed to get disk info: ${error.message}` };
            }
        };

        const getDetailedCpuInfo = () => {
            try {
                let cpuInfo = {};
                
                if (os.platform() === 'linux') {
                    try {
                        const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
                        const lines = cpuinfo.split('\n');
                        
                        for (const line of lines) {
                            if (line.includes('model name')) {
                                cpuInfo.modelName = line.split(':')[1]?.trim();
                                break;
                            }
                        }
                        
                        const stat = fs.readFileSync('/proc/stat', 'utf8');
                        const cpuLine = stat.split('\n')[0];
                        const cpuTimes = cpuLine.split(/\s+/).slice(1).map(Number);
                        
                        cpuInfo.times = {
                            user: cpuTimes[0],
                            nice: cpuTimes[1],
                            system: cpuTimes[2],
                            idle: cpuTimes[3],
                            iowait: cpuTimes[4] || 0,
                            irq: cpuTimes[5] || 0,
                            softirq: cpuTimes[6] || 0
                        };
                    } catch (e) {
                        cpuInfo.error = 'Unable to read detailed CPU info from /proc';
                    }
                } else {
                    cpuInfo.note = 'Detailed CPU info only available on Linux';
                }

                return cpuInfo;
            } catch (error) {
                return { error: `Failed to get detailed CPU info: ${error.message}` };
            }
        };

        const getMemoryInfo = () => {
            try {
                let memInfo = {};
                
                if (os.platform() === 'linux') {
                    try {
                        const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
                        const lines = meminfo.split('\n');
                        
                        for (const line of lines) {
                            if (line.includes('MemTotal:')) memInfo.total = line.split(':')[1]?.trim();
                            if (line.includes('MemFree:')) memInfo.free = line.split(':')[1]?.trim();
                            if (line.includes('MemAvailable:')) memInfo.available = line.split(':')[1]?.trim();
                            if (line.includes('Buffers:')) memInfo.buffers = line.split(':')[1]?.trim();
                            if (line.includes('Cached:')) memInfo.cached = line.split(':')[1]?.trim();
                            if (line.includes('SwapTotal:')) memInfo.swapTotal = line.split(':')[1]?.trim();
                            if (line.includes('SwapFree:')) memInfo.swapFree = line.split(':')[1]?.trim();
                        }
                    } catch (e) {
                        memInfo.error = 'Unable to read memory info from /proc/meminfo';
                    }
                } else {
                    memInfo.note = 'Detailed memory info only available on Linux';
                }

                return memInfo;
            } catch (error) {
                return { error: `Failed to get memory info: ${error.message}` };
            }
        };

        const formatBytes = (bytes) => {
            try {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            } catch (error) {
                return 'N/A';
            }
        };

        const formatUptime = (seconds) => {
            try {
                const days = Math.floor(seconds / 86400);
                const hours = Math.floor((seconds % 86400) / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                return `${days}d ${hours}h ${minutes}m ${secs}s`;
            } catch (error) {
                return 'N/A';
            }
        };

        const systemInfo = getSystemInfo();
        const processInfo = getProcessInfo();
        const diskInfo = getDiskInfo();
        const detailedCpuInfo = getDetailedCpuInfo();
        const memoryInfo = getMemoryInfo();

        const endTime = performance.now();
        const responseTime = (endTime - startTime).toFixed(2);

        let message = `🚀 *SERVER SPECIFICATIONS & PERFORMANCE*\n\n`;
        
        message += `⚡ *RESPONSE TIME*\n`;
        message += `└ ${responseTime} ms\n\n`;

        message += `💻 *SYSTEM INFORMATION*\n`;
        message += `├ Hostname: ${systemInfo.hostname}\n`;
        message += `├ Platform: ${systemInfo.platform}\n`;
        message += `├ Architecture: ${systemInfo.arch}\n`;
        message += `├ OS Release: ${systemInfo.release}\n`;
        message += `└ System Uptime: ${formatUptime(systemInfo.uptime)}\n\n`;

        message += `🔧 *CPU SPECIFICATIONS*\n`;
        message += `├ Model: ${systemInfo.cpus[0]?.model || 'Unknown'}\n`;
        message += `├ Cores: ${systemInfo.cpus.length}\n`;
        message += `├ Speed: ${systemInfo.cpus[0]?.speed || 'Unknown'} MHz\n`;
        message += `├ Load Average: [${systemInfo.loadAvg.map(l => l.toFixed(2)).join(', ')}]\n`;
        
        if (detailedCpuInfo.modelName) {
            message += `├ Detailed Model: ${detailedCpuInfo.modelName}\n`;
        }
        
        if (detailedCpuInfo.times) {
            message += `├ CPU Times:\n`;
            message += `│ ├ User: ${detailedCpuInfo.times.user}\n`;
            message += `│ ├ System: ${detailedCpuInfo.times.system}\n`;
            message += `│ ├ Idle: ${detailedCpuInfo.times.idle}\n`;
            message += `│ ├ Nice: ${detailedCpuInfo.times.nice}\n`;
            message += `│ ├ IOWait: ${detailedCpuInfo.times.iowait}\n`;
            message += `│ ├ IRQ: ${detailedCpuInfo.times.irq}\n`;
            message += `│ └ SoftIRQ: ${detailedCpuInfo.times.softirq}\n`;
        }
        
        message += `└ Per Core Details:\n`;
        systemInfo.cpus.forEach((cpu, index) => {
            message += `  ├ Core ${index}: ${cpu.speed} MHz\n`;
            message += `  │ ├ User: ${cpu.times.user}\n`;
            message += `  │ ├ Nice: ${cpu.times.nice}\n`;
            message += `  │ ├ Sys: ${cpu.times.sys}\n`;
            message += `  │ ├ Idle: ${cpu.times.idle}\n`;
            message += `  │ └ IRQ: ${cpu.times.irq}\n`;
        });
        message += `\n`;

        message += `🧠 *MEMORY SPECIFICATIONS*\n`;
        message += `├ Total RAM: ${formatBytes(systemInfo.memory.total)}\n`;
        message += `├ Used RAM: ${formatBytes(systemInfo.memory.used)}\n`;
        message += `├ Free RAM: ${formatBytes(systemInfo.memory.free)}\n`;
        message += `├ Usage: ${((systemInfo.memory.used / systemInfo.memory.total) * 100).toFixed(2)}%\n`;
        
        if (memoryInfo.total) {
            message += `├ Detailed Memory Info:\n`;
            message += `│ ├ Total: ${memoryInfo.total}\n`;
            message += `│ ├ Available: ${memoryInfo.available || 'N/A'}\n`;
            message += `│ ├ Buffers: ${memoryInfo.buffers || 'N/A'}\n`;
            message += `│ ├ Cached: ${memoryInfo.cached || 'N/A'}\n`;
            message += `│ ├ Swap Total: ${memoryInfo.swapTotal || 'N/A'}\n`;
            message += `│ └ Swap Free: ${memoryInfo.swapFree || 'N/A'}\n`;
        }
        message += `\n`;

        message += `💾 *DISK INFORMATION*\n`;
        if (diskInfo.error) {
            message += `└ ${diskInfo.error}\n\n`;
        } else if (diskInfo.filesystem) {
            message += `├ Filesystem: ${diskInfo.filesystem}\n`;
            message += `├ Total Size: ${diskInfo.size}\n`;
            message += `├ Used: ${diskInfo.used}\n`;
            message += `├ Available: ${diskInfo.available}\n`;
            message += `├ Usage: ${diskInfo.usePercent}\n`;
            message += `└ Mount Point: ${diskInfo.mountpoint}\n\n`;
        } else {
            message += `└ Disk info not available for this platform\n\n`;
        }

        message += `⚙️ *PROCESS INFORMATION*\n`;
        message += `├ Process ID: ${processInfo.pid}\n`;
        message += `├ Parent PID: ${processInfo.ppid}\n`;
        message += `├ Process Title: ${processInfo.title}\n`;
        message += `├ Process Uptime: ${formatUptime(processInfo.uptime)}\n`;
        message += `├ Node.js Version: ${processInfo.version}\n`;
        message += `├ V8 Engine: ${processInfo.versions.v8}\n`;
        message += `├ OpenSSL: ${processInfo.versions.openssl}\n`;
        message += `├ Process Memory:\n`;
        message += `│ ├ RSS: ${formatBytes(processInfo.memory.rss)}\n`;
        message += `│ ├ Heap Total: ${formatBytes(processInfo.memory.heapTotal)}\n`;
        message += `│ ├ Heap Used: ${formatBytes(processInfo.memory.heapUsed)}\n`;
        message += `│ ├ External: ${formatBytes(processInfo.memory.external)}\n`;
        message += `│ └ Array Buffers: ${formatBytes(processInfo.memory.arrayBuffers)}\n`;
        message += `├ CPU Usage:\n`;
        message += `│ ├ User: ${processInfo.cpuUsage.user} μs\n`;
        message += `│ └ System: ${processInfo.cpuUsage.system} μs\n`;
        message += `└ Environment:\n`;
        message += `  ├ NODE_ENV: ${processInfo.env.NODE_ENV}\n`;
        message += `  └ HOME: ${processInfo.env.HOME}\n\n`;

        message += `🌐 *NETWORK INTERFACES*\n`;
        Object.keys(systemInfo.networkInterfaces).forEach(name => {
            message += `├ ${name}:\n`;
            systemInfo.networkInterfaces[name].forEach((net, index) => {
                message += `│ ├ Address: ${net.address}\n`;
                message += `│ ├ Family: ${net.family}\n`;
                message += `│ ├ MAC: ${net.mac}\n`;
                message += `│ ├ Internal: ${net.internal}\n`;
                message += `│ └ Netmask: ${net.netmask}\n`;
            });
        });
        
        message += `\n📊 *ADDITIONAL VERSIONS*\n`;
        Object.keys(processInfo.versions).forEach(key => {
            message += `├ ${key}: ${processInfo.versions[key]}\n`;
        });

        await reply(message);

    } catch (error) {
        console.error('Server info error:', error);
        await reply(`❌ Error getting server info: ${error.message}`);
    }
};