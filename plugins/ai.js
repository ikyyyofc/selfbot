import gemini from "../lib/gemini.js"

const sessions = new Map()
const systemPrompt = "nama lu ikyy asisten virtual cowo paling keren buatan ikyyofc lu pake bahasa santai sehari hari kaga usah pake tanda baca kaga usah pake kapital lu harus agak toxic dikit gapapa yg penting asik jangan kaku kek kanebo kering"

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