import axios from "axios";

const decrypt = (encryptedBase64) => {
    try {
        const inputBytes = Buffer.from(encryptedBase64, 'base64');
        const keyBytes = Buffer.from('G3mmy@pp_2025_S3cur3K3y!', 'utf-8');
        const outputBytes = Buffer.alloc(inputBytes.length);

        for (let i = 0; i < inputBytes.length; i++) {
            outputBytes[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
        }

        return outputBytes.toString('utf-8');
    } catch (e) {
        return null;
    }
};

const execute = async (context) => {
    const { sock, m, reply } = context;

    await reply("Wait, lagi nyolong key dari server bentar... 🏃💨");

    try {
        const { data } = await axios.get("https://firebasestorage.googleapis.com/v0/b/gemmy-ai-bdc03.appspot.com/o/remote_config.json?alt=media");
        
        if (!data?.remote_config?.[0]?.gemini_api_key) {
            return reply("Gagal fetch config-nya, mungkin URL mati atau strukturnya ganti.");
        }

        const encryptedKey = data.remote_config[0].gemini_api_key;
        const decryptedKey = decrypt(encryptedKey);

        if (!decryptedKey) {
            return reply("Waduh, gagal decrypt key-nya. Algo-nya beda kali.");
        }

        await sock.sendInteractiveMessage(m.chat, {
            text: "Nih API Key Gemini terbaru yang berhasil di-retrieve.\nLangsung klik tombol di bawah buat nyalin, gausah ribet.",
            footer: "🔐 Secured by Ikyy",
            header: {
                title: "GEMINI API KEY FETCH",
                hasMediaAttachment: false
            },
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 SALIN API KEY",
                        copy_code: decryptedKey
                    })
                }
            ]
        }, { quoted: m });

    } catch (e) {
        console.error(e);
        await reply(`Error cuy: ${e.message}`);
    }
};

export default {
    execute,
    rules: {
        owner: true 
    }
};