// ai-edit-image.js
import upload from '../lib/upload.js'; // pastikan path benar
// jika environment-mu tidak support import, ubah ke require:
// const upload = require('../lib/upload.js');

export default async function ({ sock, from, args, text, m, fileBuffer, reply }) {
  // text berisi prompt (wrapper menyediakan text = args.join(" "))
  const prompt = (text || '').trim();

  try {
    // 1) cek ada media
    if (!fileBuffer) {
      return await reply(
        'Gagal: tidak ada gambar.\nCara pakai: balas sebuah gambar atau kirim gambar bersama caption/pesan yang berisi prompt.\nContoh: kirim gambar lalu tulis "ubah jadi gaya kartun" sebagai caption atau reply.'
      );
    }

    // 2) upload fileBuffer ke host (../lib/upload.js) -> harus mengembalikan URL string
    let imageUrl;
    try {
      imageUrl = await upload(fileBuffer);
    } catch (e) {
      console.error('Upload error:', e);
      return await reply('Gagal meng-upload gambar ke host. Cek konfigurasi ../lib/upload.js');
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return await reply('Upload gagal: modul upload tidak mengembalikan URL string.');
    }

    // 3) panggil API nano-banana dengan prompt & imageUrl
    const apiBase = 'https://api.nekolabs.my.id/ai/gemini/nano-banana';
    const apiUrl = `${apiBase}?prompt=${encodeURIComponent(prompt)}&imageUrl=${encodeURIComponent(imageUrl)}`;

    let apiRes;
    try {
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      apiRes = await res.json();
    } catch (e) {
      console.error('API request error:', e);
      return await reply('Gagal memanggil API edit gambar. Cek koneksi atau endpoint API.');
    }

    // 4) tangani response
    // contoh respon yang kamu berikan:
    // { "success": true, "result": "url hasil" }
    if (!apiRes || apiRes.success !== true || !apiRes.result) {
      console.error('API returned unexpected:', apiRes);
      const pretty = JSON.stringify(apiRes, null, 2);
      return await reply(`API mengembalikan hasil yang tidak diharapkan:\n${pretty}`);
    }

    const resultUrl = apiRes.result;

    // 5) kirim hasil ke pengguna: coba kirim sebagai gambar via URL (WhatsApp mendukung fetch dari url)
    try {
      await reply({
        image: { url: resultUrl },
        caption: `Selesai — hasil edit (prompt: ${prompt || '-'})`
      });
      return;
    } catch (e) {
      // jika kirim sebagai image gagal, kirim link sebagai fallback
      console.warn('Gagal mengirim image message, fallback ke teks. error:', e);
      await reply(`Hasil telah diproses, tapi gagal mengirim gambar langsung.\nLink hasil: ${resultUrl}`);
      return;
    }
  } catch (err) {
    console.error('Unexpected error in ai-edit-image plugin:', err);
    await reply('Terjadi error saat memproses permintaan. Cek logs pada server.');
  }
}