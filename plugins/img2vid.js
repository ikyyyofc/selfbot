
import axios from 'axios';
import upload from '../lib/upload.js';

export default {
    rules: {
        limit: 5, // butuh 5 limit per-penggunaan
        premium: false, // non-premium bisa pake
        group: true,
        private: true,
    },
    desc: 'Create a video from an image and a prompt.',
    async execute({ m, text, reply, getFile, sock }) {
        const hasMedia = m.isMedia || m.quoted?.isMedia;
        if (!hasMedia) {
            return reply('❌ Please reply to an image or send one with the command.');
        }
        
        const prompt = text.trim();
        if (!prompt) {
            return reply('❌ Please provide a prompt.\n\nExample: .img2vid make it cinematic');
        }

        await m.react('⏳');
        await reply('Uploading your image...');

        try {
            const buffer = await getFile();
            if (!buffer) throw new Error("Couldn't get the image buffer.");

            const imageUrl = await upload(buffer);
            if (!imageUrl) throw new Error('Failed to upload the image.');

            await reply(`Image uploaded! Generating video with prompt: "${prompt}". This might take a few minutes...`);

            const genPayload = {
                videoPrompt: prompt,
                videoAspectRatio: "16:9",
                videoDuration: 8,
                videoQuality: "540p",
                videoModel: "v4.5",
                videoImageUrl: imageUrl,
                videoPublic: false
            };

            const genResponse = await axios.post('https://veo31ai.io/api/pixverse-token/gen', genPayload, {
                headers: { 'Content-Type': 'application/json' }
            });

            const taskId = genResponse.data.taskId;
            if (!taskId) throw new Error('Failed to get task ID from the service.');

            let videoUrl;
            const timeout = Date.now() + 180000; // 3 minutes timeout

            while (Date.now() < timeout) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 seconds before polling

                const getPayload = {
                    taskId,
                    videoPublic: false,
                    videoQuality: "540p",
                    videoAspectRatio: "16:9",
                    videoPrompt: prompt
                };
                
                const res = await axios.post('https://veo31ai.io/api/pixverse-token/get', getPayload, {
                    headers: { 'Content-Type': 'application/json' }
                });

                if (res.data?.videoData?.url) {
                    videoUrl = res.data.videoData.url;
                    break;
                }
            }

            if (!videoUrl) {
                throw new Error('Video generation timed out or failed. Please try again later.');
            }

            await sock.sendMessage(
                m.chat, 
                { video: { url: videoUrl }, caption: `✅ Done!\n\nPrompt: ${prompt}` }, 
                { quoted: m }
            );

        } catch (error) {
            console.error('img2vid plugin error:', error);
            await reply(`❌ Oops, something went wrong: ${error.response?.data?.message || error.message}`);
        }
    }
};