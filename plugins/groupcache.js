import colors from "@colors/colors/safe.js";

export default {
    name: 'groupcache',
    desc: 'Mengelola dan menampilkan informasi dari group cache.',
    rules: {
        owner: true, // Hanya owner yang bisa akses
        group: false, // Bisa di private maupun grup
    },
    execute: async ({ m, args, reply, sock, groupCache }) => {
        const subCommand = args[0]?.toLowerCase();

        switch (subCommand) {
            case 'stats':
                try {
                    const stats = groupCache.getStats();
                    const statsMessage = `📊 *Statistik Group Cache*

- Total Grup di Cache: *${stats.total}*
- Status Inisialisasi: *${stats.initialized ? '✅ Terinisialisasi' : '❌ Belum'}*`;
                    await reply(statsMessage);
                } catch (e) {
                    await reply(`❌ Gagal mendapatkan statistik: ${e.message}`);
                }
                break;

            case 'refresh':
                if (!m.isGroup) {
                    return await reply('❌ Perintah ini hanya bisa digunakan di dalam grup.');
                }
                try {
                    await reply('⏳ Merefresh cache untuk grup ini...');
                    await groupCache.fetch(sock, m.chat);
                    await reply('✅ Cache untuk grup ini berhasil di-refresh!');
                } catch (e) {
                    await reply(`❌ Gagal me-refresh cache: ${e.message}`);
                    console.error(colors.red('Cache refresh error:'), e);
                }
                break;

            case 'info':
                if (!m.isGroup) {
                    return await reply('❌ Perintah ini hanya bisa digunakan di dalam grup.');
                }
                try {
                    const metadata = groupCache.get(m.chat);
                    if (!metadata) {
                        return await reply('Grup ini tidak ditemukan di cache. Coba `.groupcache refresh` dulu.');
                    }

                    const infoMessage = `📄 *Informasi Cache Grup*

- Nama Grup: *${metadata.subject}*
- ID Grup: \`\`\`${metadata.id}\`\`\`
- Total Partisipan: *${metadata.participants.length}*
- Total Admin: *${metadata.participants.filter(p => p.admin).length}*
- Deskripsi: ${metadata.desc ? `\n\`\`\`${metadata.desc}\`\`\`` : '*Tidak ada deskripsi*'}`;
                    
                    await reply(infoMessage);
                } catch (e) {
                    await reply(`❌ Gagal mendapatkan info cache: ${e.message}`);
                }
                break;

            case 'list':
                try {
                    const groupJids = groupCache.keys();
                    if (groupJids.length === 0) {
                        return await reply('Cache grup saat ini kosong.');
                    }
                    
                    let listMessage = `📋 *Daftar Grup di Cache (${groupJids.length})*\n\n`;
                    groupJids.forEach((jid, index) => {
                        const subject = groupCache.getSubject(jid) || 'Nama tidak diketahui';
                        listMessage += `${index + 1}. ${subject}\n`;
                    });

                    await reply(listMessage);
                } catch (e) {
                    await reply(`❌ Gagal mendapatkan daftar grup: ${e.message}`);
                }
                break;
                
            case 'clear':
                try {
                    groupCache.clear();
                    await reply('✅ Semua cache grup berhasil dibersihkan. Cache akan diinisialisasi ulang.');
                    // Re-initialize cache after clearing
                    setTimeout(() => groupCache.initialize(sock), 2000);
                } catch (e) {
                    await reply(`❌ Gagal membersihkan cache: ${e.message}`);
                }
                break;

            default:
                const helpMessage = `⚙️ *Perintah Group Cache*

Gunakan perintah ini untuk mengelola cache grup.
*Hanya untuk Owner.*

*Sub-perintah yang tersedia:*
- \`.groupcache stats\`
  ↳ Menampilkan statistik cache.
- \`.groupcache refresh\`
  ↳ Memuat ulang cache untuk grup saat ini.
- \`.groupcache info\`
  ↳ Menampilkan info cache dari grup saat ini.
- \`.groupcache list\`
  ↳ Menampilkan semua grup yang ada di cache.
- \`.groupcache clear\`
  ↳ Menghapus semua data dari cache grup.`;
                await reply(helpMessage);
                break;
        }
    }
};