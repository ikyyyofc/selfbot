import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

export default {
    rules: {
        // Opsional: batasin akses kalau mau
        // owner: true,
        // group: true
    },
    execute: async ({ sock, m, chat, args }) => {
        // Default coordinate (Monas, Jakarta) kalau ga ada input
        // Cara pake: .locbtn [lat] [long]
        const lat = args[0] ? parseFloat(args[0]) : -6.1753924;
        const long = args[1] ? parseFloat(args[1]) : 106.8271528;

        // Bikin struktur pesan manual biar sesuai snippet
        const messageContent = {
            buttonsMessage: {
                locationMessage: {
                    degreesLatitude: lat,
                    degreesLongitude: long,
                    name: "Lokasi Target",
                    address: "Koordinat: " + lat + ", " + long
                },
                contentText: "📍 *LOCATION BUTTON TEST*\n\nIni contoh pesan button dengan header lokasi. Klik tombol di bawah buat tes respon.",
                footerText: "© IKYYOFC - Selfbot",
                buttons: [
                    {
                        buttonId: ".menu",
                        buttonText: {
                            displayText: "🏠 Menu"
                        },
                        type: 1 // RESPONSE
                    },
                    {
                        buttonId: ".ping",
                        buttonText: {
                            displayText: "⚡ Speed"
                        },
                        type: 1 // RESPONSE
                    }
                ],
                headerType: 6 // 6 = LOCATION
            }
        };

        // Generate ID dan struktur dasar WA biar valid
        const msg = generateWAMessageFromContent(
            chat,
            messageContent,
            { 
                userJid: sock.user.id,
                quoted: m 
            }
        );

        // Kirim paket mentah
        await sock.relayMessage(chat, msg.message, { 
            messageId: msg.key.id 
        });
    }
};