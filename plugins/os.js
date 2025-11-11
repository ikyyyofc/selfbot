
import si from 'systeminformation';
import { cpus as _cpus } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getGpuInfo = async () => {
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execAsync('wmic path win32_videocontroller get name,adapterram');
            const gpus = stdout.trim().split('\n').slice(1).map(line => {
                const parts = line.trim().split(/\s{2,}/);
                return {
                    name: parts[1] || 'N/A',
                    vram: parts[0] ? formatBytes(parseInt(parts[0])) : 'N/A'
                };
            });
            return gpus.map(gpu => `• ${gpu.name} (VRAM: ${gpu.vram})`).join('\n');
        } else if (process.platform === 'linux') {
            const { stdout } = await execAsync('lspci | grep -i --color=never "vga|3d|display"');
            return stdout.trim().split('\n').map(line => `• ${line.substring(line.indexOf(':') + 2)}`).join('\n');
        }
        return '• Info GPU tidak tersedia di OS ini';
    } catch (e) {
        return '• Gagal mengambil info GPU';
    }
};

export default {
    desc: 'Mengecek spesifikasi lengkap server secara mendetail.',
    rules: {
        owner: true,
        private: true
    },
    execute: async (context) => {
        await context.m.react('🔄');
        
        try {
            const [system, osInfo, cpu, mem, fsSize, network, versions, graphics] = await Promise.all([
                si.system(),
                si.osInfo(),
                si.cpu(),
                si.mem(),
                si.fsSize(),
                si.networkInterfaces(),
                si.versions(),
                getGpuInfo()
            ]);

            let response = `💻 *Spesifikasi Server Detail*\n\n`;

            response += `*🖥️ Sistem & OS*\n`;
            response += `• Manufaktur: ${system.manufacturer}\n`;
            response += `• Model: ${system.model}\n`;
            response += `• Platform: ${osInfo.platform}\n`;
            response += `• Distro: ${osInfo.distro}\n`;
            response += `• Kernel: ${osInfo.kernel}\n`;
            response += `• Arsitektur: ${osInfo.arch}\n\n`;

            response += `*⚙️ CPU (${cpu.manufacturer} ${cpu.brand})*\n`;
            response += `• Cores: ${cpu.cores} (Fisik: ${cpu.physicalCores})\n`;
            response += `• Kecepatan: ${cpu.speed} GHz\n`;
            response += `• L2 Cache: ${formatBytes(cpu.l2)}\n`;
            response += `• L3 Cache: ${formatBytes(cpu.l3)}\n`;
            response += `*Detail per Core:*\n`;
            _cpus().forEach((core, i) => {
                response += `  • Core ${i + 1}: ${core.speed} MHz\n`;
            });
            response += `\n`;

            response += `*💾 Memori (RAM)*\n`;
            response += `• Total: ${formatBytes(mem.total)}\n`;
            response += `• Terpakai: ${formatBytes(mem.used)}\n`;
            response += `• Free: ${formatBytes(mem.free)}\n\n`;
            
            response += `*🎨 GPU (Graphics)*\n`;
            response += `${graphics}\n\n`;

            response += `*💽 Penyimpanan (Disk)*\n`;
            fsSize.forEach(disk => {
                response += `• Mount: ${disk.mount}\n`;
                response += `  - Tipe: ${disk.type}\n`;
                response += `  - Ukuran: ${formatBytes(disk.size)}\n`;
                response += `  - Terpakai: ${formatBytes(disk.used)} (${disk.use}%)\n`;
            });
            response += `\n`;

            response += `*🌐 Jaringan (Network)*\n`;
            network.forEach(iface => {
                if (iface.ip4) {
                    response += `• Interface: ${iface.ifaceName}\n`;
                    response += `  - Tipe: ${iface.type}\n`;
                    response += `  - IPv4: ${iface.ip4}\n`;
                    response += `  - MAC: ${iface.mac}\n`;
                }
            });
            response += `\n`;
            
            response += `*📦 Versi Software*\n`;
            response += `• Node.js: ${versions.node}\n`;
            response += `• V8 Engine: ${versions.v8}\n`;
            response += `• NPM: ${versions.npm}\n`;

            await context.reply(response);
            
        } catch (error) {
            await context.reply(`Gagal mengambil data spesifikasi server: ${error.message}`);
        }
    }
};