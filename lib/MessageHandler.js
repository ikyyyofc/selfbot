import { jidNormalizedUser } from "@whiskeysockets/baileys";
import { exec } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import colors from "@colors/colors/safe.js";
import serialize from "./serialize.js";
import groupCache from "./groupCache.js";
import messageLogger from "./messageLogger.js";
import { createRequire } from "module";
import { monitorEmitter } from "../server.js";

const execPromise = util.promisify(exec);
const config = await import("../config.js").then(m => m.default);

class MessageHandler {
    constructor(state, pluginManager) {
        this.state = state;
        this.pluginManager = pluginManager;
        this.queues = new Map();
        this.activeCount = new Map();
        this.maxConcurrent = 3;
    }

    getQueueKey(m) {
        return m.isGroup ? m.chat : m.sender;
    }

    async handleMessage(sock, m) {
        if (!m.message) return;

        m = await serialize(m, sock);

        const chat = m.chat.endsWith("broadcast")
            ? jidNormalizedUser(sock.user.id)
            : m.chat;

        messageLogger.logIncomingMessage(m, chat);

        monitorEmitter.emit("message", {
            sender: m.pushName || m.sender.split("@")[0],
            text: m.text,
            isGroup: m.isGroup,
            fromMe: m.fromMe,
            type: m.type,
            chat: chat
        });

        if (config.BOT_MODE == "self") {
            if (!m.isGroup && !m.fromMe) return;
            if (
                m.isGroup &&
                m.key.participant !== jidNormalizedUser(sock.user.lid)
            )
                return;
        }

        if (!m.text) return;
        if (m.isBot) return;

        let priority = 3;
        if (m.isOwner) {
            priority = 0;
        } else if (m.fromMe) {
            priority = 1;
        } else {
            const db = await import("./Database.js").then(mod => mod.default);
            const user = await db.getUser(m.sender);
            priority = user?.premium ? 2 : 3;
        }

        const queueKey = this.getQueueKey(m);
        
        if (!this.queues.has(queueKey)) {
            this.queues.set(queueKey, []);
            this.activeCount.set(queueKey, 0);
        }
        
        this.queues.get(queueKey).push({ sock, m, chat, priority });
        this.queues.get(queueKey).sort((a, b) => a.priority - b.priority);
        
        this.processQueue(queueKey);
    }

    async processQueue(queueKey) {
        const queue = this.queues.get(queueKey);
        const active = this.activeCount.get(queueKey) || 0;

        if (!queue || queue.length === 0) {
            if (active === 0) {
                this.queues.delete(queueKey);
                this.activeCount.delete(queueKey);
            }
            return;
        }

        if (active >= this.maxConcurrent) return;

        this.activeCount.set(queueKey, active + 1);
        const { sock, m, chat } = queue.shift();

        this.processMessage(sock, m, chat)
            .catch(error => {
                console.error(colors.red("❌ Handler error:"), error.message);
                monitorEmitter.emit("command", {
                    command: "error",
                    success: false,
                    error: error.message
                });
            })
            .finally(() => {
                const current = this.activeCount.get(queueKey) || 1;
                this.activeCount.set(queueKey, current - 1);
                
                if (this.queues.has(queueKey) && this.queues.get(queueKey).length > 0) {
                    setImmediate(() => this.processQueue(queueKey));
                }
            });

        if (queue.length > 0 && active + 1 < this.maxConcurrent) {
            setImmediate(() => this.processQueue(queueKey));
        }
    }

    async processMessage(sock, m, chat) {
        if (m.isGroup) {
            if (!groupCache.has(chat)) {
                groupCache.fetch(sock, chat).catch(() => {});
            }
        }

        const context = {
            sock,
            chat: m.chat,
            from: m.chat,
            args: [],
            text: m.text || "",
            m,
            isGroup: m.isGroup,
            sender: m.sender,
            groupCache,
            state: this.state,
            reply: async (content, options) => await m.reply(content, options),
            getFile: async () => {
                if (m.quoted && m.quoted.isMedia) {
                    return await m.quoted.download();
                } else if (m.isMedia) {
                    return await m.download();
                }
                return null;
            }
        };

        const shouldContinue = await this.pluginManager.executeListeners(context);
        if (!shouldContinue) return;

        if (await this.handleEval(sock, m)) return;
        if (await this.handleExec(sock, m)) return;

        await this.handlePluginCommand(sock, m);
    }

