export default {
    async execute({ sock, m, isGroup, reply }) {
        if (!isGroup) return reply("cmd ini cuma buat grup");

        await reply("bye bye👋");
        await sock.groupLeave(m.chat);
    },

    rules: {
        owner: true,
        group: true
    }
};