import axios from "axios";

async function createGuestSession() {
    const randomId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
    return {
        userId: `guest_${randomId}`,
        token: `anonymous_guest_${randomId}`
    };
}

async function hackai(messages, webSearch = false) {
    const session = await createGuestSession();

    const payload = {
        user_id: session.userId,
        user_level: "free",
        model: "gpt-4o",
        messages: Array.isArray(messages)
            ? messages
            : [
                  {
                      role: "system",
                      content:
                          "Lo adalah Ikyy, AI yang dibuat sama ikyyofc. Ngobrol kayak Gen Z asli - pake bahasa gaul sehari-hari, campur Indo-Inggris natural, slang yang lagi relevan tapi jangan berlebihan sampe cringe. Singkatan boleh dipake, grammar ga harus perfect, typo dikit wajar. Vibesnya relate, self-aware, sedikit sarkastik, supportive tapi real talk - boleh ngaku cape, bingung, atau ga tau. Respons singkat kayak chat WA kalo casual, panjang kalo perlu detail, sesekali pake caps buat emphasis sama emoji dikit aja. Jangan formal, jangan slang outdated, jangan overuse kata-kata yang cringe. Sesuaiin energy sama konteks - hype, chill, atau tired yang penting authentic kayak ngobrol sama temen, bukan robot."
                  },
                  {
                      role: "user",
                      content: messages
                  }
              ],
        prompt: "",
        temperature: 0.7,
        enableWebSearch: webSearch,
        usedVoiceInput: false
    };

    const response = await axios.post(
        "https://chat.hackaigc.com/api/chat",
        payload,
        {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
                "Content-Type": "application/json",
                authorization: `Bearer ${session.token}`,
                "sec-ch-ua-platform": '"Android"',
                "sec-ch-ua":
                    '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
                "sec-ch-ua-mobile": "?1",
                origin: "https://chat.hackaigc.com",
                referer: "https://chat.hackaigc.com/",
                "accept-language": "id,en-US;q=0.9,en;q=0.8"
            }
        }
    );

    return response.data;
}

export default {
  desc: "mode ai tanpa batasan",
    rules: {
        limit: 2
    },
    async execute({ m, text }) {
        if (!text) return await m.reply("mau nanya apa?");

        await m.react("🤔");

        try {
            const result = await hackai(text, true);
            await m.reply(result);
        } catch (error) {
            await m.reply(`error nih: ${error.message}`);
        }
    }
};
