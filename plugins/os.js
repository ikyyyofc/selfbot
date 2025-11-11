import si from 'systeminformation';

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default {
    desc: 'Mengecek spesifikasi detail server.',
    rules: {
        owner: true,
    },
    execute: async ({ reply }) => {
        try {
            await reply('Mengambil data spesifikasi server, mohon tunggu...');

            const [
                cpuData,
                memData,
                osData,
                systemData,
                diskLayoutData,
                fsSizeData,
                networkData,
                graphicsData
            ] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.osInfo(),
                si.system(),
                si.diskLayout(),
                si.fsSize(),
                si.networkInterfaces(),
                si.graphics()
            ]);

            let response = '💻 *Spesifikasi Server Detail*\n\n';

            response += '┌─❐ *SISTEM*\n';
            response += `│ • Manufaktur: ${systemData.manufacturer}\n`;
            response += `│ • Model: ${systemData.model}\n`;
            response += `└ • Versi: ${systemData.version}\n\n`;

            response += '┌─❐ *SISTEM OPERASI*\n';
            response += `│ • Platform: ${osData.platform}\n`;
            response += `│ • Distro: ${osData.distro}\n`;
            response += `│ • Rilis: ${osData.release}\n`;
            response += `│ • Kernel: ${osData.kernel}\n`;
            response += `└ • Arsitektur: ${osData.arch}\n\n`;
            
            response += '┌─❐ *CPU*\n';
            response += `│ • Manufaktur: ${cpuData.manufacturer}\n`;
            response += `│ • Brand: ${cpuData.brand}\n`;
            response += `│ • Kecepatan: ${cpuData.speed} GHz\n`;
            response += `│ • Total Core: ${cpuData.cores}\n`;
            response += '│\n';
            response += '│ ❉ *Detail Core:*\n';
            cpuData.cores.forEach((core, index) => {
                response += `│  ➪ Core ${index + 1}: ${core.speed} GHz\n`;
            });
            response += `└ • Governor: ${cpuData.governor || 'N/A'}\n\n`;

            response += '┌─❐ *MEMORI (RAM)*\n';
            response += `│ • Total: ${formatBytes(memData.total)}\n`;
            response += `│ • Free: ${formatBytes(memData.free)}\n`;
            response += `│ • Used: ${formatBytes(memData.used)} (${((memData.used / memData.total) * 100).toFixed(2)}%)\n`;
            response += '│\n';
            response += `│ • Swap Total: ${formatBytes(memData.swaptotal)}\n`;
            response += `└ • Swap Used: ${formatBytes(memData.swapused)} (${((memData.swapused / memData.swaptotal) * 100 || 0).toFixed(2)}%)\n\n`;

            if (graphicsData.controllers.length > 0) {
                response += '┌─❐ *GRAFIS (GPU)*\n';
                graphicsData.controllers.forEach((gpu, index) => {
                    response += `│ ❉ *Kontroler ${index + 1}*\n`;
                    response += `│  • Vendor: ${gpu.vendor}\n`;
                    response += `│  • Model: ${gpu.model}\n`;
                    if (gpu.vram) response += `│  • VRAM: ${formatBytes(gpu.vram * 1024 * 1024)}\n`;
                    if (index < graphicsData.controllers.length - 1) response += '│\n';
                });
                response += '└─────────────────\n\n';
            }

            response += '┌─❐ *PENYIMPANAN*\n';
            if (diskLayoutData.length > 0) {
                response += '│ ❉ *Disk Fisik:*\n';
                diskLayoutData.forEach((disk, index) => {
                    response += `│  ➪ Disk ${index + 1}:\n`;
                    response += `│     • Tipe: ${disk.type}\n`;
                    response += `│     • Nama: ${disk.name}\n`;
                    response += `│     • Vendor: ${disk.vendor}\n`;
                    response += `│     • Ukuran: ${formatBytes(disk.size)}\n`;
                });
                response += '│\n';
            }
            if (fsSizeData.length > 0) {
                response += '│ ❉ *Partisi Sistem:*\n';
                fsSizeData.forEach((fs, index) => {
                    response += `│  ➪ Partisi ${index + 1}:\n`;
                    response += `│     • Mount: ${fs.mount}\n`;
                    response += `│     • Tipe FS: ${fs.type}\n`;
                    response += `│     • Ukuran: ${formatBytes(fs.size)}\n`;
                    response += `│     • Digunakan: ${formatBytes(fs.used)} (${fs.use}%)\n`;
                });
            }
            response += '└─────────────────\n\n';

            response += '┌─❐ *JARINGAN*\n';
            const activeInterfaces = networkData.filter(iface => iface.ip4);
            if (activeInterfaces.length > 0) {
                activeInterfaces.forEach((iface, index) => {
                    response += `│ ❉ *Interface ${index + 1}*\n`;
                    response += `│  • Nama: ${iface.ifaceName}\n`;
                    response += `│  • IP v4: ${iface.ip4}\n`;
                    if (iface.ip6) response += `│  • IP v6: ${iface.ip6}\n`;
                    response += `│  • MAC: ${iface.mac}\n`;
                    response += `│  • Tipe: ${iface.type}\n`;
                    if (index < activeInterfaces.length - 1) response += '│\n';
                });
            } else {
                response += '│ • Tidak ada interface jaringan aktif.\n';
            }
            response += '└─────────────────\n';

            await reply(response.trim());

        } catch (error) {
            console.error('Error fetching server specs:', error);
            await reply(`Gagal mengambil data server: ${error.message}`);
        }
    }
};