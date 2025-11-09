import axios from "axios";
import util from "util";

export default {
    rules: {
        owner: true, // Cuma owner yang bisa pake command ini
    },
    help: "Gunakan format: <prefix>api <endpoint> [parameter1=nilai1] [parameter2=nilai2]...",
    desc: "Menguji endpoint API dari wudysoft.xyz.",

    execute: async (context) => {
        const { sock, chat, args, reply } = context;

        if (args.length < 1) {
            return await reply("Endpointnya mana, bro? Contoh: /api /fakedata/user");
        }

        const endpoint = args[0];
        const params = args.slice(1);
        const baseUrl = "https://wudysoft.xyz/api";

        // Ubah array parameter jadi object
        const queryParams = params.reduce((acc, param) => {
            const [key, ...valueParts] = param.split("=");
            const value = valueParts.join("="); // Biar value yang ada '=' tetep aman
            if (key && value) {
                acc[key] = value;
            }
            return acc;
        }, {});

        const url = `${baseUrl}/${endpoint.startsWith("/") ? endpoint.substring(1) : endpoint}`;

        try {
            await reply(`Menguji endpoint...\nURL: ${url}`);

            const response = await axios.get(url, {
                params: queryParams,
                responseType: "arraybuffer", // Minta data mentah (buffer) biar bisa handle semua tipe file
            });

            const contentType = response.headers["content-type"];

            if (contentType.includes("application/json")) {
                const data = JSON.parse(Buffer.from(response.data).toString("utf-8"));
                const formattedJson = util.inspect(data, { depth: null, colors: false });
                await reply(`\`\`\`json\n${formattedJson}\`\`\``);

            } else if (contentType.startsWith("image/")) {
                await sock.sendMessage(chat, {
                    image: response.data,
                    caption: `✅ Nih hasil gambarnya dari endpoint: ${endpoint}`
                });

            } else if (contentType.startsWith("video/")) {
                 await sock.sendMessage(chat, {
                    video: response.data,
                    caption: `✅ Nih hasil videonya dari endpoint: ${endpoint}`
                });

            } else if (contentType.startsWith("text/")) {
                const textData = Buffer.from(response.data).toString("utf-8");
                await reply(textData);

            } else {
                // Fallback buat tipe lain, coba kirim sebagai dokumen
                await reply(`Tipe konten tidak dikenal (${contentType}), coba kirim sebagai file.`);
                await sock.sendMessage(chat, {
                    document: response.data,
                    mimetype: contentType,
                    fileName: "response.bin"
                });
            }

        } catch (error) {
            let errorMsg = "Anjir, error:\n";
            if (error.response) {
                // Kalo server ngasih respons error (4xx, 5xx)
                const errorData = Buffer.from(error.response.data).toString("utf-8");
                errorMsg += `Status: ${error.response.status} - ${error.response.statusText}\n\n`;
                try {
                    // Coba format kalo errornya JSON
                    const jsonData = JSON.parse(errorData);
                    errorMsg += `Data:\n\`\`\`json\n${util.inspect(jsonData, { depth: null })}\`\`\``;
                } catch {
                    errorMsg += `Data:\n${errorData}`;
                }
            } else {
                // Kalo error jaringan dll
                errorMsg += error.message;
            }
            await reply(errorMsg);
        }
    },
};