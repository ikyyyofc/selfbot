export default {
    rules: {
        owner: true // Cuma owner yang bisa pake
    },
    desc: "Edit pesan bot dan mention JID.",
    async execute({ sock, m, text }) {
        const jidToMention = ["13135550002@s.whatsapp.net", "0@s.whatsapp.net"];

        if (!m.quoted || !m.quoted.fromMe) {
            return await m.reply("❌ Reply pesan bot yang mau diedit.");
        }

        try {
            await sock.sendMessage(m.chat, {
                text: text,
                mentions: [...jidToMention],
                edit: m.quoted.key
            });
        } catch (e) {
            console.error(e);
            await m.reply("Gagal mengedit pesan.");
        }
    }
};
