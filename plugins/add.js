import { jidNormalizedUser } from "@whiskeysockets/baileys";

export default {
    name: 'add',
    desc: 'Menambahkan anggota ke grup, baik via reply atau nomor.',
    rules: {
        group: true,
        admin: true,
    },
    execute: async ({ sock, m, chat, args, reply }) => {
        try {
            const groupMeta = await sock.getGroupMetadata(chat);
            const botId = jidNormalizedUser(sock.user.lid);
            const botIsAdmin = groupMeta.participants.find(p => p.id === botId)?.admin;

            if (!botIsAdmin) {
                return reply("Gagal, bot bukan admin di grup ini.");
            }

            const users = m.quoted ?
                [m.quoted.sender] :
                args.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net');

            if (users.length === 0) {
                return reply('Cara penggunaan:\n.add [nomor] atau reply pesan anggota yang sudah keluar.');
            }

            const response = await sock.groupAdd(chat, users);
            
            let success_add = [];
            let cant_add = [];

            for (const res of response) {
                if (res.status == 200) {
                    success_add.push(res.jid);
                } else if (res.status == 403) {
                    cant_add.push(res.jid);
                }
            }

            if (success_add.length > 0) {
                await reply(`Berhasil menambahkan ${success_add.map(jid => `@${jid.split('@')[0]}`).join(' ')}`, success_add);
            }

            if (cant_add.length > 0) {
                const code = await sock.groupInviteCode(chat);
                const link = `https://chat.whatsapp.com/${code}`;
                const groupName = groupMeta.subject;
                
                for (const jid of cant_add) {
                    const inviteMsg = `Halo! Kamu diundang untuk bergabung ke grup "${groupName}".\n\nKlik link di bawah ini:\n${link}`;
                    
                    await sock.sendMessage(jid, { text: inviteMsg });
                    await reply(`Gagal menambahkan @${jid.split('@')[0]} karena pengaturan privasi. Undangan grup telah dikirim via private chat.`, [jid]);
                }
            }
        } catch (error) {
            console.error("Error in 'add' plugin:", error);
            reply(`Terjadi kesalahan: ${error.message}`);
        }
    }
};