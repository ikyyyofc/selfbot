export default {
    async execute({ m, reply }) {
        const start = m.timestamp;
        const end = Date.now();
        const latency = end - start;

        await reply(`pong!\nkecepatan respon: ${latency} ms`);
    }
};