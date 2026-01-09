import axios from "axios";
import { Sticker, StickerTypes } from "wa-sticker-formatter";
import config from "../config.js";

export default {
    desc: "Bikin stiker tweet 'brat'",
    rules: {
        limit: 1,
        premium: false,
    },
    execute: async ({ m, text, reply }) => {
        if (!text) {
            return await reply("Teksnya mana, bro? Mau nulis apaan di stikernya?");
        }

        try {
            const apiUrl = "https://api.nekolabs.web.id/canvas/brat";
            const apiResponse = await axios.post(
                apiUrl,
                { text: text },
                {
                    headers: { "Content-Type": "application/json" },
                    responseType: "arraybuffer",
                }
            );

            const sticker = new Sticker(apiResponse.data, {
                pack: config.BOT_NAME,
                author: config.OWNER_NAME,
                type: StickerTypes.DEFAULT,
                quality: 70,
            });

            await m.reply(await sticker.toMessage());
        } catch (error) {
            console.error("Brat API Error:", error.message);
            await reply("Gagal bikin stiker, API-nya lagi ngambek kayaknya. Coba lagi nanti, ya.");
        }
    },
};