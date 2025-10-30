export default {
    rules: {
        owner: true
    },

    execute: async ({ sock, args, reply }) => {
        if (!args[0]) {
            return await reply("⚠️ Masukkan link grup!\n\nContoh: .join https://chat.whatsapp.com/xxxxx");
        }

        const urlRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
        const match = args[0].match(urlRegex);

        if (!match) {
            return await reply("❌ Link grup tidak valid!");
        }

        const code = match[1];

        try {
            await reply("⏳ Bergabung ke grup...");
            const result = await sock.groupAcceptInvite(code);
            await reply(`✅ Berhasil join grup!\n\nID: ${result}`);
        } catch (error) {
            const errorMsg = error.message.toLowerCase();
            
            if (errorMsg.includes("already")) {
                return await reply("⚠️ Bot sudah ada di grup ini!");
            } else if (errorMsg.includes("bad-request")) {
                return await reply("❌ Link grup sudah tidak valid atau expired!");
            } else if (errorMsg.includes("forbidden")) {
                return await reply("❌ Bot tidak bisa join, mungkin grup ditutup!");
            } else {
                return await reply(`❌ Gagal join grup: ${error.message}`);
            }
        }
    }
};