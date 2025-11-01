export default {
    name: "delete",
    desc: "Hapus pesan (reply pesan yang mau dihapus)",
    rules: {},
    
    async execute({ sock, m, isGroup, reply }) {
        if (!m.quoted) {
            return await reply("❌ Reply pesan yang mau dihapus!");
        }

        const quotedMsg = m.quoted;
        const quotedKey = quotedMsg.key;

        if (isGroup) {
            const groupAdmins = await sock.getGroupAdmins(m.chat);
            const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
            const isBotAdmin = groupAdmins.includes(botJid);

            if (isBotAdmin) {
                try {
                    await sock.sendMessage(m.chat, { 
                        delete: quotedKey 
                    });
                    await m.react("✅");
                } catch (error) {
                    await reply(`❌ Gagal hapus pesan: ${error.message}`);
                }
            } else {
                if (!quotedKey.fromMe) {
                    return await reply("❌ Bot bukan admin, cuman bisa hapus pesan bot sendiri!");
                }

                try {
                    await sock.sendMessage(m.chat, { 
                        delete: quotedKey 
                    });
                    await m.react("✅");
                } catch (error) {
                    await reply(`❌ Gagal hapus pesan: ${error.message}`);
                }
            }
        } else {
            if (!quotedKey.fromMe) {
                return await reply("❌ Di private chat, cuman bisa hapus pesan bot sendiri!");
            }

            try {
                await sock.sendMessage(m.chat, { 
                    delete: quotedKey 
                });
                await m.react("✅");
            } catch (error) {
                await reply(`❌ Gagal hapus pesan: ${error.message}`);
            }
        }
    }
};