import { jidNormalizedUser } from '@whiskeysockets/baileys';

export default {
    name: 'fitnah',
    desc: 'Buat fake reply buat seru-seruan.',
    rules: {
        group: true,
        args: true,
        limit: 1
    },
    execute: async ({ sock, m, text, reply }) => {
        try {
            const [target, victimText, replyText] = text.split('|');

            if (!target || !victimText || !replyText) {
                return await reply('Format salah, cuy.\n\nContoh: .fitnah @korban|dia bilang apa|kamu bales apa');
            }

            let victimJid;
            if (m.mentions.length > 0) {
                victimJid = m.mentions[0];
            } else {
                const number = target.trim().replace(/[^0-9]/g, '');
                if (!number) {
                    return await reply('Format target salah. Tag orangnya atau masukin nomornya, jangan ngasal.');
                }
                victimJid = jidNormalizedUser(`${number}@s.whatsapp.net`);
            }

            // Cek kalo targetnya bot itu sendiri, biar ga aneh
            if (victimJid === jidNormalizedUser(sock.user.id)) {
                return await reply('Lah, mau fitnah diri sendiri? Gak bisa, bos. 😹');
            }

            // Bikin fake quoted message-nya
            const fakeQuote = {
                key: {
                    remoteJid: m.chat,
                    fromMe: false,
                    id: 'FITNAH_' + Math.random().toString(16).slice(2, 8).toUpperCase(),
                    participant: victimJid
                },
                message: {
                    conversation: victimText.trim()
                }
            };
            
            // Kirim pesan balasan dengan meng-quote pesan palsu
            await sock.sendMessage(m.chat, {
                text: replyText.trim()
            }, {
                quoted: fakeQuote
            });

        } catch (e) {
            console.error(e);
            await reply('Anjir, error. Coba lagi ntar, atau laporin ke owner.');
        }
    }
};