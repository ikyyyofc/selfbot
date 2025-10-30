export default {
    rules: {
        owner: false,
        group: false,
        private: false,
        admin: false,
        premium: false,
        limit: false
    },

    execute: async ({ sock, m }) => {
        const config = (await import("../config.js")).default;
        
        const ownerNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, "");
        const ownerName = config.OWNER_NAME || "Owner";

        const vcard = 
            `BEGIN:VCARD\n` +
            `VERSION:3.0\n` +
            `FN:${ownerName}\n` +
            `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n` +
            `END:VCARD`;

        await sock.sendMessage(m.chat, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: m });

        await m.reply(`📱 *KONTAK OWNER*\n\nNama: ${ownerName}\nNomor: +${ownerNumber}\n\nSilakan save kontaknya!`);
    }
};