async function postData(input) {
 const urlApi = "https://tikwm.com/api/";
 const bodyData = `url=${input}`;

 try {
 const response = await fetch(urlApi, {
 method: "post",
 headers: {
 "content-type": "application/x-www-form-urlencoded"
 },
 body: bodyData
 });

 if (!response.ok) {
 throw new Error(`http error status: ${response.status}`);
 }

 const data = await response.json();
 return data;
 } catch (error) {
 console.error("gagal melakukan fetch:", error);
 throw error;
 }
}

export default {
 async execute({ sock, m, text }) {
 const tiktokRegex =
 /(https?:\/\/(?:www\.)?tiktok\.com\/[^\s]+|https?:\/\/vt\.tiktok\.com\/[^\s]+)/;
 const match = text.match(tiktokRegex);

 if (!match) {
 return true;
 }

 const url = match[0];

 try {
 await m.react("⏳");
 const result = await postData(url);

 if (result.code !== 0 || !result.data) {
 return m.react("❌");
 }

 const data = result.data;
 const { title, author } = data;
 const username = author?.unique_id
 ? `@${author.unique_id}`
 : "unknown";

 if (data.images && Array.isArray(data.images)) {
 let allImg = data.images.map(img => ({ image: { url: img } }));
 await sock.sendAlbumMessage(m.chat, allImg, m);
 if (data.play) {
 await sock.sendMessage(m.chat, {
 audio: { url: data.play },
 mimetype: "audio/mpeg"
 });
 }
 } else if (data.play) {
 await sock.sendMessage(
 m.chat,
 {
 video: { url: data.play },
 caption: `${username} - ${title}`
 },
 { quoted: m }
 );
 } else {
 return m.react("❓");
 }

 await m.react("✅");
 } catch (error) {
 console.error(error);
 await m.react("🚨");
 }

 return false;
 }
};