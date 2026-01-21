import gemini from "../lib/gemini.js"

let db = {}

export default {
    async execute(context) {
        const { sock, m, text, args, sender, chat } = context

        if (!db[sender]) db[sender] = []

        if (args[0] === "reset") {
            db[sender] = []
            return m.reply("udh gw apus memori chat lu kyk mantan lu")
        }

        if (!text) return m.reply("isi teksnya tolol jgn kosong")

        db[sender].push({ role: "user", content: text })

        if (db[sender].length > 20) db[sender].shift()

        try {
            const res = await gemini(db[sender])
            db[sender].push({ role: "model", content: res })

            await sock.sendButtons(chat, {
                text: res,
                footer: "ikyy bot - ai assistant",
                buttons: [
                    { id: ".ai reset", text: "reset percakapan" }
                ]
            }, { quoted: m })
        } catch (e) {
            console.error(e)
            m.reply("error anjir kyknya limit ato emng otak ai nya lg konslet")
        }
    }
}