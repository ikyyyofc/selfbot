// plugins/ping.js

export default async function ({ reply, sock, from }) {
    const start = Date.now();
    const sent = await reply("Pinging...");
    const latency = Date.now() - start;
    
    await sock.sendMessage(from, {
        text: `🏓 Pong!\nLatency: ${latency}ms`,
        edit: sent.key
    });
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