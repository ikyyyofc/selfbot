import {
    exec
} from 'child_process';
import os from 'os';
import util from 'util';

const execAsync = util.promisify(exec);

export default {
    name: 'spek',
    desc: 'Menampilkan spesifikasi lengkap server yang digunakan.',
    rules: {
        owner: true,
        private: false,
        group: false,
    },
    execute: async (context) => {
        await context.reply('🔍 Menganalisis spesifikasi server, mohon tunggu sebentar...');

        try {
            const formatBytes = (bytes, decimals = 2) => {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
            };

            const formatUptime = (seconds) => {
                const d = Math.floor(seconds / (3600 * 24));
                const h = Math.floor(seconds % (3600 * 24) / 3600);
                const m = Math.floor(seconds % 3600 / 60);
                const s = Math.floor(seconds % 60);
                return `${d} hari, ${h} jam, ${m} menit, ${s} detik`;
            };

            // CPU Info
            const cpus = os.cpus();
            const cpuModel = cpus[0].model;
            const cpuCores = cpus.length;
            const cpuArch = os.arch();
            const cpuDetails = cpus.map((cpu, i) => `  Core ${i + 1}: ${cpu.speed} MHz`).join('\n');

            // Memory Info
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;

            // OS Info
            const platform = os.platform();
            const release = os.release();
            const osVersion = os.version();
            const hostname = os.hostname();
            const uptime = os.uptime();

            // Node.js Info
            const nodeVersion = process.version;
            const v8Version = process.versions.v8;

            // Disk Info
            let diskInfo = 'Tidak dapat mengambil data disk (kemungkinan bukan Linux).';
            if (platform === 'linux') {
                try {
                    const {
                        stdout
                    } = await execAsync('df -h');
                    const lines = stdout.trim().split('\n').slice(1);
                    diskInfo = lines.map(line => {
                        const parts = line.split(/\s+/);
                        return `  - Path: ${parts[5]}\n    Total: ${parts[1]}, Used: ${parts[2]}, Free: ${parts[3]}, Usage: ${parts[4]}`;
                    }).join('\n');
                } catch (e) {
                    diskInfo = `Gagal mengambil data disk: ${e.message}`;
                }
            }

            // Network Info
            const netInterfaces = os.networkInterfaces();
            let networkDetails = '';
            for (const name in netInterfaces) {
                networkDetails += `\n- *Interface: ${name}*\n`;
                const ifaceDetails = netInterfaces[name].map(iface => {
                    return `    - Family: ${iface.family}\n      Address: ${iface.address}\n      Netmask: ${iface.netmask}\n      MAC: ${iface.mac}${iface.internal ? ' (Internal)' : ''}`;
                }).join('\n');
                networkDetails += ifaceDetails;
            }

            let response = `*🤖 Spesifikasi Server Lengkap 🤖*\n\n`;
            response += `*💻 CPU (Central Processing Unit)*\n`;
            response += `- Model: \`\`\`${cpuModel}\`\`\`\n`;
            response += `- Arsitektur: \`\`\`${cpuArch}\`\`\`\n`;
            response += `- Jumlah Core: \`\`\`${cpuCores}\`\`\`\n`;
            response += `- Kecepatan per Core:\n${cpuDetails}\n\n`;

            response += `*🧠 RAM (Random Access Memory)*\n`;
            response += `- Total: \`\`\`${formatBytes(totalMem)}\`\`\`\n`;
            response += `- Terpakai: \`\`\`${formatBytes(usedMem)} (${((usedMem / totalMem) * 100).toFixed(2)}%)\`\`\`\n`;
            response += `- Tersisa: \`\`\`${formatBytes(freeMem)} (${((freeMem / totalMem) * 100).toFixed(2)}%)\`\`\`\n\n`;

            response += `*💽 Penyimpanan Disk (Linux)*\n`;
            response += `${diskInfo}\n\n`;

            response += `*⚙️ Sistem Operasi & Host*\n`;
            response += `- Platform: \`\`\`${platform}\`\`\`\n`;
            response += `- Rilis: \`\`\`${release}\`\`\`\n`;
            response += `- Versi: \`\`\`${osVersion}\`\`\`\n`;
            response += `- Hostname: \`\`\`${hostname}\`\`\`\n`;
            response += `- Uptime: \`\`\`${formatUptime(uptime)}\`\`\`\n\n`;

            response += `*🌐 Jaringan (Network Interfaces)*\n`;
            response += `${networkDetails}\n\n`;

            response += `*🍃 Environment*\n`;
            response += `- Versi Node.js: \`\`\`${nodeVersion}\`\`\`\n`;
            response += `- Versi V8: \`\`\`${v8Version}\`\`\`\n`;

            await context.reply(response);

        } catch (error) {
            await context.reply(`Terjadi kesalahan saat mengambil spesifikasi server: ${error.message}`);
        }
    },
};