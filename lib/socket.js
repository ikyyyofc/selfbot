import groupCache from "./groupCache.js";
import {
    generateWAMessageFromContent,
    generateWAMessage,
    jidNormalizedUser
} from "@whiskeysockets/baileys";

import { randomBytes } from "crypto";

export async function extendSocket(sock) {
    sock.getGroupMetadata = async jid => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            const cachedData = groupCache.get(jid);

            if (!cachedData) {
                return await groupCache.fetch(sock, jid);
            }

            return cachedData;
        } catch (e) {
            console.error("Failed to get group metadata:", e.message);
            return null;
        }
    };

    sock.getGroupParticipants = async jid => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            const cachedParticipants = groupCache.getParticipants(jid);

            if (!cachedParticipants || cachedParticipants.length === 0) {
                const metadata = await groupCache.fetch(sock, jid);
                return metadata.participants;
            }

            return cachedParticipants;
        } catch (e) {
            console.error("Failed to get group participants:", e.message);
            return [];
        }
    };

    sock.getJidParticipants = async (jid, id) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            let participants = groupCache.getParticipants(jid);

            if (!participants || participants.length === 0) {
                const metadata = await groupCache.fetch(sock, jid);
                participants = metadata.participants;
            }

            const participant = participants.filter(v => v.id === id)[0];
            return participant?.phoneNumber || null;
        } catch (e) {
            console.error("Failed to get participant JID:", e.message);
            return null;
        }
    };

    sock.getLidParticipants = async (jid, id) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            let participants = groupCache.getParticipants(jid);

            if (!participants || participants.length === 0) {
                const metadata = await groupCache.fetch(sock, jid);
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

    sock.getGroupAdmins = async jid => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            const cachedAdmins = groupCache.getAdmins(jid);

            if (!cachedAdmins || cachedAdmins.length === 0) {
                await groupCache.fetch(sock, jid);
                return groupCache.getAdmins(jid);
            }

            return cachedAdmins;
        } catch (e) {
            console.error("Failed to get group admins:", e.message);
            return [];
        }
    };

    sock.isGroupAdmin = async (jid, userJid) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            const cachedData = groupCache.get(jid);

            if (!cachedData) {
                await groupCache.fetch(sock, jid);
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

            await groupCache.fetch(sock, jid);
            return result;
        } catch (e) {
            console.error("Failed to add participants:", e.message);
            await groupCache.fetch(sock, jid);
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

            await groupCache.fetch(sock, jid);
            return result;
        } catch (e) {
            console.error("Failed to remove participants:", e.message);
            await groupCache.fetch(sock, jid);
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

            await groupCache.fetch(sock, jid);
            return result;
        } catch (e) {
            console.error("Failed to promote participants:", e.message);
            await groupCache.fetch(sock, jid);
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

            await groupCache.fetch(sock, jid);
            return result;
        } catch (e) {
            console.error("Failed to demote participants:", e.message);
            await groupCache.fetch(sock, jid);
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

            await groupCache.fetch(sock, jid);
            return result;
        } catch (e) {
            console.error("Failed to update group subject:", e.message);
            await groupCache.fetch(sock, jid);
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

            await groupCache.fetch(sock, jid);
            return result;
        } catch (e) {
            console.error("Failed to update group description:", e.message);
            await groupCache.fetch(sock, jid);
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

            await groupCache.fetch(sock, jid);
            return result;
        } catch (e) {
            console.error("Failed to update group settings:", e.message);
            await groupCache.fetch(sock, jid);
            throw e;
        }
    };

    sock.sendAlbumMessage = async (jid, array, quoted) => {
        const album = generateWAMessageFromContent(
            jid,
            {
                messageContextInfo: {
                    messageSecret: randomBytes(32)
                },
                albumMessage: {
                    expectedImageCount: array.filter(a =>
                        a.hasOwnProperty("image")
                    ).length,
                    expectedVideoCount: array.filter(a =>
                        a.hasOwnProperty("video")
                    ).length
                }
            },
            {
                userJid: sock.user.jid,
                quoted,
                upload: sock.waUploadToServer
            }
        );

        await sock.relayMessage(album.key.remoteJid, album.message, {
            messageId: album.key.id
        });

        for (let content of array) {
            const img = await generateWAMessage(album.key.remoteJid, content, {
                upload: sock.waUploadToServer
            });

            img.message.messageContextInfo = {
                messageSecret: randomBytes(32),
                messageAssociation: {
                    associationType: 1,
                    parentMessageKey: album.key
                }
            };

            await sock.relayMessage(img.key.remoteJid, img.message, {
                messageId: img.key.id
            });
        }

        return album;
    };

    return sock;
}

export default extendSocket;
