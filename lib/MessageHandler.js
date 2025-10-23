import { jidNormalizedUser } from "@whiskeysockets/baileys";
import { exec } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import colors from "@colors/colors/safe.js";
import serialize from "./serialize.js";
import groupCache from "./groupCache.js";
import messageLogger from "./messageLogger.js";

const execPromise = util.promisify(exec);
const config = await import("../config.js").then(m => m.default);

class MessageHandler {
    constructor(state, pluginManager) {
        this.state = state;
        this.pluginManager = pluginManager;
    }

    async handleMessage(sock, m) {
        if (!m.message) return;

        // Serialize message
        m = await serialize(m, sock);

        const chat = m.chat.endsWith("broadcast")
            ? jidNormalizedUser(sock.user.id)
            : m.chat;
        const messageId = m.key.id;

        // Log incoming message using messageLogger
        messageLogger.logIncomingMessage(m, chat);

        // Cache group metadata when message comes from group
        if (m.isGroup && !groupCache.has(chat)) {
            groupCache.fetch(sock, chat).catch(err => {
                console.error(
                    colors.red("Failed to cache group metadata:"),
                    err.message
                );
            });
        }

        // Store message (non-group only)
        if (!m.isGroup && !m.fromMe) {
            this.state.addMessage(messageId, {
                message: m,
                from: chat,
                timestamp: Date.now()
            });
        }

        // Filter: only process self messages in groups, all messages in private
        if (!m.isGroup && !m.fromMe) return;
        if (m.isGroup && m.key.participant !== jidNormalizedUser(sock.user.lid))
            return;

        if (!m.text) return;

        // Handle special commands
        if (await this.handleEval(sock, m)) return;
        if (await this.handleExec(sock, m)) return;

        // Handle plugin commands
        await this.handlePluginCommand(sock, m);
    }

    async handleEval(sock, m) {
        const text = m.text;

        // Eval with >
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

        // Eval with return (=>)
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
            const wrappedCode = withReturn ? `return ${code}` : code;
            const evalFunc = new Function(
                "sock",
                "m",
                "plugins",
                "config",
                "fs",
                "path",
                "util",
                "colors",
                "loadPlugins",
                "messageStore",
                `return (async () => { ${wrappedCode} })()`
            );
            const result = await evalFunc(
                sock,
                m,
                this.state.plugins,
                config,
                fs,
                path,
                util,
                colors,
                () => this.pluginManager.loadPlugins(),
                this.state.messageStore
            );
            const output = util.inspect(result, {
                depth: null,
                maxArrayLength: null,
                maxStringLength: null
            });
            await sock.sendMessage(
                m.chat.endsWith("broadcast")
                    ? jidNormalizedUser(sock.user.id)
                    : m.chat,
                { text: output },
                { quoted: m }
            );
        } catch (error) {
            await sock.sendMessage(
                m.chat.endsWith("broadcast")
                    ? jidNormalizedUser(sock.user.id)
                    : m.chat,
                { text: error.message },
                { quoted: m }
            );
        }
    }

    async handleExec(sock, m) {
        const text = m.text;
        if (!text.startsWith("$")) return false;

        const cmd = text.slice(1).trim();
        if (!cmd) {
            await m.reply("No command provided");
            return true;
        }

        console.log(colors.cyan(`📩 exec`));
        try {
            await m.reply(`⏳ Executing: ${cmd}`);
            const { stdout, stderr } = await execPromise(cmd);
            let output = stdout || "";
            if (stderr) output += `Error:\n${stderr}`;
            if (!output) output = "✅ Executed (no output)";
            await m.reply(output);
        } catch (error) {
            await m.reply(error.message);
        }
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
            // Try to get file buffer from quoted or current message
            let fileBuffer = null;
            if (m.quoted && m.quoted.isMedia) {
                fileBuffer = await m.quoted.download();
            } else if (m.isMedia) {
                fileBuffer = await m.download();
            }

            const context = {
                sock,
                chat: m.chat,
                from: m.chat, // Alias
                args,
                text: args.join(" "),
                m,
                fileBuffer,
                isGroup: m.isGroup,
                sender: m.sender,
                groupCache, // Add groupCache to context
                reply: async (content, options) =>
                    await m.reply(content, options)
            };

            await this.pluginManager.executePlugin(command, context);
        }
    }
}

export default MessageHandler;