import axios from 'axios';

export default {
    desc: 'Create video from text using AI',
    usage: '.txt2vid <prompt>',
    rules: {
        limit: 5,
        premium: true
    },
    async execute({ m, text, sock, reply }) {
        if (!text) {
            return await reply(`Provide a prompt to generate the video.\n\nExample: \`${this.usage}\``);
        }

        try {
            await reply('⏳ Generating video from your prompt, please wait a moment...');

            const generateUrl = `https://wudysoft.xyz/api/ai/muapi?action=generate&tools=openai-sora-2-pro-text-to-video&prompt=${encodeURIComponent(text)}&aspect_ratio=9:16`;
            const generateRes = await axios.get(generateUrl);

            if (generateRes.data.status !== 'processing' || !generateRes.data.request_id) {
                throw new Error(generateRes.data.error || 'Failed to start video generation process.');
            }

            const taskId = generateRes.data.request_id;
            const pollUrl = `https://wudysoft.xyz/api/ai/muapi?action=status&task_id=${taskId}`;
            
            const startTime = Date.now();
            const timeout = 15 * 60 * 1000;
            let videoUrl = null;

            while (Date.now() - startTime < timeout) {
                await new Promise(resolve => setTimeout(resolve, 10000)); 

                const pollRes = await axios.get(pollUrl);
                const status = pollRes.data.status;

                if (status === 'completed') {
                    if (pollRes.data.outputs && pollRes.data.outputs.length > 0) {
                        videoUrl = pollRes.data.outputs[0];
                        break;
                    } else {
                        throw new Error('Process completed but no video URL was found.');
                    }
                } else if (status === 'failed' || pollRes.data.error) {
                    throw new Error(pollRes.data.error || 'Video generation failed.');
                }
            }

            if (!videoUrl) {
                throw new Error('Video generation timed out after 15 minutes.');
            }

            await sock.sendMessage(
                m.chat, 
                { 
                    video: { url: videoUrl },
                    caption: `✅ Video generated!\n\n*Prompt:* ${text}` 
                }, 
                { quoted: m }
            );

        } catch (error) {
            console.error(error);
            await reply(`❌ An error occurred: ${error.message}`);
        }
    }
};