// file: plugins/___autoreact.js

export default {
  async execute({ m }) {
    // daftar nomor yg mau direact otomatis
    // masukin nomornya aja gausah pake '+' atau spasi
    const targetNumbers = [
      '37360197440',
      // kalo mau nambah nomor lagi tinggal taruh sini
      // '628123456789' 
    ];

    const senderNumber = m.sender.split('@')[0];

    // cek kalo nomor pengirim ada di daftar
    if (targetNumbers.includes(senderNumber)) {
      try {
        await m.react('😂');
      } catch (e) {
        console.log(`gagal react ke ${m.sender}: ${e.message}`);
      }
    }
    
    // jangan return false biar ga ganggu plugin lain
    return true;
  }
};