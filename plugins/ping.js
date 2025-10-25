import os from "os";
import fs from "fs";
import { execSync } from "child_process";

export default async ({ m, reply }) => {
    const startTime = process.hrtime.bigint();
    
    try {
        const getSystemInfo = () => {
            try {
                return {
                    hostname: os.hostname(),
                    platform: os.platform(),
                    arch: os.arch(),
                    release: os.release(),
                    version: os.version(),
                    type: os.type(),
                    endianness: os.endianness(),
                    homedir: os.homedir(),
                    tmpdir: os.tmpdir(),
                    uptime: os.uptime(),
                    loadavg: os.loadavg(),
                    totalmem: os.totalmem(),
                    freemem: os.freemem(),
                    cpus: os.cpus(),
                    networkInterfaces: os.networkInterfaces(),
                    userInfo: os.userInfo()
                };
            } catch (e) {
                return { error: e.message };
            }
        };

        const getProcessInfo = () => {
            try {
                const usage = process.memoryUsage();
                const resourceUsage = process.resourceUsage ? process.resourceUsage() : {};
                
                return {
                    pid: process.pid,
                    ppid: process.ppid,
                    platform: process.platform,
                    arch: process.arch,
                    version: process.version,
                    versions: process.versions,
                    execPath: process.execPath,
                    execArgv: process.execArgv,
                    argv: process.argv,
                    env: {
                        NODE_ENV: process.env.NODE_ENV,
                        PATH: process.env.PATH?.split(':').length || 0,
                        HOME: process.env.HOME,
                        USER: process.env.USER,
                        SHELL: process.env.SHELL,
                        TERM: process.env.TERM,
                        PWD: process.env.PWD
                    },
                    cwd: process.cwd(),
                    uptime: process.uptime(),
                    memoryUsage: usage,
                    resourceUsage: resourceUsage,
                    features: process.features || {},
                    config: process.config || {}
                };
            } catch (e) {
                return { error: e.message };
            }
        };

        const getFileSystemInfo = () => {
            try {
                const stats = {};
                const paths = ['/', '/tmp', '/var', '/home', process.cwd()];
                
                paths.forEach(path => {
                    try {
                        if (fs.existsSync(path)) {
                            const stat = fs.statSync(path);
                            stats[path] = {
                                size: stat.size,
                                mode: stat.mode,
                                uid: stat.uid,
                                gid: stat.gid,
                                atime: stat.atime,
                                mtime: stat.mtime,
                                ctime: stat.ctime,
                                birthtime: stat.birthtime,
                                isDirectory: stat.isDirectory(),
                                isFile: stat.isFile()
                            };
                        }
                    } catch (e) {
                        stats[path] = { error: e.message };
                    }
                });

                return stats;
            } catch (e) {
                return { error: e.message };
            }
        };

        const getSystemCommands = () => {
            const commands = {
                'uname -a': 'uname -a',
                'cat /proc/version': 'cat /proc/version',
                'cat /etc/os-release': 'cat /etc/os-release',
                'cat /proc/cpuinfo | head -20': 'cat /proc/cpuinfo | head -20',
                'cat /proc/meminfo': 'cat /proc/meminfo',
                'df -h': 'df -h',
                'free -h': 'free -h',
                'ps aux | head -10': 'ps aux | head -10',
                'netstat -tuln | head -10': 'netstat -tuln | head -10',
                'lscpu': 'lscpu',
                'lsb_release -a': 'lsb_release -a',
                'whoami': 'whoami',
                'id': 'id',
                'env | head -10': 'env | head -10',
                'cat /proc/loadavg': 'cat /proc/loadavg',
                'uptime': 'uptime'
            };

            const results = {};
            
            Object.entries(commands).forEach(([name, cmd]) => {
                try {
                    results[name] = execSync(cmd, { 
                        encoding: 'utf8', 
                        timeout: 5000,
                        maxBuffer: 1024 * 1024
                    }).trim();
                } catch (e) {
                    results[name] = `Error: ${e.message}`;
                }
            });

            return results;
        };

        const getDockerInfo = () => {
            try {
                const dockerVersion = execSync('docker --version', { encoding: 'utf8', timeout: 3000 }).trim();
                const dockerInfo = execSync('docker info --format "{{json .}}"', { encoding: 'utf8', timeout: 5000 });
                const containers = execSync('docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"', { encoding: 'utf8', timeout: 3000 }).trim();
                
                return {
                    version: dockerVersion,
                    info: JSON.parse(dockerInfo),
                    containers: containers
                };
            } catch (e) {
                return { error: e.message };
            }
        };

        const getNetworkInfo = () => {
            try {
                const results = {};
                
                try {
                    results.publicIP = execSync('curl -s ifconfig.me || curl -s ipinfo.io/ip', { 
                        encoding: 'utf8', 
                        timeout: 5000 
                    }).trim();
                } catch (e) {
                    results.publicIP = `Error: ${e.message}`;
                }

                try {
                    results.routing = execSync('ip route | head -5', { 
                        encoding: 'utf8', 
                        timeout: 3000 
                    }).trim();
                } catch (e) {
                    results.routing = `Error: ${e.message}`;
                }

                try {
                    results.dns = execSync('cat /etc/resolv.conf', { 
                        encoding: 'utf8', 
                        timeout: 3000 
                    }).trim();
                } catch (e) {
                    results.dns = `Error: ${e.message}`;
                }

                return results;
            } catch (e) {
                return { error: e.message };
            }
        };

        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const formatUptime = (seconds) => {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return `${days}d ${hours}h ${minutes}m ${secs}s`;
        };

        await m.react("🔄");

        const systemInfo = getSystemInfo();
        const processInfo = getProcessInfo();
        const fileSystemInfo = getFileSystemInfo();
        const systemCommands = getSystemCommands();
        const dockerInfo = getDockerInfo();
        const networkInfo = getNetworkInfo();

        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000;

        let result = `🚀 *SYSTEM SPECIFICATIONS & PERFORMANCE*\n`;
        result += `═══════════════════════════════════════\n\n`;

        result += `⚡ *RESPONSE TIME*\n`;
        result += `├─ Response: ${responseTime.toFixed(2)} ms\n`;
        result += `├─ Process Uptime: ${formatUptime(processInfo.uptime)}\n`;
        result += `└─ System Uptime: ${formatUptime(systemInfo.uptime)}\n\n`;

        result += `🖥️ *OPERATING SYSTEM*\n`;
        result += `├─ Hostname: ${systemInfo.hostname}\n`;
        result += `├─ Platform: ${systemInfo.platform}\n`;
        result += `├─ Architecture: ${systemInfo.arch}\n`;
        result += `├─ OS Type: ${systemInfo.type}\n`;
        result += `├─ OS Release: ${systemInfo.release}\n`;
        result += `├─ OS Version: ${systemInfo.version}\n`;
        result += `├─ Endianness: ${systemInfo.endianness}\n`;
        result += `├─ Home Directory: ${systemInfo.homedir}\n`;
        result += `└─ Temp Directory: ${systemInfo.tmpdir}\n\n`;

        result += `💾 *MEMORY & STORAGE*\n`;
        result += `├─ Total Memory: ${formatBytes(systemInfo.totalmem)}\n`;
        result += `├─ Free Memory: ${formatBytes(systemInfo.freemem)}\n`;
        result += `├─ Used Memory: ${formatBytes(systemInfo.totalmem - systemInfo.freemem)}\n`;
        result += `├─ Memory Usage: ${(((systemInfo.totalmem - systemInfo.freemem) / systemInfo.totalmem) * 100).toFixed(2)}%\n`;
        result += `├─ Process RSS: ${formatBytes(processInfo.memoryUsage.rss)}\n`;
        result += `├─ Process Heap Used: ${formatBytes(processInfo.memoryUsage.heapUsed)}\n`;
        result += `├─ Process Heap Total: ${formatBytes(processInfo.memoryUsage.heapTotal)}\n`;
        result += `├─ Process External: ${formatBytes(processInfo.memoryUsage.external)}\n`;
        result += `└─ Process Array Buffers: ${formatBytes(processInfo.memoryUsage.arrayBuffers)}\n\n`;

        result += `🔧 *CPU INFORMATION*\n`;
        result += `├─ CPU Count: ${systemInfo.cpus.length} cores\n`;
        result += `├─ CPU Model: ${systemInfo.cpus[0]?.model || 'Unknown'}\n`;
        result += `├─ CPU Speed: ${systemInfo.cpus[0]?.speed || 'Unknown'} MHz\n`;
        result += `├─ Load Average: [${systemInfo.loadavg.map(avg => avg.toFixed(2)).join(', ')}]\n`;
        
        systemInfo.cpus.forEach((cpu, index) => {
            const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
            const idle = cpu.times.idle;
            const usage = ((total - idle) / total * 100).toFixed(2);
            result += `├─ Core ${index}: ${usage}% usage\n`;
        });
        result += `\n`;

        result += `🌐 *NETWORK INTERFACES*\n`;
        Object.entries(systemInfo.networkInterfaces).forEach(([name, interfaces]) => {
            result += `├─ ${name}:\n`;
            interfaces.forEach((iface, index) => {
                result += `│  ├─ [${index}] ${iface.family}: ${iface.address}\n`;
                result += `│  ├─ Netmask: ${iface.netmask}\n`;
                result += `│  ├─ MAC: ${iface.mac}\n`;
                result += `│  └─ Internal: ${iface.internal}\n`;
            });
        });
        result += `\n`;

        result += `🔒 *USER & PERMISSIONS*\n`;
        result += `├─ Username: ${systemInfo.userInfo.username}\n`;
        result += `├─ UID: ${systemInfo.userInfo.uid}\n`;
        result += `├─ GID: ${systemInfo.userInfo.gid}\n`;
        result += `├─ Home: ${systemInfo.userInfo.homedir}\n`;
        result += `└─ Shell: ${systemInfo.userInfo.shell}\n\n`;

        result += `⚙️ *NODE.JS PROCESS*\n`;
        result += `├─ Process ID: ${processInfo.pid}\n`;
        result += `├─ Parent PID: ${processInfo.ppid}\n`;
        result += `├─ Node Version: ${processInfo.version}\n`;
        result += `├─ V8 Version: ${processInfo.versions.v8}\n`;
        result += `├─ UV Version: ${processInfo.versions.uv}\n`;
        result += `├─ Zlib Version: ${processInfo.versions.zlib}\n`;
        result += `├─ OpenSSL Version: ${processInfo.versions.openssl}\n`;
        result += `├─ HTTP Parser: ${processInfo.versions.http_parser}\n`;
        result += `├─ ICU Version: ${processInfo.versions.icu || 'N/A'}\n`;
        result += `├─ Executable Path: ${processInfo.execPath}\n`;
        result += `├─ Working Directory: ${processInfo.cwd}\n`;
        result += `├─ Arguments: ${processInfo.argv.length} args\n`;
        result += `└─ Environment Variables: ${Object.keys(process.env).length} vars\n\n`;

        result += `📊 *RESOURCE USAGE*\n`;
        if (processInfo.resourceUsage.userCPUTime) {
            result += `├─ User CPU Time: ${processInfo.resourceUsage.userCPUTime}\n`;
            result += `├─ System CPU Time: ${processInfo.resourceUsage.systemCPUTime}\n`;
            result += `├─ Max RSS: ${formatBytes(processInfo.resourceUsage.maxRSS * 1024)}\n`;
            result += `├─ Shared Memory: ${formatBytes(processInfo.resourceUsage.sharedMemorySize * 1024)}\n`;
            result += `├─ Unshared Data: ${formatBytes(processInfo.resourceUsage.unsharedDataSize * 1024)}\n`;
            result += `├─ Unshared Stack: ${formatBytes(processInfo.resourceUsage.unsharedStackSize * 1024)}\n`;
            result += `├─ Minor Page Faults: ${processInfo.resourceUsage.minorPageFault}\n`;
            result += `├─ Major Page Faults: ${processInfo.resourceUsage.majorPageFault}\n`;
            result += `├─ Swaps: ${processInfo.resourceUsage.swappedOut}\n`;
            result += `├─ File System Inputs: ${processInfo.resourceUsage.fsRead}\n`;
            result += `├─ File System Outputs: ${processInfo.resourceUsage.fsWrite}\n`;
            result += `├─ IPC Messages Sent: ${processInfo.resourceUsage.ipcSent}\n`;
            result += `├─ IPC Messages Received: ${processInfo.resourceUsage.ipcReceived}\n`;
            result += `├─ Signals Received: ${processInfo.resourceUsage.signalsCount}\n`;
            result += `└─ Context Switches: ${processInfo.resourceUsage.voluntaryContextSwitches + processInfo.resourceUsage.involuntaryContextSwitches}\n\n`;
        } else {
            result += `└─ Resource usage data not available\n\n`;
        }

        result += `📁 *FILE SYSTEM ANALYSIS*\n`;
        Object.entries(fileSystemInfo).forEach(([path, info]) => {
            if (info.error) {
                result += `├─ ${path}: Error - ${info.error}\n`;
            } else {
                result += `├─ ${path}:\n`;
                result += `│  ├─ Type: ${info.isDirectory ? 'Directory' : 'File'}\n`;
                result += `│  ├─ Size: ${formatBytes(info.size)}\n`;
                result += `│  ├─ Mode: ${info.mode.toString(8)}\n`;
                result += `│  ├─ UID/GID: ${info.uid}/${info.gid}\n`;
                result += `│  ├─ Access Time: ${info.atime.toISOString()}\n`;
                result += `│  ├─ Modified Time: ${info.mtime.toISOString()}\n`;
                result += `│  ├─ Changed Time: ${info.ctime.toISOString()}\n`;
                result += `│  └─ Birth Time: ${info.birthtime.toISOString()}\n`;
            }
        });
        result += `\n`;

        result += `🌐 *NETWORK CONFIGURATION*\n`;
        result += `├─ Public IP: ${networkInfo.publicIP}\n`;
        result += `├─ DNS Configuration:\n${networkInfo.dns.split('\n').map(line => `│  ${line}`).join('\n')}\n`;
        result += `├─ Routing Table:\n${networkInfo.routing.split('\n').map(line => `│  ${line}`).join('\n')}\n\n`;

        if (!dockerInfo.error) {
            result += `🐳 *DOCKER INFORMATION*\n`;
            result += `├─ Version: ${dockerInfo.version}\n`;
            result += `├─ Server Version: ${dockerInfo.info.ServerVersion}\n`;
            result += `├─ Storage Driver: ${dockerInfo.info.Driver}\n`;
            result += `├─ Containers: ${dockerInfo.info.Containers}\n`;
            result += `├─ Running: ${dockerInfo.info.ContainersRunning}\n`;
            result += `├─ Paused: ${dockerInfo.info.ContainersPaused}\n`;
            result += `├─ Stopped: ${dockerInfo.info.ContainersStopped}\n`;
            result += `├─ Images: ${dockerInfo.info.Images}\n`;
            result += `├─ CPUs: ${dockerInfo.info.NCPU}\n`;
            result += `├─ Total Memory: ${formatBytes(dockerInfo.info.MemTotal)}\n`;
            result += `├─ Docker Root Dir: ${dockerInfo.info.DockerRootDir}\n`;
            result += `└─ Container List:\n${dockerInfo.containers.split('\n').map(line => `   ${line}`).join('\n')}\n\n`;
        }

        result += `🔧 *SYSTEM COMMANDS OUTPUT*\n`;
        Object.entries(systemCommands).forEach(([cmd, output]) => {
            result += `├─ ${cmd}:\n`;
            const lines = output.split('\n').slice(0, 5);
            lines.forEach(line => {
                result += `│  ${line}\n`;
            });
            if (output.split('\n').length > 5) {
                result += `│  ... (truncated)\n`;
            }
        });

        result += `\n═══════════════════════════════════════\n`;
        result += `📊 Generated in ${responseTime.toFixed(2)}ms\n`;
        result += `🕐 ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;

        await reply(result);
        await m.react("✅");

    } catch (error) {
        await m.react("❌");
        await reply(`❌ Error generating system info: ${error.message}`);
    }
};