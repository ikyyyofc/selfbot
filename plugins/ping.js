
import os from "os";
import util from "util";
import { exec } from "child_process";
import db from "../lib/Database.js";
import groupCache from "../lib/groupCache.js";
import sessionCleaner from "../lib/SessionCleaner.js";

const execPromise = util.promisify(exec);

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatUptime = seconds => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}h ${h}j ${m}m ${s}d`;
};

const getCpuUsage = () => {
    return new Promise(resolve => {
        const start = os.cpus().map(c => c.times);
        setTimeout(() => {
            const end = os.cpus().map(c => c.times);
            const usage = end.map((e, i) => {
                const s = start[i];
                const total =
                    e.user - s.user + e.nice - s.nice + e.sys - s.sys + e.idle - s.idle + e.irq - s.irq;
                if (total === 0) return 0;
                return 100 - (100 * (e.idle - s.idle)) / total;
            });
            resolve(usage);
        }, 500);
    });
};

const getDiskUsage = async () => {
    const platform = os.platform();
    try {
        if (platform === "win32") {
            const { stdout } = await execPromise(
                'wmic logicaldisk get Caption,Size,FreeSpace /format:csv'
            );
            return stdout
                .trim()
                .split("\n")
                .slice(1)
                .map(line => {
                    const [node, caption, freeSpace, size] = line.split(",").map(s => s.trim());
                    if (!caption) return null;
                    const used = size - freeSpace;
                    return `  - ${caption}  [${formatBytes(used)} / ${formatBytes(size)}]`;
                })
                .filter(Boolean)
                .join("\n");
        } else {
            const { stdout } = await execPromise("df -h");
            return stdout
                .trim()
                .split("\n")
                .slice(1)
                .map(line => {
                    const parts = line.split(/\s+/);
                    return `  - ${parts[0]} (${parts[5]}): [${parts[2]} / ${parts[1]}] (${parts[4]})`;
                })
                .join("\n");
        }
    } catch (e) {
        return `  Gagal mengambil info disk: ${e.message}`;
    }
};

export default {
    name: "status",
    desc: "Menampilkan status bot dan resource server secara detail.",
    rules: {
        owner: true,
        premium: false,
        limit: 0
    },
    execute: async ({ m, reply }) => {
        const startTime = Date.now();
        await m.react("🔍");

        const [cpuUsage, diskUsage, users, groups] = await Promise.all([
            getCpuUsage(),
            getDiskUsage(),
            db.getAllUsers(),
            db.getAllGroups()
        ]);

        const cpus = os.cpus();
        const ram = process.memoryUsage();
        const sessionStats = sessionCleaner.getStats();

        const responseTime = startTime - m.timestamp * 1000;
        const execTime = Date.now() - startTime;

        let text = `*🤖 STATS BOT & SERVER* \n\n`;

        text += `*📊 Performa:*\n`;
        text += `  - Kecepatan Respon: *${responseTime.toFixed(2)} ms*\n`;
        text += `  - Waktu Eksekusi: *${execTime} ms*\n\n`;

        text += `*💻 CPU:*\n`;
        text += `  - Model: *${cpus[0].model}*\n`;
        text += `  - Cores: *${cpus.length} Core*\n`;
        text += `  - Kecepatan: *${(cpus[0].speed / 1000).toFixed(2)} GHz*\n`;
        text += `  - Penggunaan per Core:\n`;
        cpus.forEach((core, i) => {
            text += `    - Core ${i + 1}: *${cpuUsage[i].toFixed(2)}%*\n`;
        });
        text += `\n`;

        text += `*🧠 Memori (RAM):*\n`;
        text += `  - Total Sistem: *${formatBytes(os.totalmem())}*\n`;
        text += `  - Sisa Sistem: *${formatBytes(os.freemem())}*\n`;
        text += `  - Terpakai Sistem: *${formatBytes(os.totalmem() - os.freemem())}*\n`;
        text += `  - Penggunaan Bot:\n`;
        text += `    - RSS: *${formatBytes(ram.rss)}*\n`;
        text += `    - Heap Total: *${formatBytes(ram.heapTotal)}*\n`;
        text += `    - Heap Terpakai: *${formatBytes(ram.heapUsed)}*\n\n`;

        text += `*💾 Penyimpanan:*\n${diskUsage}\n\n`;

        text += `*⚙️ Sistem & Bot:*\n`;
        text += `  - Platform: *${os.platform()} (${os.arch()})*\n`;
        text += `  - Uptime Server: *${formatUptime(os.uptime())}*\n`;
        text += `  - Uptime Bot: *${formatUptime(process.uptime())}*\n`;
        text += `  - Versi Node.js: *${process.version}*\n\n`;
        
        text += `*🗃️ Database:*\n`;
        text += `  - Mode: *${db.mode}*\n`;
        text += `  - Total User: *${users.length}*\n`;
        text += `  - Total Grup: *${groups.length}*\n\n`;

        text += `*📦 Cache & Sesi:*\n`;
        text += `  - Grup di Cache: *${groupCache.getStats().total}*\n`;
        text += `  - Ukuran Sesi: *${sessionStats.totalSizeMB} MB*\n`;
        text += `  - File Sesi (Cleanable): *${sessionStats.unprotectedCount} file (${sessionStats.cleanableSizeMB} MB)*\n`;

        await reply(text);
    }
};