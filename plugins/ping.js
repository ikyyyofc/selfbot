import { performance } from "perf_hooks";
import os from "os";

function formatMem() {
    const total = os.totalmem();
    const free = os.freemem();

    const toGB = bytes => (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";

    return {
        total: toGB(total),
        free: toGB(free),
        used: toGB(total - free),
        percentUsed: ((1 - free / total) * 100).toFixed(1) + "%"
    };
}

export default async function ({ reply, sock, from }) {
    const start = performance.now();
    const end = performance.now();
    const speed = end - start;
    const mem = formatMem();
    reply(
        `🏓 Pong!\n\n•Latency:\n  ${start.toFixed(4)}ms\n\n•RAM:\n  Total: ${
            mem.total
        }\n  Free: ${mem.free}\n  Used: ${mem.used} (${mem.percentUsed})`
    );
}

// Contoh plugin lain:
// File: plugins/test.js

// export default async function ({ reply, args, text, fileBuffer }) {
//     await reply(`Test command`);
//
//     if (args.length > 0) {
//         await reply(`Args: ${args.join(", ")}`);
//     }
//
//     if (fileBuffer) {
//         await reply("Ada file yang dikirim!");
//     }
// }
