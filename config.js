import dotenv from "dotenv/config";
import { format } from "util";

const jsonFormat = obj => {
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

global.jsonFormat = jsonFormat;

export default {
    SESSION: "session",
    PAIRING_CODE: "IKYYSELF",
    PREFIX: [".", "!", "/"],
    BOT_NAME: "IKYY",
    OWNER_NAME: "IKYYOFC",
    OWNER_NUMBER: "6287866255637",
    
    SESSION_CLEANUP_INTERVAL: 2,
    SESSION_MAX_SIZE_MB: 50,
    
    MESSAGE_STORE_LIMIT: 200,
    MESSAGE_SAVE_INTERVAL: 50,
    
    GROUP_CACHE_TTL: 300,
    
    COOLDOWN_CLEANUP_INTERVAL: 60,

    BOT_MODE: process.env.mode || "self",

    DB_MODE: process.env.db_mode || "local",
    MONGODB_URI: process.env.mongodb || "",
    DB_NAME: "whatsapp_bot",

    DEFAULT_LIMIT: 20,
    LIMIT_RESET_HOUR: 0,

    PREMIUM_GROUPS: [],
    
    RENT_REMINDER_DAYS: 3
};