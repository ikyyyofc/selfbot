import axios from "axios";
import { URLSearchParams } from "url";

export default {
    desc: "Request ke Wudysoft API",
    rules: {
        owner: true,
        limit: false,
    },
    execute: async (context) => {
        const { m, text, reply, sock } = context;

        if (!text) {
            return reply(
                "Format salah.\n\nContoh:\n/api /endpoint\nparam1=value1\nparam2=value2"
            );
        }

        const lines = text.trim().split("\n");
        const endpoint = lines.shift().trim();
        const bodyLines = lines;

        if (!endpoint.startsWith("/")) {
            return reply("Endpoint harus diawali dengan '/'.");
        }

        const url = `https://wudysoft.xyz/api${endpoint}`;
        const params = new URLSearchParams();
        let hasBody = bodyLines.length > 0;

        if (hasBody) {
            for (const line of bodyLines) {
                const parts = line.split("=");
                if (parts.length >= 2) {
                    const key = parts.shift().trim();
                    const value = parts.join("=").trim();
                    params.append(key, value);
                }
            }
        }

        try {
            await m.react("🚀");

            const method = hasBody ? "POST" : "GET";

            const response = await axios({
                method,
                url,
                data: hasBody ? params : null,
                headers: {
                    "Content-Type": hasBody
                        ? "application/x-www-form-urlencoded"
                        : undefined,
                },
                responseType: "arraybuffer",
            });

            const contentType = response.headers["content-type"] || "";
            const buffer = Buffer.from(response.data);

            if (contentType.includes("application/json")) {
                const jsonResponse = JSON.parse(buffer.toString("utf-8"));
                const formattedJson = JSON.stringify(jsonResponse, null, 2);
                await reply(`*Response JSON:*\n\n\`\`\`${formattedJson}\`\`\``);
            } else if (contentType.includes("text/")) {
                await reply(`*Response Text:*\n\n${buffer.toString("utf-8")}`);
            } else if (
                contentType.includes("image/") ||
                contentType.includes("video/")
            ) {
                const messageType = contentType.includes("image/")
                    ? "image"
                    : "video";
                await sock.sendMessage(
                    m.chat,
                    {
                        [messageType]: buffer,
                        caption: `*Response Media*\n*Type:* ${contentType}`,
                    },
                    { quoted: m }
                );
            } else {
                await sock.sendMessage(
                    m.chat,
                    {
                        document: buffer,
                        mimetype: contentType,
                        fileName: `response${endpoint.replace(/\//g, "_")}`,
                        caption: `*Response File*\n*Type:* ${contentType}`,
                    },
                    { quoted: m }
                );
            }

            await m.react("✅");
        } catch (error) {
            await m.react("❌");
            if (error.response) {
                const errorData = Buffer.from(error.response.data).toString(
                    "utf-8"
                );
                let errorMessage = `*Status:* ${error.response.status}\n`;
                try {
                    const jsonError = JSON.parse(errorData);
                    errorMessage += `\`\`\`${JSON.stringify(
                        jsonError,
                        null,
                        2
                    )}\`\`\``;
                } catch {
                    errorMessage += errorData;
                }
                await reply(`*API Error:*\n\n${errorMessage}`);
            } else if (error.request) {
                await reply("Gagal, nggak ada respons dari server API.");
            } else {
                await reply(`Error pas setup request:\n\n${error.message}`);
            }
        }
    },
};