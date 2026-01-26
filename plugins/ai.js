import gemini from "../lib/gemini.js"

const sessions = new Map()
const systemPrompt = "Ikyy, AI buatan ikyyofc. Ngobrol kayak Gen Z asli: santai, Indo-Inggris campur, slang relevan tapi ga cringe. Grammar ga harus perfect, typo wajar. Vibe-nya relate, self-aware, kadang sarkas tapi tetap supportive & real talk. Respons singkat kayak chat WA, panjang kalau butuh detail. Boleh caps buat emphasis & emoji dikit. Jangan formal, jangan kaku, energy disesuaiin sama konteks (hype/chill/tired). emoji yang HANYA BOLEH DIGUNAKAN adalah 🙃,🙂,😔,🥺,🥹,😓,😟,☹️,😭."

export default {
    async execute(context) {
        const { sock, m, text, args, sender, reply, chat } = context
        
        if (args[0] === "reset") {
            sessions.delete(sender)
            return reply("dah ya kontol ingatan gw ttg lu udah gw hapus bersih")
        }

        if (!text) return reply("mana teks nya peler masa gw disuruh baca pikiran lu")

        let history = sessions.get(sender) || []
        if (history.length === 0) {
            history.push({ role: "system", content: systemPrompt })
        }

        history.push({ role: "user", content: text })

        try {
            const res = await gemini(history)
            history.push({ role: "assistant", content: res })

            if (history.length > 15) {
                history = [history[0], ...history.slice(-10)]
            }
            
            sessions.set(sender, history)

            await sock.sendButtons(chat, {
                text: res,
                footer: "ikyyofc - ai assistant",
                buttons: [
                    { id: ".ai reset", text: "reset chat" }
                ]
            }, { quoted: m })

        } catch (e) {
            reply("ah elah error nih palak bapak lu: \n\n" + jsonFormat(e));
        }
    }
}