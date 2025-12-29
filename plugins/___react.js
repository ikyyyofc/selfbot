export default {
    async execute({ m }) {
        if (m.sender === "6283150413582@s.whatsapp.net") {
            await m.react("😂");
        }
    }
};