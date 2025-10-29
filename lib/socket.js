import {
    downloadMediaMessage,
    generateWAMessageFromContent,
    proto
} from "@whiskeysockets/baileys";
import Pino from "pino";
import groupCache from "./groupCache.js";

export async function extendSocket(sock) {
    sock.getGroupMetadata = async (jid, forceRefresh = false) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
            const cachedData = groupCache.get(jid);

            if (forceRefresh || !cachedData) {
                return await groupCache.fetch(sock, jid, forceRefresh);
            }

            return cachedData;
        } catch (e) {
            console.error("Failed to get group metadata:", e.message);
            return null;
        }
    };

    sock.getGroupParticipants = async (jid, forceRefresh = false) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
            const cachedParticipants = groupCache.getParticipants(jid);

            if (
                forceRefresh ||
                !cachedParticipants ||
                cachedParticipants.length === 0
            ) {
                const metadata = await groupCache.fetch(
                    sock,
                    jid,
                    forceRefresh
                );
                return metadata.participants;
            }

            return cachedParticipants;
        } catch (e) {
            console.error("Failed to get group participants:", e.message);
            return [];
        }
    };

    sock.getJidParticipants = async (jid, id, forceRefresh = false) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
            let participants = groupCache.getParticipants(jid);

            if (forceRefresh || !participants || participants.length === 0) {
                const metadata = await groupCache.fetch(
                    sock,
                    jid,
                    forceRefresh
                );
                participants = metadata.participants;
            }

            const participant = participants.filter(v => v.id === id)[0];
            return participant?.phoneNumber || null;
        } catch (e) {
            console.error("Failed to get participant JID:", e.message);
            return null;
        }
    };

    sock.getLidParticipants = async (jid, id, forceRefresh = false) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
            let participants = groupCache.getParticipants(jid);

            if (forceRefresh || !participants || participants.length === 0) {
                const metadata = await groupCache.fetch(
                    sock,
                    jid,
                    forceRefresh
                );
                participants = metadata.participants;
            }

            const participant = participants.filter(
                v => v.phoneNumber === id
            )[0];
            return participant?.id || null;
        } catch (e) {
            console.error("Failed to get participant LID:", e.message);
            return null;
        }
    };

    sock.getGroupAdmins = async (jid, forceRefresh = false) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            const cachedAdmins = groupCache.getAdmins(jid);

            if (forceRefresh || !cachedAdmins || cachedAdmins.length === 0) {
                await groupCache.fetch(sock, jid, forceRefresh);
                return groupCache.getAdmins(jid);
            }

            return cachedAdmins;
        } catch (e) {
            console.error("Failed to get group admins:", e.message);
            return [];
        }
    };

    sock.isGroupAdmin = async (jid, userJid, forceRefresh = false) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            const cachedData = groupCache.get(jid);

            if (forceRefresh || !cachedData) {
                await groupCache.fetch(sock, jid, forceRefresh);
            }

            return groupCache.isAdmin(jid, userJid);
        } catch (e) {
            console.error("Failed to check admin status:", e.message);
            return false;
        }
    };

    sock.groupAdd = async (jid, participants) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            groupCache.addParticipants(jid, participants);

            const result = await sock.groupParticipantsUpdate(
                jid,
                participants,
                "add"
            );

            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to add participants:", e.message);

            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    sock.groupRemove = async (jid, participants) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            groupCache.removeParticipants(jid, participants);

            const result = await sock.groupParticipantsUpdate(
                jid,
                participants,
                "remove"
            );

            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to remove participants:", e.message);
            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    sock.groupPromote = async (jid, participants) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            const result = await sock.groupParticipantsUpdate(
                jid,
                participants,
                "promote"
            );

            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to promote participants:", e.message);

            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    sock.groupDemote = async (jid, participants) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            const result = await sock.groupParticipantsUpdate(
                jid,
                participants,
                "demote"
            );

            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to demote participants:", e.message);

            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    sock.updateGroupSubject = async (jid, subject) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            groupCache.updateSubject(jid, subject);

            const result = await sock.groupUpdateSubject(jid, subject);

            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to update group subject:", e.message);

            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    sock.updateGroupDescription = async (jid, description) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            const result = await sock.groupUpdateDescription(jid, description);

            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to update group description:", e.message);

            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    sock.leaveGroup = async jid => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            const result = await sock.groupLeave(jid);

            groupCache.delete(jid);
            return result;
        } catch (e) {
            console.error("Failed to leave group:", e.message);
            throw e;
        }
    };

    sock.updateGroupSettings = async (jid, adminsOnly) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            const result = await sock.groupSettingUpdate(
                jid,
                adminsOnly ? "announcement" : "not_announcement"
            );

            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to update group settings:", e.message);

            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    sock.sendFile = async (
        jid,
        media,
        filename = "",
        caption = "",
        quoted = null,
        options = {}
    ) => {
        try {
            let buffer;
            let mimetype;

            if (Buffer.isBuffer(media)) {
                buffer = media;
            } else if (typeof media === "string") {
                if (
                    media.startsWith("http://") ||
                    media.startsWith("https://")
                ) {
                    const response = await fetch(media);
                    buffer = Buffer.from(await response.arrayBuffer());
                } else {
                    const fs = await import("fs");
                    buffer = fs.readFileSync(media);
                }
            } else {
                throw new Error("Invalid media type");
            }

            const { fileTypeFromBuffer } = await import("file-type");
            const type = await fileTypeFromBuffer(buffer);
            mimetype = type?.mime || "application/octet-stream";

            if (!filename) {
                filename = `file.${type?.ext || "bin"}`;
            }

            const sizeLimit = 65 * 1024 * 1024;
            const isLargeFile = buffer.length > sizeLimit;

            const isImage = mimetype.startsWith("image/");
            const isVideo = mimetype.startsWith("video/");
            const isAudio = mimetype.startsWith("audio/");

            const sendOptions = {
                quoted: quoted,
                ...options
            };

            if (options.ptt && isAudio) {
                return await sock.sendMessage(
                    jid,
                    {
                        audio: buffer,
                        mimetype: "audio/ogg; codecs=opus",
                        ptt: true
                    },
                    sendOptions
                );
            }

            if (options.ptv && isVideo) {
                return await sock.sendMessage(
                    jid,
                    {
                        video: buffer,
                        mimetype: "video/mp4",
                        ptv: true
                    },
                    sendOptions
                );
            }

            if (isLargeFile) {
                return await sock.sendMessage(
                    jid,
                    {
                        document: buffer,
                        mimetype: mimetype,
                        fileName: filename,
                        caption: caption || undefined
                    },
                    sendOptions
                );
            }

            if (isImage) {
                return await sock.sendMessage(
                    jid,
                    {
                        image: buffer,
                        mimetype: mimetype,
                        caption: caption || undefined
                    },
                    sendOptions
                );
            }

            if (isVideo) {
                return await sock.sendMessage(
                    jid,
                    {
                        video: buffer,
                        mimetype: mimetype,
                        caption: caption || undefined
                    },
                    sendOptions
                );
            }

            if (isAudio) {
                return await sock.sendMessage(
                    jid,
                    {
                        audio: buffer,
                        mimetype: mimetype
                    },
                    sendOptions
                );
            }

            return await sock.sendMessage(
                jid,
                {
                    document: buffer,
                    mimetype: mimetype,
                    fileName: filename,
                    caption: caption || undefined
                },
                sendOptions
            );
        } catch (e) {
            console.error("Failed to send file:", e.message);
            throw e;
        }
    };

    return sock;
}

export default extendSocket;
