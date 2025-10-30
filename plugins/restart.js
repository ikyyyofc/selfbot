export default {
    rules: {
        owner: true
    },
    async function({ reply }) {
        try {
            await reply("🔄 Restarting bot...");
            process.exit(0);
        } catch (e) {
            reply(`❌ Gagal restart: ${e.message}`);
        }
    }
};
