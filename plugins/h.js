// plugins/hidetag.js
export default async function ({ sock, from, args, text, m, isGroup, reply, fileBuffer }) {
  try {
    if (!isGroup) return await reply('❌ Perintah ini hanya bisa dipakai di grup.');

    // Ambil metadata grup untuk daftar peserta
    const metadata = await sock.groupMetadata(from);
    const participants = (metadata?.participants || []).map(p => p.id);

    if (!participants.length) return await reply('❌ Tidak menemukan peserta grup.');

    // Cek apakah ada pesan yang dikutip (quoted)
    const quoted =
      m?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;

    // Pesan yang ingin dikirim (jika user menuliskan teks setelah perintah)
    const bodyText = text?.trim() || " ";

    // Fungsi bantu untuk mengirim pesan dengan mentions
    const sendWithMentions = async (msg) => {
      await sock.sendMessage(from, { ...msg, mentions: participants }, { quoted: m });
    };

    // Jika ada quoted message, coba kirim ulang jenis media yang sesuai
    if (quoted) {
      // IMAGE
      if (quoted.imageMessage) {
        return await sendWithMentions({ image: fileBuffer || quoted.imageMessage, caption: bodyText });
      }

      // VIDEO
      if (quoted.videoMessage) {
        return await sendWithMentions({ video: fileBuffer || quoted.videoMessage, caption: bodyText });
      }

      // STICKER
      if (quoted.stickerMessage) {
        return await sendWithMentions({ sticker: fileBuffer || quoted.stickerMessage });
      }

      // AUDIO
      if (quoted.audioMessage) {
        return await sendWithMentions({ audio: fileBuffer || quoted.audioMessage, mimetype: 'audio/mp4' });
      }

      // DOCUMENT
      if (quoted.documentMessage) {
        const doc = quoted.documentMessage;
        return await sendWithMentions({
          document: fileBuffer || doc,
          fileName: doc.fileName || 'file',
          mimetype: doc.mimetype || 'application/octet-stream',
          caption: bodyText
        });
      }

      // Jika quoted cuma teks, kirim teks dengan mention
      const quotedText =
        quoted?.conversation || quoted?.extendedTextMessage?.text || bodyText;
      return await sendWithMentions({ text: quotedText });
    }

    // Jika tidak ada quoted, kirim teks biasa dengan mention
    if (!fileBuffer) {
      return await sendWithMentions({ text: bodyText });
    }

    // Jika ada fileBuffer (media) di message saat ini, kirim sesuai tipe pesan saat ini
    // coba deteksi tipe lewat isi m.message
    const currentMsg = m?.message || {};
    if (currentMsg.imageMessage) {
      return await sendWithMentions({ image: fileBuffer, caption: bodyText });
    }
    if (currentMsg.videoMessage) {
      return await sendWithMentions({ video: fileBuffer, caption: bodyText });
    }
    if (currentMsg.stickerMessage) {
      return await sendWithMentions({ sticker: fileBuffer });
    }
    if (currentMsg.documentMessage) {
      const doc = currentMsg.documentMessage;
      return await sendWithMentions({
        document: fileBuffer,
        fileName: doc.fileName || 'file',
        mimetype: doc.mimetype || 'application/octet-stream',
        caption: bodyText
      });
    }

    // Fallback: kirim teks dengan mention
    await sendWithMentions({ text: bodyText });
  } catch (e) {
    console.error('hidetag plugin error:', e);
    await reply('❌ Terjadi kesalahan: ' + (e.message || e.toString()));
  }
}