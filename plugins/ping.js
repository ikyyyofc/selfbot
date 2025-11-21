export default {
    desc: "Mengecek kecepatan respons bot.",
    rules: {
        limit: 1,
    },
    async execute({ sock, m }) {
        const startTime = Date.now();
        const speed = Date.now() - startTime;
        
        const text = `Pong! 💨\n${speed} ms`;

        await sock.sendMessage(m.chat, { text: text });
    },
};