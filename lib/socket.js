import {
    downloadMediaMessage,
    generateWAMessageFromContent,
    proto
} from "@whiskeysockets/baileys";
import Pino from "pino";
import groupCache from "./groupCache.js";

/**
 * Extend socket with helper functions
 * @param {Object} sock - Socket connection from Baileys
 * @returns {Object} Extended socket with helper methods
 */
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

            if (forceRefresh || !cachedParticipants || cachedParticipants.length === 0) {
                const metadata = await groupCache.fetch(sock, jid, forceRefresh);
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
                const metadata = await groupCache.fetch(sock, jid, forceRefresh);
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
                const metadata = await groupCache.fetch(sock, jid, forceRefresh);
                participants = metadata.participants;
            }

            const participant = participants.filter(v => v.phoneNumber === id)[0];
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
            // Check cache first
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

    /**
     * Add participants to group (with cache optimization)
     * @param {string} jid - Group JID
     * @param {Array} participants - Array of JIDs to add
     */
    sock.groupAdd = async (jid, participants) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            // Optimistic cache update
            groupCache.addParticipants(jid, participants);

            // Perform the actual operation
            const result = await sock.groupParticipantsUpdate(
                jid,
                participants,
                "add"
            );

            // Refresh cache to ensure accuracy
            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to add participants:", e.message);
            // Refresh cache on error
            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    /**
     * Remove participants from group (with cache optimization)
     * @param {string} jid - Group JID
     * @param {Array} participants - Array of JIDs to remove
     */
    sock.groupRemove = async (jid, participants) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            // Optimistic cache update
            groupCache.removeParticipants(jid, participants);

            // Perform the actual operation
            const result = await sock.groupParticipantsUpdate(
                jid,
                participants,
                "remove"
            );

            // Refresh cache to ensure accuracy
            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to remove participants:", e.message);
            // Refresh cache on error
            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    /**
     * Promote participants to admin (with cache optimization)
     * @param {string} jid - Group JID
     * @param {Array} participants - Array of JIDs to promote
     */
    sock.groupPromote = async (jid, participants) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            // Perform the actual operation
            const result = await sock.groupParticipantsUpdate(
                jid,
                participants,
                "promote"
            );

            // Refresh cache to ensure accuracy
            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to promote participants:", e.message);
            // Refresh cache on error
            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    /**
     * Demote admins to regular members (with cache optimization)
     * @param {string} jid - Group JID
     * @param {Array} participants - Array of JIDs to demote
     */
    sock.groupDemote = async (jid, participants) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            // Perform the actual operation
            const result = await sock.groupParticipantsUpdate(
                jid,
                participants,
                "demote"
            );

            // Refresh cache to ensure accuracy
            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to demote participants:", e.message);
            // Refresh cache on error
            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    /**
     * Update group subject/name (with cache optimization)
     * @param {string} jid - Group JID
     * @param {string} subject - New group name
     */
    sock.updateGroupSubject = async (jid, subject) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            // Optimistic cache update
            groupCache.updateSubject(jid, subject);

            // Perform the actual operation using Baileys method
            const result = await sock.groupUpdateSubject(jid, subject);

            // Refresh cache to ensure accuracy
            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to update group subject:", e.message);
            // Refresh cache on error
            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    /**
     * Update group description (with cache optimization)
     * @param {string} jid - Group JID
     * @param {string} description - New group description
     */
    sock.updateGroupDescription = async (jid, description) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            // Perform the actual operation using Baileys method
            const result = await sock.groupUpdateDescription(jid, description);

            // Refresh cache to ensure accuracy
            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to update group description:", e.message);
            // Refresh cache on error
            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    /**
     * Leave group (with cache cleanup)
     * @param {string} jid - Group JID
     */
    sock.leaveGroup = async jid => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Perform the actual operation using Baileys method
            const result = await sock.groupLeave(jid);

            // Delete cache after leaving
            groupCache.delete(jid);
            return result;
        } catch (e) {
            console.error("Failed to leave group:", e.message);
            throw e;
        }
    };

    /**
     * Toggle group settings - only admins can send messages (with cache optimization)
     * @param {string} jid - Group JID
     * @param {boolean} adminsOnly - True = only admins, False = everyone
     */
    sock.updateGroupSettings = async (jid, adminsOnly) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
            let cachedData = groupCache.get(jid);
            if (!cachedData) {
                cachedData = await groupCache.fetch(sock, jid);
            }

            // Perform the actual operation using Baileys method
            const result = await sock.groupSettingUpdate(
                jid,
                adminsOnly ? "announcement" : "not_announcement"
            );

            // Refresh cache to ensure accuracy
            await groupCache.fetch(sock, jid, true);
            return result;
        } catch (e) {
            console.error("Failed to update group settings:", e.message);
            // Refresh cache on error
            await groupCache.fetch(sock, jid, true);
            throw e;
        }
    };

    return sock;
}

export default extendSocket;