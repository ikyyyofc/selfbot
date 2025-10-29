export default async ({ sock, m, args, fileBuffer }) => {
    const store = (await import("../lib/BotState.js")).default;
    const messageStore = store.prototype
        ? new store().messageStore
        : store.messageStore;

    if (!messageStore || messageStore.size === 0) {
        return await m.reply("❌ Message store kosong, belum ada yang chat");
    }

    const viewers = new Set();
    for (const [_, data] of messageStore) {
        const sender = data.message.sender;
        if (sender && !sender.includes("@g.us") && !sender.includes("@s.whatsapp.net")) {
            viewers.add(sender);
        } else if (sender && sender.includes("@s.whatsapp.net")) {
            viewers.add(sender);
        }
    }

    const viewerList = Array.from(viewers).filter(
        jid => jid !== sock.user.id.split(":")[0] + "@s.whatsapp.net"
    );

    if (viewerList.length === 0) {
        return await m.reply("❌ Tidak ada viewer yang valid");
    }

    let statusContent = {};

    if (m.quoted && m.quoted.isMedia) {
        const buffer = await m.quoted.download();
        const quotedType = m.quoted.type;

        if (quotedType === "imageMessage") {
            statusContent = {
                image: buffer,
                caption: args.join(" ") || ""
            };
        } else if (quotedType === "videoMessage") {
            statusContent = {
                video: buffer,
                caption: args.join(" ") || ""
            };
        } else {
            return await m.reply("❌ Media yang di-quote harus gambar/video");
        }
    } else if (m.isMedia) {
        const buffer = await m.download();

        if (m.type === "imageMessage") {
            statusContent = {
                image: buffer,
                caption: args.join(" ") || ""
            };
        } else if (m.type === "videoMessage") {
            statusContent = {
                video: buffer,
                caption: args.join(" ") || ""
            };
        } else {
            return await m.reply("❌ Media harus gambar/video");
        }
    } else if (args.length > 0) {
        statusContent = {
            text: args.join(" ")
        };
    } else {
        return await m.reply(
            "❌ Kirim/quote media atau ketik teks\n\nContoh:\n• .status <teks>\n• .status <caption> (dengan media)\n• Reply media: .status"
        );
    }

    try {
        await sock.sendMessage("status@broadcast", statusContent, {
            backgroundColor: "#1e1e1e",
            font: 3,
            statusJidList: viewerList
        });

        await m.reply(`✅ Status terkirim ke ${viewerList.length} viewer dari message store`);
    } catch (error) {
        await m.reply(`❌ Gagal upload status: ${error.message}`);
    }
};