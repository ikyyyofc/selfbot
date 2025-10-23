import axios from "axios";
import crypto from "crypto";
import upload from "../lib/upload.js";
import { shannz: cf } from "bycf";

export default async function ({ sock, m, from, args, text, reply, fileBuffer }) {
  try {
    if (!text) return reply("⚠️ Masukkan prompt untuk membuat video.\n\nContoh:\n.txt2vid seorang wanita sedang duduk di pantai");
    
    let q = m.quoted ? m.quoted : m;
    let img = null
    if (q.type == "imageMessage") img = await upload(fileBuffer)
    
    let proses = await veo3(text, {image:img})

    reply(proses)
  } catch (err) {
    console.error(err);
    reply("❌ Terjadi kesalahan saat membuat video: " + err.message);
  }
}

async function veo3(prompt, { image = null } = {}) {
    try {
        if (!prompt) throw new Error('Prompt is required');
        
        const { data: cf } = await axios.post('https://cf.nekolabs.my.id/action', {
            mode: 'turnstile-min',
            siteKey: '0x4AAAAAAANuFg_hYO9YJZqo',
            url: 'https://aivideogenerator.me/features/g-ai-video-generator'
        });
        
        const num = Math.floor(Math.random() * 100) + 1700;
        const uid = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
        const { data: task } = await axios.post('https://aiarticle.erweima.ai/api/v1/secondary-page/api/create', {
            prompt: prompt,
            imgUrls: image ? [image] : [],
            quality: '720p',
            duration: 8,
            autoSoundFlag: false,
            soundPrompt: '',
            autoSpeechFlag: false,
            speechPrompt: '',
            speakerId: 'Auto',
            aspectRatio: '16:9',
            secondaryPageId: num,
            channel: 'VEO3',
            source: 'aivideogenerator.me',
            type: 'features',
            watermarkFlag: true,
            privateFlag: true,
            isTemp: true,
            vipFlag: true,
            model: 'veo-3-fast'
        }, {
            headers: {
                uniqueid: uid,
                verify: cf.token
            }
        });
        
        while (true) {
            const { data } = await axios.get(`https://aiarticle.erweima.ai/api/v1/secondary-page/api/${task.data.recordId}`, {
                headers: {
                    uniqueid: uid,
                    verify: cf.token
                }
            });
            
            if (data.data.state === 'fail') return JSON.parse(data.data.completeData);
            if (data.data.state === 'success') return JSON.parse(data.data.completeData);
            await new Promise(res => setTimeout(res, 1000));
        }
    } catch (error) {
        throw new Error(error.message);
    }
}