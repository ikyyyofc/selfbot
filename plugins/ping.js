// plugins/ping.js

export default async function ({ reply, sock, from }) {
    const start = Date.now();
    reply(`🏓 Pong!\nLatency: ${Date.now() - start}ms`);
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
