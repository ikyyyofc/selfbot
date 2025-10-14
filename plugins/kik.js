export default async function ({ sock, from, args, text, m, reply }) {
  try {
    // pastikan dijalankan di grup
    if (!from.endsWith("@g.us")) {
      return reply("❌ Perintah ini hanya bisa digunakan di grup.");
    }

    // ambil target (mention > reply > argumen nomor)
    const ctxInfo = m.message?.extendedTextMessage?.contextInfo || {};
    const mentioned = ctxInfo.mentionedJid || [];
    const quotedParticipant = ctxInfo.participant;
    let targetJid = null;

    if (mentioned.length > 0) {
      targetJid = mentioned[0];
    } else if (quotedParticipant) {
      targetJid = quotedParticipant;
    } else if (args.length > 0) {
      let num = args[0].replace(/[^0-9]/g, "");
      if (!num) return reply("❌ Harap sebutkan target yang ingin dikick.");
      targetJid = `${num}@s.whatsapp.net`;
    } else {
      return reply("❌ Harap sebutkan target yang ingin dikick (mention / reply / nomor).");
    }

    // ambil metadata grup
    const metadata = await sock.groupMetadata(from);

    // cek apakah bot admin
    const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
    const botData = metadata.participants.find(p => p.jid === botId);
    const botIsAdmin = botData?.admin === "admin" || botData?.admin === "superadmin";

    if (!botIsAdmin) return reply("❌ Bot bukan admin di grup ini.");

    // cek apakah target ada di grup
    const targetExists = metadata.participants.some(p => p.id === targetJid);
    if (!targetExists) return reply("❌ Target tidak ditemukan di grup.");

    // lakukan kick
    await sock.groupParticipantsUpdate(from, [targetJid], "remove");
    reply(`✅ Berhasil mengeluarkan: @${targetJid.split("@")[0]}`, { mentions: [targetJid] });

  } catch (e) {
    console.error("Kick error:", e);
    reply("❌ Terjadi kesalahan saat mencoba mengeluarkan member.");
  }
}