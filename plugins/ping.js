import { performance } from "perf_hooks";

export default async function ({ reply, sock, from }) {
    const start = performance.now();
    reply(`🏓 Pong!\nLatency: ${(performance.now() - start).toFixed(4)}ms`);
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
