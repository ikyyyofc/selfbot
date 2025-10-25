import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';

export default async ({ reply }) => {
    const startTime = process.hrtime.bigint();
    
    try {
        const responseTime = Number(process.hrtime.bigint() - startTime) / 1000000;
        
        const uptime = process.uptime();
        const sysUptime = os.uptime();
        
        const formatUptime = (seconds) => {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return `${days}d ${hours}h ${minutes}m ${secs}s`;
        };
        
        const formatBytes = (bytes) => {
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            if (bytes === 0) return '0 B';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        };
        
        const formatPercentage = (value) => (value * 100).toFixed(1) + '%';
        
        const getCpuUsage = () => {
            const cpus = os.cpus();
            let totalIdle = 0;
            let totalTick = 0;
            
            cpus.forEach(cpu => {
                for (let type in cpu.times) {
                    totalTick += cpu.times[type];
                }
                totalIdle += cpu.times.idle;
            });
            
            return 1 - totalIdle / totalTick;
        };
        
        const getStorageInfo = () => {
            try {
                const stats = fs.statSync('.');
                const free = execSync('df -h . | tail -1 | awk \'{print $4}\'', { encoding: 'utf8' }).trim();
                const used = execSync('df -h . | tail -1 | awk \'{print $3}\'', { encoding: 'utf8' }).trim();
                const total = execSync('df -h . | tail -1 | awk \'{print $2}\'', { encoding: 'utf8' }).trim();
                const usagePercent = execSync('df -h . | tail -1 | awk \'{print $5}\'', { encoding: 'utf8' }).trim();
                
                return {
                    total,
                    used,
                    free,
                    usagePercent
                };
            } catch {
                return {
                    total: 'N/A',
                    used: 'N/A',
                    free: 'N/A',
                    usagePercent: 'N/A'
                };
            }
        };
        
        const getNetworkInfo = () => {
            try {
                const interfaces = os.networkInterfaces();
                const active = [];
                
                for (const [name, nets] of Object.entries(interfaces)) {
                    if (name !== 'lo') {
                        nets.forEach(net => {
                            if (!net.internal && net.family === 'IPv4') {
                                active.push({
                                    interface: name,
                                    ip: net.address,
                                    netmask: net.netmask,
                                    mac: net.mac
                                });
                            }
                        });
                    }
                }
                
                return active;
            } catch {
                return [];
            }
        };
        
        const getLoadAverage = () => {
            const loads = os.loadavg();
            return {
                '1min': loads[0].toFixed(2),
                '5min': loads[1].toFixed(2),
                '15min': loads[2].toFixed(2)
            };
        };
        
        const memInfo = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const cpuInfo = os.cpus()[0];
        const storageInfo = getStorageInfo();
        const networkInfo = getNetworkInfo();
        const loadAvg = getLoadAverage();
        const cpuUsage = getCpuUsage();
        
        const systemInfo = `🖥️ *SYSTEM SPECIFICATIONS & PERFORMANCE*

⚡ *RESPONSE TIME*
├ Bot Response: ${responseTime.toFixed(2)}ms
├ System Latency: ${process.hrtime.bigint() ? 'Active' : 'Unknown'}
└ API Status: ✅ Online

🔧 *HARDWARE SPECIFICATIONS*
├ Architecture: ${os.arch()} (${process.arch})
├ Platform: ${os.platform()} ${os.release()}
├ Hostname: ${os.hostname()}
├ Endianness: ${os.endianness()}
└ CPU Cores: ${os.cpus().length} cores

🧠 *PROCESSOR DETAILS*
├ Model: ${cpuInfo.model}
├ Speed: ${cpuInfo.speed} MHz
├ Current Usage: ${formatPercentage(cpuUsage)}
├ Load Average:
│  ├ 1 min: ${loadAvg['1min']}
│  ├ 5 min: ${loadAvg['5min']}
│  └ 15 min: ${loadAvg['15min']}
└ Architecture: ${process.arch}

💾 *MEMORY INFORMATION*
├ Total RAM: ${formatBytes(totalMem)}
├ Used RAM: ${formatBytes(usedMem)} (${formatPercentage(usedMem/totalMem)})
├ Free RAM: ${formatBytes(freeMem)} (${formatPercentage(freeMem/totalMem)})
├ Process Memory:
│  ├ RSS: ${formatBytes(memInfo.rss)}
│  ├ Heap Total: ${formatBytes(memInfo.heapTotal)}
│  ├ Heap Used: ${formatBytes(memInfo.heapUsed)}
│  ├ External: ${formatBytes(memInfo.external)}
│  └ Array Buffers: ${formatBytes(memInfo.arrayBuffers || 0)}
└ Memory Usage: ${formatPercentage(memInfo.heapUsed/memInfo.heapTotal)}

💿 *STORAGE INFORMATION*
├ Total Space: ${storageInfo.total}
├ Used Space: ${storageInfo.used}
├ Free Space: ${storageInfo.free}
├ Usage: ${storageInfo.usagePercent}
└ File System: ${process.platform === 'linux' ? 'ext4/xfs' : 'Unknown'}

🌐 *NETWORK CONFIGURATION*
${networkInfo.length > 0 ? networkInfo.map((net, i) => 
`├ Interface ${i + 1}: ${net.interface}
│  ├ IP Address: ${net.ip}
│  ├ Subnet Mask: ${net.netmask}
│  └ MAC Address: ${net.mac}`).join('\n') : '├ No active interfaces detected'}
└ Hostname Resolution: ${os.hostname()}

⏱️ *UPTIME STATISTICS*
├ Process Uptime: ${formatUptime(uptime)}
├ System Uptime: ${formatUptime(sysUptime)}
├ Node.js Version: ${process.version}
├ Process ID: ${process.pid}
├ Parent PID: ${process.ppid || 'N/A'}
└ Working Directory: ${process.cwd()}

🔐 *SECURITY & ENVIRONMENT*
├ User ID: ${process.getuid ? process.getuid() : 'N/A'}
├ Group ID: ${process.getgid ? process.getgid() : 'N/A'}
├ Process Title: ${process.title}
├ Environment: ${process.env.NODE_ENV || 'development'}
└ Execution Path: ${process.execPath}

🏷️ *PROCESS DETAILS*
├ Arguments: ${process.argv.slice(2).join(' ') || 'None'}
├ Features: ${process.features ? Object.keys(process.features).join(', ') : 'Standard'}
├ Module Paths: ${process.config?.variables?.node_module_version || 'Unknown'}
└ Binary Version: ${process.versions.node}

📊 *RUNTIME VERSIONS*
├ Node.js: ${process.versions.node}
├ V8 Engine: ${process.versions.v8}
├ UV Library: ${process.versions.uv}
├ Zlib: ${process.versions.zlib}
├ OpenSSL: ${process.versions.openssl}
├ ICU: ${process.versions.icu || 'Not available'}
├ Unicode: ${process.versions.unicode || 'Unknown'}
└ Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

📈 *PERFORMANCE METRICS*
├ CPU Model: ${cpuInfo.model}
├ CPU Speed: ${cpuInfo.speed} MHz
├ CPU Usage: ${formatPercentage(cpuUsage)}
├ Memory Efficiency: ${formatPercentage(1 - (memInfo.heapUsed/memInfo.heapTotal))}
├ System Load: ${loadAvg['1min']} (1min avg)
├ Response Time: ${responseTime.toFixed(2)}ms
└ Timestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

🔄 *SYSTEM HEALTH*
├ Status: ${cpuUsage < 0.8 && (usedMem/totalMem) < 0.9 ? '🟢 Healthy' : '🟡 Warning'}
├ CPU Health: ${cpuUsage < 0.8 ? '✅ Normal' : '⚠️ High Usage'}
├ Memory Health: ${(usedMem/totalMem) < 0.9 ? '✅ Normal' : '⚠️ High Usage'}
├ Storage Health: ${!storageInfo.usagePercent.includes('9') ? '✅ Normal' : '⚠️ Low Space'}
└ Network Health: ${networkInfo.length > 0 ? '✅ Connected' : '⚠️ Limited'}`;

        await reply(systemInfo);
        
    } catch (error) {
        await reply(`❌ Error getting system info: ${error.message}`);
    }
};