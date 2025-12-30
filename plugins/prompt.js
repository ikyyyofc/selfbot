import gemini from "../lib/gemini.js";

export default {
    rules: {
        usage: "reply atau kirim gambar dengan caption .analisis <pertanyaan>",
    },
    async execute(context) {
        const { m, text, reply, getFile } = context;

        try {
            const file = await getFile();
            if (!file) {
                return await reply("mana gambarnya bego, reply atau kirim pake caption");
            }

            await m.react("🤔");
            await reply("sabar gw proses dulu...");

            const prompt = text || "analisis gambar ini dan berikan penjelasan yang detail dan lengkap";
            const messages = [{ role: "user", content: prompt }];
            const result = await gemini(messages, file);

            await reply(result);

        } catch (error) {
            console.error(error);
            await reply("error cuy, coba lagi ntar");
        }
    },
};