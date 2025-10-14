// plugins/kick.js
export default async function ({ sock, from, args, text, m, reply }) {
  try {
    // pastikan perintah di group
    if (!from || !from.endsWith("@g.us")) {
      return reply("❌ Perintah ini hanya bisa dipakai di grup.");
    }

    // ambil calon target: mention > reply > arg nomor
    const ctxInfo = m.message?.extendedTextMessage?.contextInfo || {};
    const mentioned = ctxInfo.mentionedJid || [];
    const quotedParticipant = ctxInfo.participant; // bila reply, ini biasanya ada
    let targetJid = null;

    if (mentioned.length > 0) {
      targetJid = mentioned[0];
    } else if (quotedParticipant) {
      targetJid = quotedParticipant;
    } else if (args && args.length > 0) {
      // support nomor tanpa domain: 628123456789 -> 628123456789@s.whatsapp.net
      let num = args[0].replace(/[^0-9+]/g, "");
      if (!num) return reply("❌ Tidak ada target. Mention, reply, atau tulis nomor sebagai argumen.");
      if (num.startsWith("+")) num = num.slice(1);
      if (!num.endsWith("@s.whatsapp.net")) num = `${num}@s.whatsapp.net`;
      targetJid = num;
    } else {
      return reply("❌ Tidak ada target. Mention, reply, atau tulis nomor sebagai argumen.");
    }

    // jangan kick diri sendiri
    const sender = m.key?.participant || m.key?.remoteJid || null;
    if (sender && targetJid === sender) return reply("❌ Kamu tidak bisa meng-kick diri sendiri.");

    // ambil metadata grup untuk mengecek admin
    let metadata = null;
    try {
      metadata = await sock.groupMetadata(from);
    } catch (e) {
      // beberapa implementasi menyimpan metadata di cache
      metadata = sock.groupMetadata && sock.groupMetadata[from];
    }

    if (!metadata) {
      // fallback: coba ambil dari store (beberapa wrapper)
      return reply("❌ Gagal mendapatkan data grup. Coba lagi.");
    }

    // helper: cek admin
    const isAdmin = (jid) => {
      const p = metadata.participants?.find((x) => x.jid === jid);
      if (!p) return false;
      // beberapa versi pakai 'isAdmin' atau 'admin'
      return !!(p.admin || p.isAdmin || p.isSuperAdmin || p.admin === "admin" || p.admin === "superadmin");
    };

    // cek pengirim admin
    const senderJid = m.key?.participant || m.participant || (m.author ? m.author : null);
    if (!senderJid) return reply("❌ Tidak dapat mengenali pengirim.");
    if (!isAdmin(senderJid)) return reply("❌ Kamu harus menjadi *admin grup* untuk menggunakan perintah ini.");

    // cek bot admin
    const botJid = (sock.user && (sock.user.id || sock.user)) || null;
    // normalize bot id: kadang berbentuk '12345:678@...' atau '12345@s.whatsapp.net'
    let botId = null;
    if (botJid) {
      if (typeof botJid === "object" && botJid.id) botId = botJid.id;
      else botId = String(botJid);
    }
    // beberapa implementasi memerlukan penyesuaian id
    if (botId && !botId.includes("@")) {
      // coba tambahkan domain jika hanya nomor
      botId = botId.includes(":") ? botId.split(":")[0] + "@s.whatsapp.net" : botId + "@s.whatsapp.net";
    }

    if (!botId) {
      // fallback: coba sock.user.jid atau sock.user.id
      botId = sock.user && (sock.user.jid || sock.user.id) ? (sock.user.jid || sock.user.id) : null;
    }

    if (!botId) {
      // tetap lanjutkan tetapi beritahu risiko
      return reply("❌ Tidak dapat mengenali ID bot. Pastikan bot terhubung dengan benar.");
    }

    if (!isAdmin(botId)) return reply("❌ Bot harus menjadi *admin grup* untuk dapat mengeluarkan member.");

    // jangan kick owner (group creator) — jika ada info creator di metadata
    if (metadata.owner && targetJid === metadata.owner) {
      return reply("❌ Tidak bisa meng-kick owner grup.");
    }

    // jika target tidak ada di grup
    const targetExists = metadata.participants?.some((p) => p.id === targetJid);
    if (!targetExists) {
      return reply("❌ Target tidak ditemukan di grup.");
    }

    // lakukan kick
    try {
      await sock.groupParticipantsUpdate(from, [targetJid], "remove");
      return reply(`✅ Sukses mengeluarkan: ${targetJid.split("@")[0]}`);
    } catch (err) {
      // beberapa implementasi mungkin memerlukan flag atau bentuk lain, coba alternatif
      try {
        // alternatif API names
        if (typeof sock.groupParticipantsUpdate === "function") {
          await sock.groupParticipantsUpdate(from, [targetJid], "remove");
          return reply(`✅ Sukses mengeluarkan: ${targetJid.split("@")[0]}`);
        }
      } catch (err2) {
        console.error("kick error:", err, err2);
        return reply("❌ Gagal mengeluarkan member. Pastikan bot memiliki izin admin dan nomor target valid.");
      }
    }
  } catch (e) {
    console.error("plugin kick error:", e);
    return reply("❌ Terjadi kesalahan saat memproses perintah.");
  }
}