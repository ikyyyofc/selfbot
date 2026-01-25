import yts from 'yt-search'
import fetch from 'node-fetch'

const ua = 'mozilla/5.0 (linux; android 10; k) applewebkit/537.36 (khtml, like gecko) chrome/144.0.0.0 mobile safari/537.36'

async function gettoken(url) {
    const r = await fetch(`https://v2.ytmp3.wtf/button/?url=${encodeURIComponent(url)}`, {
        headers: { 'user-agent': ua }
    })
    const html = await r.text()
    const cookie = r.headers.get('set-cookie') || ''
    return {
        phpsessid: cookie.match(/phpsessid=([^;]+)/)?.[1],
        tokenid: html.match(/'token_id':\s*'([^']+)'/)?.[1],
        validto: html.match(/'token_validto':\s*'([^']+)'/)?.[1]
    }
}

async function convert(url, token) {
    const r = await fetch('https://v2.ytmp3.wtf/convert/', {
        method: 'POST',
        headers: {
            'user-agent': ua,
            'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
            'cookie': `phpsessid=${token.phpsessid}`,
            'x-requested-with': 'xmlhttprequest'
        },
        body: new URLSearchParams({
            url,
            convert: 'gogogo',
            token_id: token.tokenid,
            token_validto: token.validto
        })
    })
    const j = await r.json()
    if (!j.jobid) throw 'jobid ilang gblk'
    return j.jobid
}

async function poll(jobid, token) {
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const r = await fetch(`https://v2.ytmp3.wtf/convert/?jobid=${jobid}&time=${Date.now()}`, {
            headers: {
                'user-agent': ua,
                'cookie': `phpsessid=${token.phpsessid}`,
                'x-requested-with': 'xmlhttprequest'
            }
        })
        const j = await r.json()
        if (j.ready && j.dlurl) return j.dlurl
    }
    throw 'kelamaan kaga kelar kelar'
}

export default {
    execute: async (context) => {
        const { sock, m, text } = context
        if (!text) return m.reply('judulnya apa tolol masa gua disuruh nebak')

        const search = await yts(text)
        const vid = search.all[0]
        if (!vid) return m.reply('kaga ketemu videonya budek apa gimana')

        m.reply(`sabar yaet gua donlotin dulu vidio si ${vid.title}`)

        try {
            const token = await gettoken(vid.url)
            const jobid = await convert(vid.url, token)
            const dlurl = await poll(jobid, token)

            const res = await fetch(dlurl)
            const buff = await res.buffer()

            await sock.sendMessage(m.chat, {
                audio: buff,
                mimetype: 'audio/mpeg',
                fileName: `${vid.title}.mp3`
            }, { quoted: m })
        } catch (e) {
            m.reply(`error gblk nih: ${e}`)
        }
    }
}