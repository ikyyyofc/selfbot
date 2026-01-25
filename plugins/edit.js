import axios from 'axios';
import FormData from 'form-data';

export default {
    execute: async ({ sock, m, text, reply, getFile }) => {
        // Cek prompt
        if (!text) {
            return reply(`Kasih prompt-nya dong ngab. Mau diedit jadi apa?\n\nContoh: *!nanobanana become anime style*`);
        }

        // Ambil media (support reply atau kirim langsung)
        const mediaBuffer = await getFile();
        if (!mediaBuffer) {
            return reply("Gambarnya mana wir? Kirim atau reply foto terus kasih caption command-nya. 🍌");
        }

        await reply("Bentar ye, lagi dimasak sama AI-nya... 🍳");

        try {
            // Setup Form Data
            const formData = new FormData();
            formData.append('target_images', mediaBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
            formData.append('prompt', text);

            const headers = {
                'product-serial': 'rvgaeg',
                'product-code': '067003',
                'sec-ch-ua-platform': '"Android"',
                'sec-ch-ua-mobile': '?1',
                ...formData.getHeaders()
            };

            // Request Create Job
            const { data: createData } = await axios.post(
                'https://api.unwatermark.ai/api/web/v1/photo-editor-nano-banana/create-job',
                formData,
                { headers }
            );

            if (createData.code !== 300000 || !createData.result?.job_id) {
                return reply("Duh, gagal bikin job ID-nya. Coba gambar lain atau prompt yang lebih simpel.");
            }

            const jobId = createData.result.job_id;
            let resultUrl = null;
            let attempts = 0;

            // Polling status (max 40x percobaan @ 2 detik)
            while (attempts < 40) {
                await new Promise(r => setTimeout(r, 2000));

                const { data: checkData } = await axios.get(
                    `https://api.unwatermark.ai/api/web/v1/photo-editor-nano-banana/get-job/${jobId}`,
                    {
                        headers: {
                            'product-serial': 'rvgaeg',
                            'product-code': '067003',
                            'sec-ch-ua-platform': '"Android"',
                            'sec-ch-ua-mobile': '?1'
                        }
                    }
                );

                // Cek output
                if (checkData.result?.output_url) {
                    resultUrl = checkData.result.output_url;
                    break;
                } else if (checkData.code !== 300006) {
                    // Kalau codenya bukan 'processing' (300006), berarti error
                    throw new Error(checkData.msg || "Unknown error saat processing");
                }
                attempts++;
            }

            if (!resultUrl) {
                return reply("Lama banget anjir, timeout. Server AI-nya lagi sibuk kayaknya.");
            }

            // Kirim hasil
            await sock.sendMessage(m.chat, {
                image: { url: resultUrl },
                caption: `✅ *Nih Hasilnya!* 🍌\nPrompt: ${text}`
            }, { quoted: m });

        } catch (error) {
            console.error(error);
            const errMsg = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
            await reply(`❌ *Error nih:*\n${errMsg}`);
        }
    }
};