import axios from "axios";

const baseURL = "https://wudysoft.xyz";

export default {
    desc: "Melakukan tes ke API wudysoft.xyz",
    rules: {
        owner: true,
    },
    async execute({ args, reply }) {
        const [endpoint, ...params] = args;

        if (!endpoint) {
            return reply(
                "Kasih endpointnya, bro.\nContoh: `/api /mails/v22 action=create`"
            );
        }

        const data = params.reduce((acc, param) => {
            const i = param.indexOf("=");
            if (i === -1) {
                acc[param] = true; // Handle parameter tanpa value, cth: /api /endpoint?active
                return acc;
            }
            const key = param.slice(0, i);
            const value = param.slice(i + 1);
            acc[key] = value;
            return acc;
        }, {});

        const url = baseURL + (endpoint.startsWith("/") ? endpoint : `/${endpoint}`);
        const method = Object.keys(data).length > 0 ? "POST" : "GET";

        await reply(`Calling API...\nMethod: ${method}\nURL: ${url}`);

        try {
            const config = {
                method: method.toLowerCase(),
                url: url,
            };

            // Untuk method POST, data dikirim sebagai body
            if (method === "POST") {
                config.data = data;
                config.headers = { "Content-Type": "application/json" };
            }
            // Untuk GET, data bisa dikirim sebagai query params (opsional, tergantung API)
            // Tapi untuk case ini kita asumsikan GET tidak membawa body/params
            
            const response = await axios(config);

            const responseText = `Success! | Status: ${response.status}\n\n\`\`\`json\n${jsonFormat(response.data)}\n\`\`\``;
            await reply(responseText);

        } catch (error) {
            let errorText;
            if (error.response) {
                // Error dari server API (cth: 404, 500)
                errorText = `API Error! | Status: ${error.response.status}\n\n\`\`\`json\n${jsonFormat(error.response.data || { message: "No response data" })}\n\`\`\``;
            } else {
                // Error jaringan atau lainnya
                errorText = `Request Failed!\n\n${error.message}`;
            }
            await reply(errorText);
        }
    },
};