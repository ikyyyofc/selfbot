import { jidNormalizedUser, downloadMediaMessage } from "@whiskeysockets/baileys";
import Pino from "pino";
import colors from "@colors/colors/safe.js";

class AntiDeleteEditHandler {
    constructor(state, messageHandler) {
        this.state = state;
        this.messageHandler = messageHandler;
    }

    async handleUpdate(sock, update) {
        try {
            const messageId = update.key.id;
            const from = update.key.remoteJid.endsWith("broadcast")
                ? jidNormalizedUser(sock.user.id)
                : update.key.remoteJid;

            const isStatus = update.key.remoteJid.endsWith("broadcast");
            const isGroup = from.endsWith("@g.us");
            if (isGroup) return;

            const storedData = this.state.messageStore.get(messageId);
            if (!storedData || storedData.message.key.fromMe) return;

            if (
                update.update?.message === null ||
                update.update?.messageStubType === 68
            ) {
                await this.handleDelete(sock, from, storedData, isStatus);
            } else if (
                update.update?.message?.editedMessage ||
                update.update?.message?.protocolMessage?.type === 14
            ) {
                await this.handleEdit(
                    sock,
                    from,
                    messageId,
                    storedData,
                    update
                );
            }
        } catch (error) {
            console.error(
                colors.red("❌ Anti-delete/edit error:"),
                error.message
            );
        }
    }

    async handleDelete(sock, from, storedData, isStatus) {
        console.log(colors.magenta(`🗑️ Message deleted detected`));

        const storedMessage = storedData.message;
        const sender = storedMessage.sender;
        const senderName = storedMessage.pushName || sender.split("@")[0];

        const lastMessage = storedData.editHistory
            ? storedData.editHistory[storedData.editHistory.length - 1].message
            : storedMessage.message;

        const messageInfo = this.getMessageInfo(lastMessage);
        let antiDeleteMsg = this.buildDeleteMessage(
            isStatus,
            senderName,
            sender,
            storedMessage,
            storedData,
            messageInfo
        );

        await sock.sendMessage(from, { text: antiDeleteMsg });
        await this.resendMedia(sock, from, storedMessage);
    }

    async handleEdit(sock, from, messageId, storedData, update) {
        console.log(colors.yellow(`✏️ Message edited detected`));

        const storedMessage = storedData.message;
        const sender = storedMessage.key.participant || storedMessage.key.remoteJid;
        const senderName = storedMessage.pushName || sender.split("@")[0];

        const oldContent = this.getOldContent(storedData);
        const { newContent, newMessageObj } = this.getNewContent(update);
        const messageType = this.getMessageType(storedMessage.message);
        const editCount = (storedData.editHistory?.length || 0) + 1;

        const antiEditMsg = this.buildEditMessage(
            senderName,
            sender,
            storedMessage,
            messageType,
            editCount,
            oldContent,
            newContent
        );

        await sock.sendMessage(from, { text: antiEditMsg });
        this.state.addEditHistory(messageId, newMessageObj);

        await this.processEditedCommand(sock, storedMessage, newContent);
    }

