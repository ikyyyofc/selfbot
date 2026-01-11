import axios from 'axios'

const API_CREATE = 'https://api.nekolabs.web.id/video.gen/sora/create'
const API_GET = 'https://api.nekolabs.web.id/video.gen/sora/get'
const POLLING_INTERVAL = 15000 
const MAX_WAIT_TIME = 30 * 60 * 1000 

export default {
    name: 'sora',
    aliases: ['soraai', 'aivideo'],
    
    execute: async ({ m, text, reply, sock }) => {
        if (!text) {
            return await reply('promptnya mana anjg')
        }

        try {
            await m.react('⏳')
            const initialMsg = await reply(`sabar cok, lagi dibuatin video dari prompt: "${text}". prosesnya bisa sampe setengah jam, jangan di spam ya anjg.`)

            const createRes = await axios.get(API_CREATE, {
                params: {
                    prompt: text,
                    ratio: '16:9'
                }
            })

            if (!createRes.data.success || !createRes.data.result?.id) {
                await m.react('❌')
                return await reply('gagal mulai sesi generate video, api nya error kali')
            }

            const taskId = createRes.data.result.id
            const startTime = Date.now()

            while (Date.now() - startTime < MAX_WAIT_TIME) {
                await delay(POLLING_INTERVAL)
                
                const statusRes = await axios.get(API_GET, {
                    params: { id: taskId }
                })

                if (statusRes.data.success) {
                    const { status, output } = statusRes.data.result
                    
                    if (status === 'succeeded' && output) {
                        await m.react('✅')
                        await sock.sendMessage(m.chat, { 
                            video: { url: output }, 
                            caption: `nih video lu anjg\n\nprompt: ${text}`
                        }, { quoted: m })
                        
                        // edit pesan awal kalo bisa (opsional)
                        if (initialMsg.key) {
                           await sock.sendMessage(m.chat, {
                                delete: initialMsg.key
                           })
                        }
                        return
                    }

                    if (status === 'failed' || status === 'error') {
                        await m.react('❌')
                        return await reply(`prosesnya gagal di tengah jalan, status: ${status}`)
                    }
                }
            }
            
            await m.react('❌')
            await reply('udah 30 menit kaga jadi jadi videonya, timeout anjg. coba lagi aja ntar.')

        } catch (e) {
            console.error(e)
            await m.react('❌')
            await reply(`error cok, gatau kenapa. cek console aja.\n\n${e.message}`)
        }
    }
}