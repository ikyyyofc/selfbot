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
        this.listeners = new Map();
    }

    async loadPlugins() {
        try {
            if (!fs.existsSync(PLUGIN_DIR)) {
                fs.mkdirSync(PLUGIN_DIR, { recursive: true });
            }

            this.state.plugins.clear();
            this.listeners.clear();
            
            const files = fs
                .readdirSync(PLUGIN_DIR)
                .filter(f => f.endsWith(".js"));

            for (const file of files) {
                await this.loadPlugin(file);
            }

            console.log(
                colors.cyan(`🔌 ${this.state.plugins.size} command plugins loaded`)
            );
            console.log(
                colors.magenta(`👂 ${this.listeners.size} listener plugins loaded`)
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
                if (file.startsWith("___")) {
                    const listenerName = path.basename(file, ".js").substring(3);
                    this.listeners.set(listenerName, execute);
                } else {
                    const command = path.basename(file, ".js");
                    this.state.plugins.set(command, execute);
                }
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

    async executeListeners(context) {
        for (const [name, execute] of this.listeners) {
            try {
                const shouldContinue = await execute(context);
                if (shouldContinue === false) {
                    console.log(colors.yellow(`🛑 Listener ${name} stopped message processing`));
                    return false;
                }
            } catch (error) {
                console.error(
                    colors.red(`❌ Listener ${name} error:`),
                    error.message
                );
            }
        }
        return true;
    }
}

export default PluginManager;