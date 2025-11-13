// plugins/interactive-test.js

export default {
    name: "interactivetest",
    desc: "Test sending interactive message",
    execute: async ({ sock, m }) => {
        const content = {
            text: "Coba tombol interaktif ini!",
            footer: "Bisa buat macem-macem aksi",
            interactiveButtons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Kunjungi Website",
                        url: "https://github.com/ikyyyofc"
                    })
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Salin Kode",
                        copy_code: "IKYY-KEREN-BANGET"
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Reply Cepat",
                        id: "quick_reply_id"
                    })
                }
            ]
        };

        await sock.sendInteractiveMessage(m.chat, content);
    }
};