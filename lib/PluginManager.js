import fs from "fs";
import path from "path";
import colors from "@colors/colors/safe.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import PluginHandler from "./PluginHandler.js";

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
                colors.cyan(
                    `🔌 ${this.state.plugins.size} command plugins loaded`
                )
            );
            console.log(
                colors.magenta(
                    `👂 ${this.listeners.size} listener plugins loaded`
                )
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
            const plugin = module.default;

            if (typeof plugin === "object" && typeof plugin.execute === "function") {
                if (file.startsWith("___")) {
                    const listenerName = path.basename(file, ".js").substring(3);
                    this.listeners.set(listenerName, plugin);
                } else {
                    const command = path.basename(file, ".js");
                    this.state.plugins.set(command, plugin);
                }
            } else if (typeof plugin === "function") {
                if (file.startsWith("___")) {
                    const listenerName = path.basename(file, ".js").substring(3);
                    this.listeners.set(listenerName, { execute: plugin });
                } else {
                    const command = path.basename(file, ".js");
                    this.state.plugins.set(command, { execute: plugin });
                }
            }
        } catch (error) {
            console.error(colors.red(`❌ Plugin ${file}:`), error.message);
        }
    }

    async executePlugin(command, context) {
        const plugin = this.state.plugins.get(command);
        if (!plugin) return false;

        const success = await PluginHandler.execute(plugin, context);
        if (success) {
            console.log(colors.green(`✅ ${command} executed`));
        }
        return success;
    }

    async executeListeners(context) {
        for (const [name, plugin] of this.listeners) {
            try {
                const shouldContinue = await plugin.execute(context);
                if (shouldContinue === false) {
                    console.log(
                        colors.yellow(
                            `🛑 Listener ${name} stopped message processing`
                        )
                    );
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