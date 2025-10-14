// plugins/get-pp.js
export default async function ({ sock, from, args, text, m, reply }) {
  try {
    const toJid = num => {
      const cleaned = String(num).replace(/[^0-9+]/g, "");
      let n = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
      if (n.includes("@")) return n;
      return `${n}@s.whatsapp.net`;
    };

    let targets = [];

    const quoted = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedJid = m?.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted && quotedJid) targets.push(quotedJid);

    const mentioned = m?.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (Array.isArray(mentioned) && mentioned.length) targets.push(...mentioned);

    if (args && args.length) {
      const raw = args.join(" ");
      const parts = raw.split(/[,;\s]+/).filter(Boolean);
      for (const p of parts) targets.push(p.includes("@") ? p : toJid(p));
    }

    if (!targets.length) {
      const sender = m?.key?.participant || (m?.key?.fromMe ? m?.key?.remoteJid : from);
      if (sender) targets.push(sender);
    }

    targets = [...new Set(targets)];

    const getProfileUrl = async jid => {
      try {
        if (typeof sock.profilePictureUrl === "function")
          return await sock.profilePictureUrl(jid, "image").catch(() => null);
        if (typeof sock.getProfilePicture === "function")
          return await sock.getProfilePicture(jid).catch(() => null);
        if (typeof sock.fetchProfilePicture === "function")
          return await sock.fetchProfilePicture(jid).catch(() => null);
        return null;
      } catch {
        return null;
      }
    };

    for (const jid of targets) {
      const profileUrl = await getProfileUrl(jid);
      if (!profileUrl) {
        await reply(`❌ Tidak dapat menemukan foto profil untuk: ${jid}`);
        continue;
      }

      await sock.sendMessage(from, { image: { url: profileUrl } });
    }
  } catch (err) {
    console.error("get-pp plugin error:", err);
    await reply("Terjadi error saat mengambil foto profil.");
  }
}