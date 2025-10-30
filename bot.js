import "./config.js";
import colors from "@colors/colors/safe.js";
import BotState from "./lib/BotState.js";
import PluginManager from "./lib/PluginManager.js";
import ConnectionManager from "./lib/ConnectionManager.js";
import dotenv from "dotenv"
dotenv.config()

// ===== MAIN =====
const main = async () => {
    console.log(colors.cyan("🤖 Starting bot...\n"));

    const state = new BotState();
    const pluginManager = new PluginManager(state);
    const connectionManager = new ConnectionManager(state, pluginManager);

    await connectionManager.connect();
};

main().catch(error => {
    console.error(colors.red("❌ Fatal error:"), error);
    process.exit(0);
});