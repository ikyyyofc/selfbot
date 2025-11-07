
export default {
    rules: {
        group: true,
        admin: true,
    },
    desc: "Mengeluarkan anggota dari grup.",
    execute: async (context) => {
        const { sock, m, chat, reply } = context;

        try {
            const botIsAdmin = await sock.isGroupAdmin(chat, sock.user.id);
            if (!botIsAdmin) {
                return await reply("Bot harus menjadi admin untuk menggunakan perintah ini.");
            }

            let users = m.mentions;
            if (users.length === 0 && m.quoted) {
                users = [m.quoted.sender];
            }

            if (users.length === 0) {
                return await reply("Tag atau balas pesan anggota yang ingin dikeluarkan.");
            }
            
            const usersToKick = users.filter(jid => jid !== sock.user.id);

            if (usersToKick.length === 0) {
                return await reply("Tidak bisa mengeluarkan diri sendiri.");
            }

            await sock.groupRemove(chat, usersToKick);
            
            // Nggak perlu reply karena udah ada notif default dari WhatsApp
            
        } catch (error) {
            console.error(error);
            await reply("Gagal mengeluarkan anggota. Mungkin dia adalah admin/owner grup.");
        }
    },
};