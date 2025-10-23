import fs from "fs";
import path from "path";
import colors from "@colors/colors/safe.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PLUGIN_DIR = path.join(__dirname, "..", "plugins");

class PluginManager {
    constructor(state) {
        this.state = state;
    }

    async loadPlugins() {
        try {
            if (!fs.existsSync(PLUGIN_DIR)) {
                fs.mkdirSync(PLUGIN_DIR, { recursive: true });
            }

            this.state.plugins.clear();
            const files = fs
                .readdirSync(PLUGIN_DIR)
                .filter(f => f.endsWith(".js"));

            for (const file of files) {
                await this.loadPlugin(file);
            }

            console.log(
                colors.cyan(`🔌 ${this.state.plugins.size} plugins loaded`)
            );
        } catch (error) {
            console.error(
                colors.red("❌ Plugin loading error:"),
                error.message
            );
        }
    }

    async loadPlugin(file) {
        try {
            const pluginPath = path.join(PLUGIN_DIR, file);
            const pluginUrl = `file://${pluginPath}?update=${Date.now()}`;
            const module = await import(pluginUrl);
            const execute = module.default;

            if (typeof execute === "function") {
                const command = path.basename(file, ".js");
                this.state.plugins.set(command, execute);
            }
        } catch (error) {
            console.error(colors.red(`❌ Plugin ${file}:`), error.message);
        }
    }

    async executePlugin(command, context) {
        const execute = this.state.plugins.get(command);
        if (!execute) return false;

        try {
            await context.m.react("⏳");
        } catch (e) {
            console.error(colors.red("❌ Failed to send reaction:"), e.message);
        }

        try {
            await execute(context);
            console.log(colors.green(`✅ ${command} executed`));
            return true;
        } catch (error) {
            console.error(colors.red(`❌ Plugin error:`), error);
            await context.m.reply(`❌ Plugin error: ${error.message}`);
            return false;
        } finally {
            try {
                await context.m.react("");
            } catch (e) {
                console.error(
                    colors.red("❌ Failed to remove reaction:"),
                    e.message
                );
            }
        }
    }
}

export default PluginManager;