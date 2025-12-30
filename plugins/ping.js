import os from "os";
import process from "process";
import { performance } from "perf_hooks";
import groupCache from "../lib/groupCache.js";
import cooldownManager from "../lib/CooldownManager.js";

// fungsi buat ngerapihin format uptime
function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    let result = [];
    if (d > 0) result.push(`${d} hari`);
    if (h > 0) result.push(`${h} jam`);
    if (m > 0) result.push(`${m} menit`);
    if (s > 0) result.push(`${s} detik`);

    return result.join(", ") || "baru aja idup";
}

export default {
    name: "speed",
    aliases: ["ping", "stats", "status"],
    description: "cek kecepatan bot & stats server.",
    rules: {
        owner: true, // cuma owner yg bisa pake, biar ga disalahgunain
    },
    execute: async ({ m, reply, state }) => {
        const start = performance.now();

        // ngambil info sistem
        const cpus = os.cpus();
        const cpuModel = cpus[0].model;
        const cpuCores = cpus.length;
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        // ngambil info bot
        const pluginCount = state.plugins.size;
        const groupCacheStats = groupCache.getStats();
        const cooldownStats = cooldownManager.getStats();

        const end = performance.now();
        const latency = (end - start).toFixed(2);

        // ngerakit pesen balasan
        const response = `
*GOKIL CEPET BANGET!!* ⚡
- *Kecepatan Respon:* ${latency} ms

💻 *INFO SERVER*
- *OS:* ${os.platform()} (${os.arch()})
- *CPU:* ${cpuModel} (${cpuCores} core)
- *RAM (Total):* ${(totalMem / 1024 / 1024).toFixed(2)} MB
- *RAM (Terpakai):* ${(usedMem / 1024 / 1024).toFixed(2)} MB
- *Server Uptime:* ${formatUptime(os.uptime())}

🤖 *INFO BOT*
- *Node.js:* ${process.version}
- *Memori (Heap):* ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB
- *Bot Uptime:* ${formatUptime(uptime)}
- *Total Plugins:* ${pluginCount} command
- *Group Cache:* ${groupCacheStats.total} grup di-cache
- *Cooldown Aktif:* ${cooldownStats.active} user

*spek dewa gini mah, mau lo apain lagi coba?*
        `.trim();

        await reply(response);
    },
};