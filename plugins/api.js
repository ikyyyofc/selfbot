import axios from "axios";
import util from "util";

export default {
    desc: "Tes endpoint API wudysoft.xyz",
    rules: {
        owner: true,
        limit: false,
    },
    execute: async ({ args, reply, m }) => {
        const baseURL = "https://wudysoft.xyz";

        if (args.length < 1) {
            return reply(
                `Cara pakenya:\n/api <endpoint> [params...]\n\nContoh:\n/api /mails/v22 action=create id=123`
            );
        }

        const endpoint = args[0];
        const params = args.slice(1);
        const url = baseURL + endpoint;

        const payload = {};
        params.forEach(param => {
            const [key, ...valueParts] = param.split("=");
            if (key) {
                payload[key] = valueParts.join("=");
            }
        });

        const method = params.length > 0 ? "post" : "get";

        try {
            await m.react("⏳");

            const response = await axios({
                method,
                url,
                [method === "post" ? "data" : "params"]: payload,
            });

            const formattedResponse = util.inspect(response.data, {
                depth: null,
                colors: false
            });

            let responseText = `✅ SUCCESS [${response.status}]\n`;
            responseText += `Method: ${method.toUpperCase()}\n\n`;
            responseText += "Response:\n";
            responseText += "```" + formattedResponse + "```";

            await reply(responseText);

        } catch (error) {
            let errorText = `❌ ERROR\n`;
            if (error.response) {
                const formattedError = util.inspect(error.response.data, {
                    depth: null,
                    colors: false
                });
                errorText += `Status: ${error.response.status}\n\n`;
                errorText += "Response:\n";
                errorText += "```" + formattedError + "```";
            } else {
                errorText += `Message: ${error.message}`;
            }
            await reply(errorText);
        }
    },
};