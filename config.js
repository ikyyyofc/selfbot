// config.js
import { format } from 'util';

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
    SESSION_CLEANUP_INTERVAL: 1, // jam
    SESSION_MAX_SIZE_MB: 50 // size folder
};
