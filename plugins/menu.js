import time from '../lib/TimeHelper.js'
const config = (await import('../config.js')).default

export default {
    execute: async (context) => {
        const { m, state, reply } = context
        const commands = [...state.plugins.keys()].sort()
        const prefix = config.PREFIX[0]
        const senderName = m.pushName || 'manusia gajelas'
        const botName = config.BOT_NAME || 'bot'
        const ownerName = config.OWNER_NAME || 'owner'

        const hour = time.getWIBHour()
        let greeting
        if (hour < 11) {
            greeting = 'pagi'
        } else if (hour < 15) {
            greeting = 'siang'
        } else if (hour < 19) {
            greeting = 'sore'
        } else {
            greeting = 'malem'
        }

        let menuText = `halo ${senderName} selamat ${greeting}\n`
        menuText += `gw ${botName.toLowerCase()} bot wa buatan ${ownerName.toLowerCase()}\n\n`
        menuText += 'nih daftar command yg ada:\n\n'

        for (const cmd of commands) {
            menuText += ` › ${prefix}${cmd}\n`
        }

        menuText += `\npake command nya yg bener jgn nyepam tolol`

        await reply(menuText.trim())
    }
}