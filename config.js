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
    SESSION_CLEANUP_INTERVAL: 1,
    SESSION_MAX_SIZE_MB: 50,

    BOT_MODE: "self",

    DB_MODE: "local",
    MONGODB_URI: "",
    DB_NAME: "whatsapp_bot",

    DEFAULT_LIMIT: 20,
    LIMIT_RESET_HOUR: 0,

    PREMIUM_GROUPS: [],
    
    RENT_REMINDER_DAYS: 3
};