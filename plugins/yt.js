import axios from "axios";

async function ytdlp(type, videoUrl) {
  let command;
  if (type === "audio") command = `-x --audio-format mp3 ${videoUrl}`;
  else if (type === "video") command = `-f 136+140 ${videoUrl}`;
  else throw new Error("Invalid type: use 'audio' or 'video'");

  const encoded = encodeURIComponent(command);
  const res = await axios.get(
    `https://ytdlp.online/stream?command=${encoded}`,
    { responseType: "stream" }
  );

  return new Promise((resolve, reject) => {
    let downloadUrl = null;

    res.data.on("data", chunk => {
      const text = chunk.toString();
      const match = text.match(/href="([^"]+\.(mp3|mp4|m4a|webm))"/i);
      if (match && !downloadUrl) {
        downloadUrl = `https://ytdlp.online${match[1]}`;
        if (res.data.destroy) res.data.destroy();
      }
    });

    res.data.on("end", () => {
      if (!downloadUrl) reject(new Error("Download URL not found"));
      else resolve({ dl: downloadUrl });
    });

    res.data.on("error", reject);
  });
}

function parseMode(s = "") {
  const t = s.toLowerCase();
  if (["audio", "mp3"].includes(t)) return "audio";
  if (["video", "mp4"].includes(t)) return "video";
  return null;
}

export default {
  desc: "YouTube downloader (audio/video) via scrape",
  rules: { limit: 1 },
  async execute(ctx) {
    try {
      const { m, args } = ctx;

      const firstIsMode = parseMode(args[0]);
      const mode = firstIsMode || "video";

      const url =
        (firstIsMode ? args[1] : args[0]) ||
        (m.link && m.link.length ? m.link[0] : null);

      if (!url) {
        await ctx.reply(
          "Usage:\n.yt <audio|video> <url>\n\nContoh:\n.yt video https://youtu.be/xxxx\n.yt audio https://youtu.be/xxxx"
        );
        return;
      }

      await ctx.reply("Processing... bentar ya 😼");

      const { dl } = await ytdlp(mode, url);

      if (mode === "audio") {
        try {
          await ctx.m.reply({
            audio: { url: dl },
            mimetype: "audio/mpeg",
            fileName: "audio.mp3"
          });
        } catch {
          await ctx.reply(`Gagal kirim audio. Link: ${dl}`);
        }
      } else {
        try {
          await ctx.m.reply({
            video: { url: dl },
            mimetype: "video/mp4",
            caption: "Done ✅"
          });
        } catch {
          await ctx.reply(`Gagal kirim video. Link: ${dl}`);
        }
      }
    } catch (e) {
      await ctx.reply(`❌ ${e.message || e}`);
    }
  }
};