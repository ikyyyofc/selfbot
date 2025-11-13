import os from "os";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../lib/Database.js";
import groupCache from "../lib/groupCache.js";
import sessionCleaner from "../lib/SessionCleaner.js";
import cooldown from "../lib/CooldownManager.js";
import config from "../config.js";
import time from "../lib/TimeHelper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    desc: "Menampilkan statistik dan informasi lengkap tentang bot.",
    rules: {
        limit: 1,
    },
    execute: async (context) => {
        const { reply } = context;
        const startTime = Date.now();

        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
            const botVersion = pkg.version;

            const [allUsers, allGroups, groupCacheStats, sessionStats, cooldownStats] = await Promise.all([
                db.getAllUsers(),
                db.getAllGroups(),
                groupCache.getStats(),
                sessionCleaner.getStats(),
                cooldown.getStats(),
            ]);

            const usedMemory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            const totalMemory = (os.totalmem() / 1024 / 1024).toFixed(2);
            const uptime = time.formatDuration(process.uptime() * 1000);
            const cpu = os.cpus()[0];

            const latency = Date.now() - startTime;

            let text = `*🤖  B O T   S T A T I S T I C S  🤖*\n\n`;

            text += `*❒  INFO BOT*\n`;
            text += `›  **Nama** : ${config.BOT_NAME}\n`;
            text += `›  **Versi** : ${botVersion}\n`;
            text += `›  **Owner** : @${config.OWNER_NUMBER}\n`;
            text += `›  **Mode** : ${config.BOT_MODE.toUpperCase()}\n`;
            text += `\n`;

            text += `*❒  INFO SERVER*\n`;
            text += `›  **OS** : ${os.platform()} (${os.arch()})\n`;
            text += `›  **CPU** : ${cpu.model.trim()}\n`;
            text += `›  **RAM** : ${usedMemory} MB / ${totalMemory} MB\n`;
            text += `›  **Node.js** : ${process.version}\n`;
            text += `›  **Uptime** : ${uptime}\n`;
            text += `\n`;

            text += `*❒  DATABASE & CACHE*\n`;
            text += `›  **DB Mode** : ${config.DB_MODE.toUpperCase()}\n`;
            text += `›  **Total User** : ${allUsers.length} pengguna\n`;
            text += `›  **Total Grup** : ${allGroups.length} grup\n`;
            text += `›  **Grup Terhubung** : ${groupCacheStats.total} grup\n`;
            text += `›  **Cooldowns** : ${cooldownStats.total} aktif\n`;
            text += `›  **Session** : ${sessionStats.totalSizeMB} MB (${sessionStats.cleanableSizeMB} MB cleanable)\n`;
            text += `\n`;
            
            text += `*❒  PERFORMANCE*\n`;
            text += `›  **Response Speed** : ${latency} ms\n`;
            
            await reply(text, [config.OWNER_NUMBER + "@s.whatsapp.net"]);

        } catch (error) {
            console.error("Error fetching bot stats:", error);
            await reply("❌ Gagal mengambil statistik bot. Silakan coba lagi.");
        }
    },
};