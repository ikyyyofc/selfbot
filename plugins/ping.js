// plugins/status.js

import os from "os";
import db from "../lib/Database.js";
import groupCache from "../lib/groupCache.js";
import sessionCleaner from "../lib/SessionCleaner.js";
import cooldown from "../lib/CooldownManager.js";
import { readFileSync } from "fs";
import { fetchLatestWaWebVersion } from "@whiskeysockets/baileys";

/**
 * Formats uptime from seconds to a readable string (d, h, m, s).
 * @param {number} seconds - The total seconds of uptime.
 * @returns {string} The formatted uptime string.
 */
function formatUptime(seconds) {
    function pad(s) {
        return (s < 10 ? "0" : "") + s;
    }
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    let result = "";
    if (d > 0) result += d + "d ";
    if (h > 0) result += h + "h ";
    if (m > 0) result += m + "m ";
    if (s > 0) result += s + "s";

    return result.trim() || "0s";
}

export default {
    name: "status",
    aliases: ["ping", "stats"],
    desc: "Cek kecepatan bot dan penggunaan sumber daya.",
    rules: {
        limit: 1 // Menggunakan 1 limit setiap kali command dieksekusi
    },

    async execute({ m, reply }) {
        const startTime = Date.now();

        // --- Data Gathering ---
        const memoryUsage = process.memoryUsage();
        const cpus = os.cpus();
        const uptime = process.uptime();

        const [users, groups] = await Promise.all([
            db.getAllUsers(),
            db.getAllGroups()
        ]);

        const groupCacheStats = groupCache.getStats();
        const sessionStats = sessionCleaner.getStats();
        const cooldownStats = cooldown.getStats();

        const baileysVersion = (await fetchLatestWaWebVersion()).version;

        // --- Latency & Processing Time ---
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        const latency = endTime - m.timestamp * 1000;

        // --- Build Response ---
        const responseText = `
*🤖 Bot Status & Performance*

*⚡ Kecepatan Respons:*
- *Waktu Proses:* ${processingTime} ms
- *Latensi Server:* ${latency} ms

*💻 Sumber Daya Sistem:*
- *Platform:* ${os.platform()}
- *CPU:* ${cpus[0].model} (${cpus.length} cores)
- *Memori (Heap):* ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(
            memoryUsage.heapTotal /
            1024 /
            1024
        ).toFixed(2)} MB
- *Uptime:* ${formatUptime(uptime)}

*📊 Statistik Aplikasi:*
- *Versi Wa Web:* v${baileysVersion}
- *Database:* ${users.length} Users | ${groups.length} Groups
- *Cache Grup:* ${groupCacheStats.total} groups cached
- *Cache DB:* ${db.userCache.size} users | ${db.groupCache.size} groups
- *File Session:* ${sessionStats.fileCount} files (${
            sessionStats.cleanableSizeMB
        } MB cleanable)
- *Cooldown Aktif:* ${cooldownStats.active} users

Dibuat oleh *ikyyofc*
`.trim();

        await reply(responseText);
    }
};
