import { performance } from "perf_hooks";

export default async function ({ reply, args, text, fileBuffer }) {
    if (!args[0]) {
        return reply('❌ Harap masukkan URL!\n\nContoh: .get https://api.example.com/data');
    }

    const url = args[0];
    
    // Validasi URL
    try {
        new URL(url);
    } catch (error) {
        return reply('❌ URL tidak valid!\n\nPastikan URL dimulai dengan http:// atau https://');
    }

    await reply('⏳ Mengambil data...');

    try {
        const start = performance.now();
        const response = await fetch(url);
        const end = performance.now();
        
        const contentType = response.headers.get('content-type') || 'unknown';
        const responseTime = (end - start).toFixed(2);
        const buffer = await response.arrayBuffer();

        // Info header
        const info = `✅ Retrieved\n\n•URL: ${url}\n•Status: ${response.status}\n•Response Time: ${responseTime}ms\n•Type: ${contentType}\n•Size: ${(buffer.byteLength / 1024).toFixed(2)} KB`;

        // Deteksi tipe konten dan kirim sesuai tipe
        if (contentType.includes('image/')) {
            // Kirim sebagai gambar
            await reply({
                image: Buffer.from(buffer),
                caption: info
            });
        } else if (contentType.includes('video/')) {
            // Kirim sebagai video
            await reply({
                video: Buffer.from(buffer),
                caption: info
            });
        } else if (contentType.includes('audio/')) {
            // Kirim sebagai audio
            await reply({
                audio: Buffer.from(buffer),
                mimetype: contentType
            });
            await reply(info);
        } else if (contentType.includes('application/pdf') || 
                   contentType.includes('application/zip') ||
                   contentType.includes('application/vnd.') ||
                   contentType.includes('application/x-')) {
            // Kirim sebagai dokumen
            const fileName = url.split('/').pop() || 'file';
            await reply({
                document: Buffer.from(buffer),
                mimetype: contentType,
                fileName: fileName,
                caption: info
            });
        } else if (contentType.includes('application/json')) {
            // Parse JSON
            const text = new TextDecoder().decode(buffer);
            const data = JSON.parse(text);
            let jsonStr = JSON.stringify(data, null, 2);
            
            const maxLength = 2000;
            if (jsonStr.length > maxLength) {
                jsonStr = jsonStr.substring(0, maxLength) + '\n\n... (dipotong)';
            }

            await reply(`${info}\n\n📄 Data:\n${jsonStr}`);
        } else {
            // Text biasa (HTML, plain text, dll)
            const text = new TextDecoder().decode(buffer);
            
            const maxLength = 2000;
            let content = text;
            if (content.length > maxLength) {
                content = content.substring(0, maxLength) + '\n\n... (dipotong)';
            }

            await reply(`${info}\n\n📄 Content:\n${content}`);
        }
    } catch (error) {
        await reply(
            `❌ Gagal mengambil data!\n\n` +
            `•Error: ${error.message}\n` +
            `•URL: ${url}`
        );
    }
}