    async processEditedCommand(sock, originalMessage, newContent) {
        if (!newContent || typeof newContent !== 'string') return;

        const config = (await import("../config.js")).default;
        const prefixes = config.PREFIX || ["."];
        const prefix = prefixes.find(p => newContent.startsWith(p));
        
        if (!prefix) return;

        const args = newContent.slice(prefix.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        if (!command) return;

        console.log(colors.cyan(`🔄 Processing edited command: ${newContent}`));

        if (command === "eval" || newContent.startsWith(">") || newContent.startsWith("$")) {
            console.log(colors.yellow(`⚠️ Eval/exec commands not supported for edited messages`));
            return;
        }

        if (this.messageHandler.state.plugins.has(command)) {
            let fileBuffer = null;
            if (originalMessage.quoted && originalMessage.quoted.isMedia) {
                fileBuffer = await originalMessage.quoted.download();
            } else if (originalMessage.isMedia) {
                fileBuffer = await originalMessage.download();
            }

            const context = {
                sock,
                chat: originalMessage.chat,
                from: originalMessage.chat,
                args,
                text: args.join(" "),
                m: originalMessage,
                fileBuffer,
                isGroup: originalMessage.isGroup,
                sender: originalMessage.sender,
                groupCache: (await import("./groupCache.js")).default,
                reply: async (content, options) =>
                    await originalMessage.reply(content, options)
            };

            await this.messageHandler.pluginManager.executePlugin(command, context);
        }
    }

    getMessageInfo(message) {
        const content =
            message?.conversation ||
            message?.extendedTextMessage?.text ||
            message?.imageMessage?.caption ||
            message?.videoMessage?.caption ||
            message?.documentMessage?.caption ||
            "";

        return {
            content,
            hasSticker: !!message?.stickerMessage,
            hasImage: !!message?.imageMessage,
            hasVideo: !!message?.videoMessage,
            hasAudio: !!message?.audioMessage,
            hasDocument: !!message?.documentMessage
        };
    }

    buildDeleteMessage(
        isStatus,
        senderName,
        sender,
        storedMessage,
        storedData,
        messageInfo
    ) {
        let msg = `🚫 *${isStatus ? "STATUS" : "PESAN"} DIHAPUS*\n\n`;
        msg += `👤 Pengirim: ${senderName}\n`;
        msg += `📱 Nomor: ${sender.split("@")[0]}\n`;
        msg += `⏰ Waktu: ${new Date(
            storedMessage.messageTimestamp * 1000
        ).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta"
        })}\n`;

        if (storedData.editHistory?.length > 0) {
            msg += `\n📝 *Riwayat Edit (${storedData.editHistory.length}x):*\n`;
            storedData.editHistory.forEach((edit, index) => {
                const content =
                    this.getMessageInfo(edit.message).content ||
                    "(media/sticker)";
                msg += `\n${index + 1}. ${content}\n   ⏰ ${new Date(
                    edit.timestamp
                ).toLocaleString("id-ID", {
                    timeZone: "Asia/Jakarta"
                })}`;
            });
            msg += `\n`;
        } else {
            msg += `\n`;
        }

        if (messageInfo.content) {
            msg += `📝 *Pesan Terakhir:*\n${messageInfo.content}`;
        } else if (messageInfo.hasSticker) {
            msg += `🎭 Tipe: Stiker`;
        } else if (messageInfo.hasImage) {
            msg += `🖼️ Tipe: Gambar`;
        } else if (messageInfo.hasVideo) {
            msg += `🎥 Tipe: Video`;
        } else if (messageInfo.hasAudio) {
            msg += `🎵 Tipe: Audio`;
        } else if (messageInfo.hasDocument) {
            msg += `📄 Tipe: Dokumen`;
        }

        return msg;
    }

    buildEditMessage(
        senderName,
        sender,
        storedMessage,
        messageType,
        editCount,
        oldContent,
        newContent
    ) {
        let msg = `✏️ *PESAN DIEDIT*\n\n`;
        msg += `👤 Pengirim: ${senderName}\n`;
        msg += `📱 Nomor: ${sender.split("@")[0]}\n`;

        if (messageType !== "teks") {
            msg += `📦 Tipe: ${messageType}\n`;
        }

        msg += `⏰ Waktu Original: ${new Date(
            storedMessage.messageTimestamp * 1000
        ).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta"
        })}\n`;
        msg += `⏰ Waktu Edit: ${new Date().toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta"
        })}\n\n`;
        msg += `🔢 Edit ke-${editCount}\n\n`;

        const label = messageType !== "teks" ? "Caption" : "Pesan";
        msg += `📝 ${label} Lama:\n${oldContent}\n\n`;
        msg += `✨ ${label} Baru:\n${newContent}`;

        return msg;
    }

    getOldContent(storedData) {
        if (storedData.editHistory?.length > 0) {
            const lastEdit =
                storedData.editHistory[storedData.editHistory.length - 1];
            return this.getMessageInfo(lastEdit.message).content || "(kosong)";
        }
        return (
            this.getMessageInfo(storedData.message.message).content ||
            "(kosong)"
        );
    }

    getNewContent(update) {
        let newContent = "(kosong)";
        let newMessageObj = null;

        if (update.update.message?.editedMessage) {
            const editedMsg = update.update.message.editedMessage.message;
            if (editedMsg) {
                newMessageObj = editedMsg;
                newContent =
                    this.getMessageInfo(editedMsg).content || "(kosong)";
            }
        } else if (update.update.message?.protocolMessage) {
            const editedMsg =
                update.update.message.protocolMessage.editedMessage;
            if (editedMsg) {
                newMessageObj = editedMsg;
                newContent =
                    this.getMessageInfo(editedMsg).content || "(kosong)";
            }
        }

        return { newContent, newMessageObj };
    }

    getMessageType(message) {
        if (message?.imageMessage) return "🖼️ Gambar";
        if (message?.videoMessage) return "🎥 Video";
        if (message?.documentMessage) return "📄 Dokumen";
        if (message?.audioMessage) return "🎵 Audio";
        if (message?.stickerMessage) return "🎭 Stiker";
        return "teks";
    }

    async resendMedia(sock, from, storedMessage) {
        const originalMessage = storedMessage.message;
        const downloadOptions = {
            logger: Pino({ level: "silent" }),
            reuploadRequest: sock.updateMediaMessage
        };

        try {
            if (originalMessage?.stickerMessage) {
                const buffer = await downloadMediaMessage(
                    storedMessage,
                    "buffer",
                    {},
                    downloadOptions
                );
                await sock.sendMessage(from, { sticker: buffer });
            } else if (originalMessage?.imageMessage) {
                const buffer = await downloadMediaMessage(
                    storedMessage,
                    "buffer",
                    {},
                    downloadOptions
                );
                await sock.sendMessage(from, {
                    image: buffer,
                    caption: "🖼️ Gambar yang dihapus"
                });
            } else if (originalMessage?.videoMessage) {
                const buffer = await downloadMediaMessage(
                    storedMessage,
                    "buffer",
                    {},
                    downloadOptions
                );
                await sock.sendMessage(from, {
                    video: buffer,
                    caption: "🎥 Video yang dihapus"
                });
            } else if (originalMessage?.audioMessage) {
                const buffer = await downloadMediaMessage(
                    storedMessage,
                    "buffer",
                    {},
                    downloadOptions
                );
                await sock.sendMessage(from, {
                    audio: buffer,
                    mimetype: "audio/mp4"
                });
            } else if (originalMessage?.documentMessage) {
                const buffer = await downloadMediaMessage(
                    storedMessage,
                    "buffer",
                    {},
                    downloadOptions
                );
                await sock.sendMessage(from, {
                    document: buffer,
                    mimetype: originalMessage.documentMessage.mimetype,
                    fileName: originalMessage.documentMessage.fileName,
                    caption: "📄 Dokumen yang dihapus"
                });
            }
        } catch (e) {
            console.error(colors.red("❌ Failed to resend media:"), e.message);
        }
    }
}

export default AntiDeleteEditHandler;