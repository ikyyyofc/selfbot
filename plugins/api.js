import axios from "axios";
import util from "util";

export default {
    desc: "Melakukan test ke API wudysoft.xyz",
    rules: {
        owner: true,
    },
    execute: async ({ args, reply }) => {
        if (args.length < 1) {
            return await reply("Gagal! Formatnya: .api <endpoint> <param1=value1> <param2=value2>");
        }

        const endpoint = args[0];
        const baseUrl = "https://wudysoft.xyz/api";
        const fullUrl = baseUrl + (endpoint.startsWith("/") ? endpoint : `/${endpoint}`);

        const params = args.slice(1).reduce((acc, current) => {
            const [key, value] = current.split("=");
            if (key && value) {
                acc[key] = value;
            }
            return acc;
        }, {});

        try {
            await reply(`Mengirim request ke ${fullUrl}...`);
            const response = await axios.get(fullUrl, { params });
            const output = util.inspect(response.data, {
                depth: null,
                colors: false
            });
            await reply(`SUKSES\n\n\`\`\`json\n${output}\n\`\`\``);
        } catch (error) {
            let errorMsg = `GAGAL\n\n${error.message}`;
            if (error.response) {
                const errorData = util.inspect(error.response.data, {
                    depth: null,
                    colors: false
                });
                errorMsg += `\nStatus: ${error.response.status}\nData: \`\`\`json\n${errorData}\n\`\`\``;
            }
            await reply(errorMsg);
        }
    },
};