    async handleEval(sock, m) {
        if (m.sender.split("@")[0] !== config.OWNER_NUMBER) return false;
        const text = m.text;

        if (text.startsWith(">") && !text.startsWith("=>")) {
            const code = text.slice(1).trim();
            if (!code) {
                await m.reply("No code provided");
                return true;
            }
            console.log(colors.cyan(`📩 eval`));
            await this.executeEval(sock, m, code, false);
            return true;
        }

        if (text.startsWith("=>")) {
            const code = text.slice(2).trim();
            if (!code) {
                await m.reply("No code provided");
                return true;
            }
            console.log(colors.cyan(`📩 eval-return`));
            await this.executeEval(sock, m, code, true);
            return true;
        }

        return false;
    }

    async executeEval(sock, m, code, withReturn) {
        try {
            const require = createRequire(import.meta.url);
            const wrappedCode = withReturn ? `return ${code}` : code;
            const evalFunc = new Function(
                "sock",
                "m",
                "plugins",
                "state",
                "config",
                "fs",
                "path",
                "util",
                "colors",
                "loadPlugins",
                "require",
                `return (async () => { ${wrappedCode} })()`
            );
            const result = await evalFunc(
                sock,
                m,
                this.state.plugins,
                this.state,
                config,
                fs,
                path,
                util,
                colors,
                () => this.pluginManager.loadPlugins(),
                require
            );
            const output = util.formatWithOptions({
                depth: null,
                maxArrayLength: null,
                maxStringLength: null
            }, result);
            await sock.sendMessage(
                m.chat.endsWith("broadcast")
                    ? jidNormalizedUser(sock.user.id)
                    : m.chat,
                { text: output },
                { quoted: m }
            );
            
            monitorEmitter.emit("command", {
                command: "eval",
                success: true,
                sender: m.pushName
            });
        } catch (error) {
            await sock.sendMessage(
                m.chat.endsWith("broadcast")
                    ? jidNormalizedUser(sock.user.id)
                    : m.chat,
                { text: error.message },
                { quoted: m }
            );
            
            monitorEmitter.emit("command", {
                command: "eval",
                success: false,
                error: error.message
            });
        }
    }

    async executeExec(sock, m, cmd) {
        if (!cmd) {
            await m.reply("No command provided");
            return;
        }

        console.log(colors.cyan(`📩 exec`));
        try {
            await m.reply(`⏳ Executing: ${cmd}`);
            const { stdout, stderr } = await execPromise(cmd);
            let output = stdout || "";
            if (stderr) output += `Error:\n${stderr}`;
            if (!output) output = "✅ Executed (no output)";
            await m.reply(util.stripVTControlCharacters(output));
            
            monitorEmitter.emit("command", {
                command: "exec",
                success: true,
                sender: m.pushName
            });
        } catch (error) {
            await m.reply(error.message);
            
            monitorEmitter.emit("command", {
                command: "exec",
                success: false,
                error: error.message
            });
        }
    }

    async handleExec(sock, m) {
        if (m.sender.split("@")[0] !== config.OWNER_NUMBER) return false;
        const text = m.text;
        if (!text.startsWith("$")) return false;

        const cmd = text.slice(1).trim();
        await this.executeExec(sock, m, cmd);
        return true;
    }

    async handlePluginCommand(sock, m) {
        const prefixes = config.PREFIX || ["."];
        const prefix = prefixes.find(p => m.text.startsWith(p));
        if (!prefix) return;

        const args = m.text.slice(prefix.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        if (!command) return;

        console.log(colors.cyan(`📩 ${command}`));

        if (this.state.plugins.has(command)) {
            const context = {
                sock,
                chat: m.chat,
                from: m.chat,
                args,
                text: args.join(" "),
                m,
                isGroup: m.isGroup,
                sender: m.sender,
                groupCache,
                state: this.state,
                reply: async (content, options) => await m.reply(content, options),
                getFile: async () => {
                    if (m.quoted && m.quoted.isMedia) {
                        return await m.quoted.download();
                    } else if (m.isMedia) {
                        return await m.download();
                    }
                    return null;
                }
            };

            try {
                await this.pluginManager.executePlugin(command, context);
                
                monitorEmitter.emit("command", {
                    command,
                    success: true,
                    sender: m.pushName,
                    isGroup: m.isGroup
                });
            } catch (error) {
                monitorEmitter.emit("command", {
                    command,
                    success: false,
                    error: error.message,
                    sender: m.pushName
                });
            }
        }
    }
}

export default MessageHandler;
