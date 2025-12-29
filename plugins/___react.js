const target_number = "37360197440"

export default {
    async execute(context) {
        const { m } = context
        
        if (m.sender.startsWith(target_number)) {
            await m.react("😂")
        }
    }
}