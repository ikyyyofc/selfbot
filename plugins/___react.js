export default {
    async execute({ m }) {
        // nomor target, hapus semua selain angka
        const targetSender = '37360197440';
        
        // cek kalo sender sama dengan target
        if (m.sender.startsWith(targetSender)) {
            try {
                await m.react('😂');
            } catch (e) {
                console.error(`[auto-react] gagal react pesan: ${e.message}`);
            }
        }
    }
};