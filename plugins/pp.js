// plugins/get-pp.js
// ESM plugin for "get profile picture" (pp) — usage: !pp <number>
// supports: reply, tag/mention, number input
export default async function ({ sock, from, args, text, m, reply }) {
  try {
    // helper: format number -> jid
    const toJid = num => {
      // basic cleaning: remove non-digits, keep leading +
      const cleaned = String(num).replace(/[^0-9+]/g, "");
      // if begins with +, remove it for WA jid
      let n = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
      // if includes @, assume user passed full jid
      if (n.includes("@")) return n;
      // ensure minimal length; caller should supply country code if needed
      return `${n}@s.whatsapp.net`;
    };

    // resolve targets in order: reply -> mentions -> args
    let targets = [];

    // 1) if message is reply to another message
    const quoted = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedJid = m?.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted && quotedJid) {
      targets.push(quotedJid);
    }

    // 2) mentions (group tag)
    const mentioned = m?.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (Array.isArray(mentioned) && mentioned.length) {
      targets.push(...mentioned);
    }

    // 3) explicit arg (number or jid)
    if (args && args.length) {
      // join in case user passed like +62812 345 → join to single
      const raw = args.join(" ");
      // allow multiple numbers separated by comma or space
      const parts = raw.split(/[,;\s]+/).filter(Boolean);
      for (const p of parts) {
        // if p already looks like a jid
        if (p.includes("@")) targets.push(p);
        else targets.push(toJid(p));
      }
    }

    // if still empty, default to the user who sent the command
    if (!targets.length) {
      // if group message, reply sender is m.key.participant; otherwise from is the chat jid
      const sender = m?.key?.participant || m?.key?.fromMe ? (m?.key?.remoteJid || from) : (m?.key?.participant || from);
      if (sender) targets.push(sender);
    }

    // dedupe
    targets = [...new Set(targets)];

    // function to obtain profile picture URL using various sock methods (Baileys variants)
    const getProfileUrl = async jid => {
      try {
        // preferred: sock.profilePictureUrl (Baileys v4/v5)
        if (typeof sock.profilePictureUrl === "function") {
          const url = await sock.profilePictureUrl(jid, "image").catch(_ => null);
          if (url) return url;
        }
        // alternative: sock.getProfilePicture
        if (typeof sock.getProfilePicture === "function") {
          const url = await sock.getProfilePicture(jid).catch(_ => null);
          if (url) return url;
        }
        // alternative: sock.profilePicture (some forks)
        if (sock.profilePicture && sock.profilePicture[jid]) {
          return sock.profilePicture[jid];
        }
        // final fallback: try to query with fetchProfilePicture method (some libs)
        if (typeof sock.fetchProfilePicture === "function") {
          const url = await sock.fetchProfilePicture(jid).catch(_ => null);
          if (url) return url;
        }
        return null;
      } catch (e) {
        return null;
      }
    };

    // iterate targets and send images (or an error if not found)
    for (const jid of targets) {
      const profileUrl = await getProfileUrl(jid);
      if (!profileUrl) {
        await reply({
          text: `❌ Tidak dapat menemukan foto profil untuk: ${jid}\nPastikan nomor/jid benar atau user tidak menyembunyikan foto profil.`
        });
        continue;
      }

      // send image by URL (Baileys supports sending { image: { url } })
      try {
        await sock.sendMessage(from, {
          image: { url: profileUrl },
          caption: `📷 Foto profil untuk: ${jid}`
        });
      } catch (err) {
        // fallback: send the url as text if sending image failed
        await reply({
          text: `⚠️ Gagal mengirim gambar untuk ${jid}. URL: ${profileUrl}`
        });
      }
    }
  } catch (err) {
    console.error("get-pp plugin error:", err);
    await reply({ text: "Terjadi error saat mengambil foto profil. Cek logs." });
  }
}