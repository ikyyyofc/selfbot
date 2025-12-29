const target_number = "6283150413582"

export default {
    async execute(context) {
        const { m } = context
        
        if (m.sender.startsWith(target_number)) {
            await m.react("😂")
        }
    }
}