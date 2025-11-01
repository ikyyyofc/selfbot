import chokidar from "chokidar";
import path from "path";
import colors from "@colors/colors/safe.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class HotReload {
    constructor(pluginManager, state) {
        this.pluginManager = pluginManager;
        this.state = state;
        this.watcher = null;
        this.debounceTimers = new Map();
        this.debounceDelay = 300;
        this.enabled = process.env.HOT_RELOAD !== "false";
        
        this.watchPaths = [
            path.join(__dirname, "..", "plugins"),
            path.join(__dirname, "..", "config.js"),
            path.join(__dirname, "..", "lib"),
            path.join(__dirname, "..", ".env")
        ];
        
        this.moduleCache = new Map();
    }

    start() {
        if (!this.enabled) {
            console.log(colors.gray("ℹ️  Hot reload disabled"));
            return;
        }

        this.watcher = chokidar.watch(this.watchPaths, {
            persistent: true,
            ignoreInitial: true,
            ignored: [
                /(^|[\/\\])\../,
                /node_modules/,
                /session/,
                /\.git/
            ],
            awaitWriteFinish: {
                stabilityThreshold: 200,
                pollInterval: 100
            }
        });

        this.watcher
            .on("add", file => this.handleFileChange(file, "added"))
            .on("change", file => this.handleFileChange(file, "changed"))
            .on("unlink", file => this.handleFileRemove(file));

        console.log(colors.green("🔥 Hot reload enabled - ALL FILES AUTO-RELOAD!"));
        console.log(colors.cyan("   Watching:"));
        console.log(colors.cyan(`   📁 plugins/ → auto reload`));
        console.log(colors.cyan(`   📁 lib/ → auto reload`));
        console.log(colors.cyan(`   📄 config.js → auto reload`));
        console.log(colors.cyan(`   📄 .env → auto reload\n`));
    }

    debounce(key, callback) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }

        const timer = setTimeout(() => {
            callback();
            this.debounceTimers.delete(key);
        }, this.debounceDelay);

        this.debounceTimers.set(key, timer);
    }

    async handleFileChange(file, action) {
        const filename = path.basename(file);
        const ext = path.extname(file);
        const relativePath = path.relative(process.cwd(), file);

        if (filename === "HotReload.js") return;

        this.debounce(`file:${file}`, async () => {
            console.log(colors.yellow(`\n🔄 File ${action}: ${relativePath}`));

            try {
                if (file.includes("plugins")) {
                    await this.reloadPlugin(file, filename);
                } else if (file.endsWith("config.js")) {
                    await this.reloadConfig(file);
                } else if (file.endsWith(".env")) {
                    await this.reloadEnv(file);
                } else if (file.includes("lib")) {
                    await this.reloadLibModule(file, filename);
                }
            } catch (error) {
                console.error(colors.red(`❌ Reload failed:`), error.message);
            }
        });
    }

    async reloadPlugin(file, filename) {
        if (!filename.endsWith(".js")) return;

        const pluginName = path.basename(file, ".js");
        
        this.clearModuleCache(file);
        
        await this.pluginManager.loadPlugin(filename);
        
        console.log(colors.green(`✅ Plugin reloaded: ${filename}\n`));
    }

    async reloadConfig(file) {
        this.clearModuleCache(file);
        
        const newConfig = await import(`${file}?t=${Date.now()}`).then(m => m.default);
        
        const configModule = await import("../config.js");
        Object.keys(newConfig).forEach(key => {
            configModule.default[key] = newConfig[key];
        });
        
        console.log(colors.green(`✅ Config reloaded!\n`));
    }

    async reloadEnv(file) {
        const dotenv = await import("dotenv");
        dotenv.config({ override: true });
        
        const configModule = await import("../config.js");
        configModule.default.BOT_MODE = process.env.mode || "self";
        configModule.default.DB_MODE = process.env.db_mode || "local";
        configModule.default.MONGODB_URI = process.env.mongodb || "";
        
        console.log(colors.green(`✅ Environment variables reloaded!\n`));
    }

    async reloadLibModule(file, filename) {
        if (!filename.endsWith(".js")) return;

        this.clearModuleCache(file);
        
        const moduleName = path.basename(file, ".js");
        
        if (moduleName === "Database") {
            console.log(colors.yellow(`⚠️  Database module changed - reconnection might be needed`));
            const db = await import("./Database.js").then(m => m.default);
            console.log(colors.cyan(`   Run 'db.connect()' if needed\n`));
        } else if (moduleName === "groupCache") {
            console.log(colors.yellow(`⚠️  Group cache cleared due to module change`));
            const groupCache = await import("./groupCache.js").then(m => m.default);
            groupCache.clear();
        } else {
            console.log(colors.green(`✅ Lib module reloaded: ${filename}`));
            console.log(colors.cyan(`   Re-imported on next use\n`));
        }
    }

    handleFileRemove(file) {
        const filename = path.basename(file);
        const relativePath = path.relative(process.cwd(), file);

        console.log(colors.red(`\n🗑️  File removed: ${relativePath}`));

        if (file.includes("plugins") && filename.endsWith(".js")) {
            const pluginName = path.basename(file, ".js");
            
            if (filename.startsWith("___")) {
                const listenerName = pluginName.substring(3);
                this.pluginManager.listeners.delete(listenerName);
            } else {
                this.state.plugins.delete(pluginName);
            }
            
            console.log(colors.yellow(`✅ Plugin unloaded: ${filename}\n`));
        } else {
            console.log(colors.yellow(`⚠️  File deleted - may cause issues\n`));
        }

        this.clearModuleCache(file);
    }

    clearModuleCache(file) {
        const absolutePath = path.resolve(file);
        
        const cacheKeys = Object.keys(require.cache).filter(key => 
            key.includes(absolutePath) || key.includes(file)
        );
        
        cacheKeys.forEach(key => {
            delete require.cache[key];
        });

        if (this.moduleCache.has(file)) {
            this.moduleCache.delete(file);
        }
    }

    stop() {
        if (this.watcher) {
            this.watcher.close();
        }
        
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        
        this.debounceTimers.clear();
        this.moduleCache.clear();
        
        console.log(colors.yellow("🛑 Hot reload stopped"));
    }

    getStats() {
        return {
            watching: this.watchPaths.length,
            pending: this.debounceTimers.size,
            cached: this.moduleCache.size
        };
    }
}

export default HotReload;