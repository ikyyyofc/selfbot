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
    /**
     * Send text message
     * @param {string} jid - WhatsApp JID
     * @param {string} text - Message text
     * @param {Object} options - Additional options
     */
    sock.sendText = async (jid, text, options = {}) => {
        return await sock.sendMessage(jid, { text }, options);
    };

    /**
     * Send image message
     * @param {string} jid - WhatsApp JID
     * @param {Buffer|string} image - Image buffer or URL
     * @param {string} caption - Image caption
     * @param {Object} options - Additional options
     */
    sock.sendImage = async (jid, image, caption = "", options = {}) => {
        return await sock.sendMessage(
            jid,
            {
                image,
                caption
            },
            options
        );
    };

    /**
     * Send video message
     * @param {string} jid - WhatsApp JID
     * @param {Buffer|string} video - Video buffer or URL
     * @param {string} caption - Video caption
     * @param {Object} options - Additional options
     */
    sock.sendVideo = async (jid, video, caption = "", options = {}) => {
        return await sock.sendMessage(
            jid,
            {
                video,
                caption,
                mimetype: "video/mp4"
            },
            options
        );
    };

    /**
     * Send audio message
     * @param {string} jid - WhatsApp JID
     * @param {Buffer} audio - Audio buffer
     * @param {Object} options - Additional options
     */
    sock.sendAudio = async (jid, audio, options = {}) => {
        return await sock.sendMessage(
            jid,
            {
                audio,
                mimetype: "audio/mp4",
                ptt: options.ptt || false
            },
            options
        );
    };

    /**
     * Send document message
     * @param {string} jid - WhatsApp JID
     * @param {Buffer} document - Document buffer
     * @param {string} fileName - File name
     * @param {string} mimetype - MIME type
     * @param {Object} options - Additional options
     */
    sock.sendDocument = async (
        jid,
        document,
        fileName,
        mimetype,
        options = {}
    ) => {
        return await sock.sendMessage(
            jid,
            {
                document,
                fileName,
                mimetype
            },
            options
        );
    };

    /**
     * Send sticker message
     * @param {string} jid - WhatsApp JID
     * @param {Buffer} sticker - Sticker buffer
     * @param {Object} options - Additional options
     */
    sock.sendSticker = async (jid, sticker, options = {}) => {
        return await sock.sendMessage(jid, { sticker }, options);
    };

    /**
     * Send contact message
     * @param {string} jid - WhatsApp JID
     * @param {Array} contacts - Array of contacts [{displayName, vcard}]
     * @param {Object} options - Additional options
     */
    sock.sendContact = async (jid, contacts, options = {}) => {
        const vcard = contacts.map(contact => contact.vcard).join("\n");
        return await sock.sendMessage(
            jid,
            {
                contacts: {
                    displayName: contacts[0].displayName,
                    contacts: contacts.map(c => ({ vcard: c.vcard }))
                }
            },
            options
        );
    };

    /**
     * Send location message
     * @param {string} jid - WhatsApp JID
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @param {Object} options - Additional options
     */
    sock.sendLocation = async (jid, latitude, longitude, options = {}) => {
        return await sock.sendMessage(
            jid,
            {
                location: {
                    degreesLatitude: latitude,
                    degreesLongitude: longitude
                }
            },
            options
        );
    };

    /**
     * Send button message (deprecated in newer WA versions, but kept for compatibility)
     * @param {string} jid - WhatsApp JID
     * @param {string} text - Message text
     * @param {string} footer - Footer text
     * @param {Array} buttons - Array of buttons
     * @param {Object} options - Additional options
     */
    sock.sendButton = async (jid, text, footer, buttons, options = {}) => {
        const buttonMessage = {
            text,
            footer,
            buttons: buttons.map((btn, index) => ({
                buttonId: btn.id || `btn_${index}`,
                buttonText: { displayText: btn.text },
                type: 1
            })),
            headerType: 1
        };
        return await sock.sendMessage(jid, buttonMessage, options);
    };

    /**
     * Send list message
     * @param {string} jid - WhatsApp JID
     * @param {string} text - Message text
     * @param {string} buttonText - Button text
     * @param {Array} sections - Array of sections
     * @param {Object} options - Additional options
     */
    sock.sendList = async (jid, text, buttonText, sections, options = {}) => {
        const listMessage = {
            text,
            footer: options.footer || "",
            title: options.title || "",
            buttonText,
            sections
        };
        return await sock.sendMessage(jid, listMessage, options);
    };

    /**
     * Send reaction to a message
     * @param {string} jid - WhatsApp JID
     * @param {string} emoji - Emoji to react with
     * @param {Object} key - Message key to react to
     */
    sock.sendReact = async (jid, emoji, key) => {
        return await sock.sendMessage(jid, {
            react: { text: emoji, key }
        });
    };

    /**
     * Delete a message
     * @param {string} jid - WhatsApp JID
     * @param {Object} key - Message key to delete
     */
    sock.deleteMessage = async (jid, key) => {
        return await sock.sendMessage(jid, {
            delete: key
        });
    };

    /**
     * Edit a message
     * @param {string} jid - WhatsApp JID
     * @param {Object} key - Message key to edit
     * @param {string} newText - New message text
     */
    sock.editMessage = async (jid, key, newText) => {
        return await sock.sendMessage(jid, {
            text: newText,
            edit: key
        });
    };

    /**
     * Send typing indicator
     * @param {string} jid - WhatsApp JID
     * @param {boolean} isTyping - True to show typing, false to hide
     */
    sock.sendTyping = async (jid, isTyping = true) => {
        return await sock.sendPresenceUpdate(
            isTyping ? "composing" : "paused",
            jid
        );
    };

    /**
     * Send recording indicator
     * @param {string} jid - WhatsApp JID
     * @param {boolean} isRecording - True to show recording, false to hide
     */
    sock.sendRecording = async (jid, isRecording = true) => {
        return await sock.sendPresenceUpdate(
            isRecording ? "recording" : "paused",
            jid
        );
    };

    /**
     * Send read receipt
     * @param {string} jid - WhatsApp JID
     * @param {Object} key - Message key to mark as read
     */
    sock.readMessage = async (jid, key) => {
        return await sock.readMessages([key]);
    };

    /**
     * Block user
     * @param {string} jid - WhatsApp JID to block
     */
    sock.blockUser = async jid => {
        return await sock.updateBlockStatus(jid, "block");
    };

    /**
     * Unblock user
     * @param {string} jid - WhatsApp JID to unblock
     */
    sock.unblockUser = async jid => {
        return await sock.updateBlockStatus(jid, "unblock");
    };

    /**
     * Get profile picture URL
     * @param {string} jid - WhatsApp JID
     * @param {string} type - 'image' or 'preview'
     */
    sock.getProfilePicture = async (jid, type = "image") => {
        try {
            return await sock.profilePictureUrl(jid, type);
        } catch (e) {
            return null;
        }
    };

    /**
     * Get user status/bio
     * @param {string} jid - WhatsApp JID
     */
    sock.getUserStatus = async jid => {
        try {
            const status = await sock.fetchStatus(jid);
            return status?.status || null;
        } catch (e) {
            return null;
        }
    };

    /**
     * Update profile picture
     * @param {Buffer} image - Image buffer
     */
    sock.updateProfilePicture = async image => {
        return await sock.updateProfilePicture(sock.user.id, image);
    };

    /**
     * Update profile name
     * @param {string} name - New profile name
     */
    sock.updateProfileName = async name => {
        return await sock.updateProfileName(name);
    };

    /**
     * Update profile status/bio
     * @param {string} status - New status
     */
    sock.updateProfileStatus = async status => {
        return await sock.updateProfileStatus(status);
    };

    /**
     * Get group metadata (with smart caching)
     * @param {string} jid - Group JID
     * @param {boolean} forceRefresh - Force refresh from server
     */
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

    /**
     * Get group participants (with smart caching)
     * @param {string} jid - Group JID
     * @param {boolean} forceRefresh - Force refresh from server
     */
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

    /**
     * Get JID of specific participant (with smart caching)
     * @param {string} jid - Group JID
     * @param {string} id - Participant ID
     * @param {boolean} forceRefresh - Force refresh from server
     */
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

    /**
     * Get LID participant (with smart caching)
     * @param {string} jid - Group JID
     * @param {string} id - Participant phone number
     * @param {boolean} forceRefresh - Force refresh from server
     */
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

    /**
     * Get group admins (with smart caching)
     * @param {string} jid - Group JID
     * @param {boolean} forceRefresh - Force refresh from server
     */
    sock.getGroupAdmins = async (jid, forceRefresh = false) => {
        if (!jid.endsWith("@g.us")) return "Only for Group";
        try {
            // Check cache first
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

    /**
     * Check if user is admin (with smart caching)
     * @param {string} jid - Group JID
     * @param {string} userJid - User JID
     * @param {boolean} forceRefresh - Force refresh from server
     */
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