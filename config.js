import dotenv from "dotenv/config";
import { format } from "util";

export default {
    SESSION_DB: "./session.db",
    PAIRING_CODE: "IKYYSELF",
    PREFIX: [".", "!", "/", "-", "😹"],
    BOT_NAME: "IKYY",
    OWNER_NAME: "IKYYOFC",
    OWNER_NUMBER: "6287866255637",

    GROUP_CACHE_TTL: 300,

    COOLDOWN_CLEANUP_INTERVAL: 60,

    BOT_MODE: process.env.mode || "self",

    PREMIUM_GROUPS: []
};

global.delay = ms => new Promise(resolve => setTimeout(resolve, ms));

global.jsonFormat = obj => {
    try {
        let print =
            obj &&
            (obj.constructor.name === "Object" ||
                obj.constructor.name === "Array")
                ? format(JSON.stringify(obj, null, 2))
                : format(obj);
        return print;
    } catch {
        return format(obj);
    }
};