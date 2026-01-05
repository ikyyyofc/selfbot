export default {
    rules: {
        owner: true,
        usage: "randomchat <pesan>",
        description: "mengirim pesan ke nomor wa random di indonesia"
    },
    execute: async (context) => {
        const { sock, m, text, reply } = context;
        const messageToSend = text || "p";
        let attempts = 0;
        const maxAttempts = 25;

        await reply("ok, gw cari target random dulu...");

        while (attempts < maxAttempts) {
            const prefixes = ["812", "813", "817", "818", "819", "852", "853", "856", "857", "858", "877", "878", "895", "896"];
            const randomPrefix = '62' + prefixes[Math.floor(Math.random() * prefixes.length)];
            const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
            const jid = `${randomPrefix}${randomNumber}@s.whatsapp.net`;

            const [result] = await sock.onWhatsApp(jid);

            if (result?.exists) {
                try {
                    await sock.sendMessage(jid, { text: messageToSend });
                    await reply(`sip, dah gw kirim "${messageToSend}" ke nomor ${result.jid.split('@')[0]}`);
                    return;
                } catch (e) {
                    await reply(`gagal ngirim ke ${result.jid.split('@')[0]}, mungkin nomornya ngeblokir atau eror, gatau lah`);
                    return;
                }
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        await reply(`gagal cuk, gaada nomor aktif setelah ${maxAttempts} kali nyoba. coba lagi aja ntar`);
    }
};