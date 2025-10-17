// file: plugins/stiker.js
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { exec } from "child_process";
import util from "util";
import fetch from "node-fetch";
const execAsync = util.promisify(exec);

// fungsi mp4ToWebp
async function mp4ToWebp(file, stickerMetadata) {
  if (stickerMetadata) {
    if (!stickerMetadata.pack) stickerMetadata.pack = "‎";
    if (!stickerMetadata.author) stickerMetadata.author = "‎";
    if (!stickerMetadata.crop) stickerMetadata.crop = false;
  } else if (!stickerMetadata) {
    stickerMetadata = { pack: "‎", author: "‎", crop: false };
  }
  const getBase64 = file.toString("base64");
  const Format = {
    file: `data:video/mp4;base64,${getBase64}`,
    processOptions: {
      crop: stickerMetadata?.crop,
      startTime: "00:00:00.0",
      endTime: "00:00:7.0",
      loop: 0,
    },
    stickerMetadata: { ...stickerMetadata },
    sessionInfo: {
      WA_VERSION: "2.2106.5",
      PAGE_UA:
        "WhatsApp/2.2037.6 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36",
      WA_AUTOMATE_VERSION: "3.6.10 UPDATE AVAILABLE: 3.6.11",
      BROWSER_VERSION: "HeadlessChrome/88.0.4324.190",
      OS: "Windows Server 2016",
      START_TS: 1614310326309,
      NUM: "6247",
      LAUNCH_TIME_MS: 7934,
      PHONE_VERSION: "2.20.205.16",
    },
    config: {
      sessionId: "session",
      headless: true,
      qrTimeout: 20,
      authTimeout: 0,
      cacheEnabled: false,
      useChrome: true,
      killProcessOnBrowserClose: true,
      throwErrorOnTosBlock: false,
      chromiumArgs: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--aggressive-cache-discard",
        "--disable-cache",
        "--disable-application-cache",
        "--disable-offline-load-stale-cache",
        "--disk-cache-size=0",
      ],
      executablePath:
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      skipBrokenMethodsCheck: true,
      stickerServerEndpoint: true,
    },
  };
  const res = await fetch(
    "https://sticker-api.openwa.dev/convertMp4BufferToWebpDataUrl",
    {
      method: "post",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=utf-8",
      },
      body: JSON.stringify(Format),
    }
  );
  return Buffer.from((await res.text()).split(";base64,")[1], "base64");
}

// plugin utama
export default async function ({ sock, from, m, fileBuffer, reply }) {
  try {
    if (!fileBuffer) {
      return reply("Kirim atau balas gambar/video dengan caption *.stiker*");
    }

    const mime = m.message?.imageMessage
      ? "image"
      : m.message?.videoMessage
      ? "video"
      : null;

    if (!mime) return reply("File tidak dikenali sebagai gambar/video.");

    if (mime === "image") {
      // buat stiker dari gambar
      const inputPath = join(tmpdir(), `input_${Date.now()}.jpg`);
      const outputPath = join(tmpdir(), `stiker_${Date.now()}.webp`);
      writeFileSync(inputPath, fileBuffer);

      await execAsync(
        `ffmpeg -i ${inputPath} -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white" -loop 0 ${outputPath}`
      );

      const fs = await import("fs");
      const stikerBuffer = fs.readFileSync(outputPath);
      await sock.sendMessage(from, { sticker: stikerBuffer }, { quoted: m });
    } else if (mime === "video") {
      // buat stiker dari video (pakai mp4ToWebp)
      const webpBuffer = await mp4ToWebp(fileBuffer, {
        pack: "BotStiker",
        author: "StickerBot",
      });
      await sock.sendMessage(from, { sticker: webpBuffer }, { quoted: m });
    }
  } catch (err) {
    console.error(err);
    reply("❌ Gagal membuat stiker. Pastikan kirim gambar/video yang valid.");
  }
}