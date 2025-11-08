
export default {
    desc: "Mengecek kecepatan respon bot.",
    rules: {
        limit: 1
    },
    execute: async function (context) {
        const { m, reply } = context;
        const startTime = m.timestamp * 1000;
        const endTime = Date.now();
        const speed = endTime - startTime;

        await reply(`Pong! 🏓\nKecepatan respon: \`${speed} milidetik\``);
    }
};