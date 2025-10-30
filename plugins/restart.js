export default {
  desc: "menjalankan ulang bot",
    rules: {
        owner: true
    },
    async execute({ reply }) {
        try {
            await reply("🔄 Restarting bot...");
            process.exit(0);
        } catch (e) {
            reply(`❌ Gagal restart: ${e.message}`);
        }
    }
};
