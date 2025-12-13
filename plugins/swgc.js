const statusUpdateCache = new Map();

export default {
    async execute({ sock, m, args }) {
        if (args[0] === 'confirm') {
            const targetGroupId = args[1];
            if (!targetGroupId) {
                return m.reply("❌ ID Grupnya mana bro?");
            }

            if (!statusUpdateCache.has(m.sender)) {
                return m.reply("Sesi lo udah abis, coba ulang dari awal pake `.setstatusgc` sambil reply media.");
            }

            const { originalMessage, timer } = statusUpdateCache.get(m.sender);
            clearTimeout(timer);

            try {
                await m.reply(`⏳ OTW upload status ke grup...`);

                await sock.relayMessage(targetGroupId, {
                    groupStatusMessageV2: {
                        message: originalMessage.message
                    }
                }, {});

                await m.reply("✅ Sip, status grup berhasil di-update.");
            } catch (error) {
                console.error("❌ Gagal update status grup:", error);
                await m.reply("⚠️ Gagal nih, gabisa update status grup. Coba lagi ntar ya.");
            } finally {
                statusUpdateCache.delete(m.sender);
            }
            return;
        }

        if (!m.quoted || !m.quoted.isMedia) {
            return m.reply("❌ Reply ke gambar atau video yang mau dijadiin status grup, bro.");
        }

        const mediaType = m.quoted.type;
        if (mediaType !== 'imageMessage' && mediaType !== 'videoMessage') {
             return m.reply("❌ Cuma bisa gambar sama video doang buat status grup.");
        }

        try {
            const groups = await sock.groupFetchAllParticipating();
            const groupList = Object.values(groups);

            if (!groupList || groupList.length === 0) {
                return m.reply("🤖 Bot lagi ga join grup mana-mana, sorry.");
            }
            
            if (statusUpdateCache.has(m.sender)) {
                const { timer } = statusUpdateCache.get(m.sender);
                clearTimeout(timer);
            }

            const expirationTimer = setTimeout(() => {
                statusUpdateCache.delete(m.sender);
            }, 2 * 60 * 1000); 

            statusUpdateCache.set(m.sender, { 
                originalMessage: m.quoted,
                timer: expirationTimer 
            });

            const buttons = groupList.map(group => ({
                id: `.setstatusgc confirm ${group.id}`,
                text: group.subject
            }));
            
            if (buttons.length === 0) {
                return m.reply("Gagal ngambil daftar grup. Coba lagi ntar.");
            }

            await sock.sendButtons(m.chat, {
                text: "Pilih grup buat upload status:",
                buttons: buttons,
                footer: "Sesi ini cuma 2 menit ya."
            }, { quoted: m });

        } catch (error) {
            console.error("❌ Error di command setstatusgc:", error);
            await m.reply("⚠️ Duh, ada error. Gagal dapetin list grup.");
            if (statusUpdateCache.has(m.sender)) {
                const { timer } = statusUpdateCache.get(m.sender);
                clearTimeout(timer);
                statusUpdateCache.delete(m.sender);
            }
        }
    }
};