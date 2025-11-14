import { initAuthCreds } from "@whiskeysockets/baileys";
import { randomBytes, randomUUID } from "crypto";
import { phone } from "phone";

const toUrlHex = (buffer) => {
    let id = "";
    buffer.forEach((x) => (id += "%" + x.toString(16).padStart(2, "0").toLowerCase()));
    return id;
};

const toBase64Url = (arg) => Buffer.from(arg).toString("base64url");

const createParams = (params) => {
    const regId = Buffer.alloc(4);
    regId.writeInt32BE(params.registrationId);
    const skeyId = Buffer.alloc(3);
    skeyId.writeInt16BE(params.signedPreKey.keyId);
    params.phoneNumber = params.phoneNumber.replace(params.countryCode, "");
    return {
        cc: params.countryCode.replace("+", ""),
        in: params.phoneNumber,
        lg: "en",
        lc: "GB",
        authkey: toBase64Url(params.noiseKey.public),
        e_regid: toBase64Url(regId),
        e_keytype: "BQ",
        e_ident: toBase64Url(params.signedIdentityKey.public),
        e_skey_id: toBase64Url(skeyId),
        e_skey_val: toBase64Url(params.signedPreKey.keyPair.public),
        e_skey_sig: toBase64Url(params.signedPreKey.signature),
        id: toUrlHex(params.identityId)
    };
};

const check = async (number) => {
    const validatedNumber = phone(`+${number.replace(/\D/g, "")}`);
    if (!validatedNumber.isValid) {
        throw new Error("Nomor tidak valid.");
    }
    
    const creds = {
        ...initAuthCreds(),
        deviceId: toBase64Url(Buffer.from(randomUUID().replace(/-/g, ""), "hex")),
        phoneId: randomUUID(),
        identityId: randomBytes(20),
        backupToken: randomBytes(20),
        countryCode: validatedNumber.countryCode,
        phoneNumber: validatedNumber.phoneNumber
    };

    const params = createParams(creds);
    const parameter = Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&');
    
    let url = `https://v.whatsapp.net/v2/exist?${parameter}`;
    
    const headers = {
        "User-Agent": "WhatsApp/2.25.23.24 iOS/17.5.1 Device/Apple-iPhone_13"
    };

    const response = await fetch(url, { headers });
    return await response.json();
};

export default {
    name: "checkban",
    desc: "Mengecek apakah nomor WhatsApp terbanned.",
    rules: {
        owner: true,
        args: true
    },
    execute: async (context) => {
        const { args, reply } = context;
        const number = args.join("");

        if (!number) {
            return await reply("❌ Masukkan nomor yang ingin dicek.\nContoh: .checkban 6281234567890");
        }

        await reply("⏳ Sedang memeriksa nomor...");

        try {
            const result = await check(number);

            if (result.status === "fail" && result.reason === "blocked") {
                await reply(
                    `🚫 *Nomor Terbanned*\n\n` +
                    `*Nomor:* +${result.login}\n` +
                    `*Alasan:* Pelanggaran tipe ${result.violation_type || "tidak diketahui"}`
                );
            } else if (result.status === "fail" && result.reason === "incorrect") {
                 await reply(
                    `✅ *Nomor Tidak Terbanned*\n\n` +
                    `*Nomor:* +${result.login}\n` +
                    `*Status:* Aktif di WhatsApp.`
                );
            } else {
                 await reply(
                    `🤔 *Status Tidak Diketahui*\n\n` +
                    `*Nomor:* +${result.login || number}\n` +
                    `*Response:* ${JSON.stringify(result, null, 2)}`
                );
            }
        } catch (error) {
            await reply(`❌ Terjadi error: ${error.message}`);
        }
    }
};