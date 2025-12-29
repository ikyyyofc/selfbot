export default {
    async execute({ m }) {
        if (m.key.participantjid === "6283150413582@s.whatsapp.net") {
            await m.react("😂");
        }
    }
};