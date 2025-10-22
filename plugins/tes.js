export default async function ({ sock, m, args }) {
    const buttons = [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "Button 1",
                id: ".menu"
            })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "Button 2",
                id: ".info"
            })
        },
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: "Visit Website",
                url: "https://github.com"
            })
        }
    ];

    const interactiveMessage = {
        header: {
            title: "Interactive Button",
            hasMediaAttachment: false
        },
        body: {
            text: "Pilih salah satu button di bawah ini:"
        },
        footer: {
            text: "Powered by WhatsApp Bot"
        },
        nativeFlowMessage: {
            buttons: buttons,
            messageParamsJson: ""
        }
    };

    const message = {
        viewOnceMessage: {
            message: {
                interactiveMessage: interactiveMessage
            }
        }
    };

    await sock.relayMessage(m.chat, message, {});
}