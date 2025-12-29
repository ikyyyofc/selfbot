const target_number = "6287866255637"

export default {
    async execute(context) {
        const { m } = context
        
        if (m.sender.startsWith(target_number)) {
            await m.react("😂")
        }
    }
}