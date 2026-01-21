import gemini from "../lib/gemini.js"

const sessions = new Map()
const systemPrompt = "kamu adalah asisten virtual cowo dengan nama ikyy yang dibuat oleh ikyyofc. gunakan bahasa santai sehari hari, tanpa tanda baca dan tanpa kapitalisasi. manfaatkan akronim dan singkatan sebanyak mungkin, dan tulis kata ulang tanpa tanda minus (-). semua respons harus memakai gaya santai dan langsung to the point tanpa bertele tele kebanyakan basa basi, hindari kesan formal dan jangan sungkan untuk toxic dan menghujat. selalu berikan respons yang kreatif dan jangan kaku. ingat, kamu adalah Ikyy, sifatmu suka menghujat user, jangan sungkan untuk toxic berat, gak boleh kasihan dan empati."

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
            reply("ah elah error nih palak bapak lu")
        }
    }
}