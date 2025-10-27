import axios from "axios";

export default async ({ m, text, args }) => {
    if (!text) {
        return await m.reply(
            "❌ Kasih link MediaFire dong!\n\nContoh: .mediafire https://www.mediafire.com/file/xxx"
        );
    }

    const url = args[0];
    if (!url.includes("mediafire.com")) {
        return await m.reply("❌ Link harus dari MediaFire!");
    }

    await m.reply("⏳ Tunggu bentar, lagi diproses...");

    try {
        const { data } = await axios.get(
            `https://api.nekolabs.web.id/downloader/mediafire?url=${encodeURIComponent(
                url
            )}`
        );

        if (!data.success) {
            return await m.reply("❌ Gagal download file!");
        }

        const { filename, filesize, mimetype, uploaded, download_url } =
            data.result;

        const caption = `📁 *MediaFire Downloader*\n\n` +
            `📝 Nama: ${filename}\n` +
            `📊 Size: ${filesize}\n` +
            `📄 Type: ${mimetype}\n` +
            `📅 Upload: ${uploaded}\n\n` +
            `⏬ Sedang mengirim file...`;

        await m.reply(caption);

        const response = await axios.get(download_url, {
            responseType: "arraybuffer"
        });

        await m.reply({
            document: Buffer.from(response.data),
            fileName: filename,
            mimetype: mimetype
        });
    } catch (error) {
        console.error("MediaFire download error:", error);
        await m.reply(
            `❌ Terjadi kesalahan!\n\n${error.response?.data?.message || error.message}`
        );
    }
};