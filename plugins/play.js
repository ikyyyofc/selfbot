import fetch from 'node-fetch';
import yts from 'yt-search';

// Config UA biar ga dikira bot (padahal iya wwk)
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36';

// --- SCRAPER FUNCTIONS (Ported from Reference) ---

async function getToken(url) {
    const r = await fetch(`https://v2.ytmp3.wtf/button/?url=${encodeURIComponent(url)}`, {
        headers: {
            'user-agent': UA,
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'accept-language': 'id-ID,id;q=0.6',
            'referer': 'https://v2.ytmp3.wtf/',
            'upgrade-insecure-requests': '1',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-dest': 'document'
        }
    });

    const html = await r.text();
    const cookie = r.headers.get('set-cookie') || '';
    const phpsessid = cookie.match(/PHPSESSID=([^;]+)/)?.[1];
    const tokenId = html.match(/'token_id':\s*'([^']+)'/)?.[1];
    const validTo = html.match(/'token_validto':\s*'([^']+)'/)?.[1];

    if (!phpsessid || !tokenId || !validTo) throw new Error('Gagal dapetin token session');
    return { phpsessid, tokenId, validTo };
}

async function startConvert(url, token) {
    const body = new URLSearchParams({
        url,
        convert: 'gogogo',
        token_id: token.tokenId,
        token_validto: token.validTo
    });

    const r = await fetch(`https://v2.ytmp3.wtf/convert/`, {
        method: 'POST',
        headers: {
            'user-agent': UA,
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'origin': 'https://v2.ytmp3.wtf',
            'referer': `https://v2.ytmp3.wtf/button/?url=${encodeURIComponent(url)}`,
            'cookie': `PHPSESSID=${token.phpsessid}`,
            'x-requested-with': 'XMLHttpRequest',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty'
        },
        body
    });

    const t = await r.text();
    let j;
    try {
        j = JSON.parse(t);
    } catch {
        throw new Error('Response server bukan JSON');
    }
    
    if (!j.jobid) throw new Error(j.error || 'Job ID hilang entah kemana');
    return j.jobid;
}

async function poll(jobid, token) {
    // Polling max 30x (sekitar 90 detik timeout)
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const r = await fetch(`https://v2.ytmp3.wtf/convert/?jobid=${jobid}&time=${Date.now()}`, {
            headers: {
                'user-agent': UA,
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'referer': 'https://v2.ytmp3.wtf/',
                'cookie': `PHPSESSID=${token.phpsessid}`,
                'x-requested-with': 'XMLHttpRequest'
            }
        });
        
        const t = await r.text();
        if (!t.trim().startsWith('{')) continue;
        
        const j = JSON.parse(t);
        if (j.error) throw new Error(j.error);
        if (j.ready && j.dlurl) return j.dlurl;
    }
    throw new Error('Kelamaan convert-nya, timeout bos.');
}

// --- PLUGIN EXPORT ---

export default {
    name: 'play',
    description: 'Play audio from YouTube',
    cmd: ['play', 'song', 'lagu'],
    execute: async ({ sock, m, text }) => {
        if (!text) return m.reply('Judul lagunya mana cak? 🗿\nContoh: *.play see you again*');

        await m.reply('🔍 *Wait, nyari lagu dulu...*');

        try {
            // 1. Cari dulu di YouTube
            const search = await yts(text);
            if (!search.all || search.all.length === 0) {
                return m.reply('❌ Lagu ga ketemu, coba kata kunci lain.');
            }
            
            // Ambil hasil pertama video
            const video = search.all.find(v => v.type === 'video');
            if (!video) return m.reply('❌ Ga nemu video yang cocok.');

            await m.reply(`🎶 *Ditemukan:* ${video.title}\n⏳ *Sedang mendownload...*`);

            // 2. Proses Scraping (Pake referensi user)
            const token = await getToken(video.url);
            const jobid = await startConvert(video.url, token);
            const dlUrl = await poll(jobid, token);

            // 3. Download Buffer Audio
            const res = await fetch(dlUrl, { headers: { 'user-agent': UA } });
            if (!res.ok) throw new Error('Gagal download file audio');
            
            // Gunakan arrayBuffer convert ke Buffer biar aman
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // 4. Kirim Audio
            await sock.sendMessage(m.chat, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`,
                // Pake externalAdReply biar cakep ada thumbnailnya
                contextInfo: {
                    externalAdReply: {
                        title: video.title,
                        body: `Duration: ${video.timestamp} | View: ${video.views}`,
                        thumbnailUrl: video.thumbnail,
                        sourceUrl: video.url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

        } catch (error) {
            console.error('Play Plugin Error:', error);
            await m.reply(`❌ *Ups Error:* ${error.message}`);
        }
    }
};