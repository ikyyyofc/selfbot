import axios from "axios";

export default {
    desc: "Test API Wudysoft.",
    category: "owner",
    rules: {
        owner: true,
    },
    async execute(context) {
        const { m, args, reply } = context;

        if (args.length < 1) {
            return await reply("Gunakan format: .api <endpoint> [key=value]");
        }

        const endpoint = args[0].startsWith("/") ? args[0] : `/${args[0]}`;
        const baseURL = "https://wudysoft.xyz/api";
        const fullURL = baseURL + endpoint;

        const params = {};
        args.slice(1).forEach(arg => {
            const parts = arg.split("=");
            if (parts.length === 2) {
                params[parts[0]] = parts[1];
            }
        });
        try {
            let response;
            // Jika ada parameter, diasumsikan POST request dengan body JSON
            if (Object.keys(params).length > 0) {
                response = await axios.post(fullURL, params, {
                    headers: { "Content-Type": "application/json" },
                });
            } else {
            // Jika tidak, diasumsikan GET request
                response = await axios.get(fullURL);
            }

            const responseData =
                typeof response.data === "object"
                    ? global.jsonFormat(response.data)
                    : response.data;

            await reply(`✅ Sukses!\n\nStatus: ${response.status}\nData:\n${responseData}`);
        } catch (error) {
            let errorMsg = `❌ Gagal!\n\nPesan: ${error.message}`;

            if (error.response) {
                const errorData =
                    typeof error.response.data === "object"
                        ? global.jsonFormat(error.response.data)
                        : error.response.data;

                errorMsg += `\nStatus: ${error.response.status}\nData:\n${errorData}`;
            }

            await reply(errorMsg);
        }
    },
};