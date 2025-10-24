# 🤖 WhatsApp Selfbot

Lightweight WhatsApp selfbot menggunakan Baileys dengan arsitektur modular dan plugin system.

## ✨ Features

- 🔌 **Plugin System** - Modular plugin architecture untuk extensibility
- 🗑️ **Anti-Delete & Anti-Edit** - Deteksi dan backup pesan yang dihapus/diedit
- 💾 **Message Store** - Persistent message storage dengan auto-save
- 👥 **Group Cache** - Intelligent caching untuk group metadata
- 🧹 **Session Cleaner** - Automatic session cleanup untuk menghemat storage
- 📊 **Detailed Logging** - Comprehensive message logging dengan colors
- 🔐 **Pairing Code** - QR-less authentication
- ⚡ **Eval & Exec** - Built-in code evaluation dan shell execution

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/ikyyyofc/selfbot
cd selfbot

# Install dependencies
npm install

# Start bot
npm start
```

## 🔧 Configuration

Edit `config.js` untuk mengkonfigurasi bot:

```javascript
export default {
    SESSION: "session",                  // Session folder name
    PAIRING_CODE: "IKYYSELF",           // Pairing code prefix
    PREFIX: [".", "!", "/"],            // Command prefixes
    BOT_NAME: "IKYY",                   // Bot name
    OWNER_NAME: "IKYYOFC",              // Owner name
    SESSION_CLEANUP_INTERVAL: 1,        // Cleanup interval (hours)
    SESSION_MAX_SIZE_MB: 3              // Max session size (MB)
};
```

## 🚀 Usage

### First Time Setup

1. Jalankan bot dengan `npm start`
2. Masukkan nomor WhatsApp (format: 628xxx)
3. Dapatkan pairing code
4. Masukkan code di WhatsApp (Linked Devices)
5. Bot siap digunakan!

### Command System

Bot hanya merespon pesan dari diri sendiri (self mode):
- **Private chat**: Semua pesan dari diri sendiri diproses
- **Group chat**: Hanya pesan dari diri sendiri yang diproses

### Built-in Commands

#### Eval (Code Execution)
```javascript
// Execute code
> console.log("Hello World")

// Execute with return
=> 2 + 2
```

Available variables dalam eval:
- `sock` - WhatsApp socket instance
- `m` - Current message object
- `plugins` - Plugin map
- `config` - Bot configuration
- `fs`, `path`, `util`, `colors` - Node.js modules
- `loadPlugins()` - Reload all plugins
- `messageStore` - Message store instance

#### Exec (Shell Commands)
```bash
$ ls -la
$ npm install package-name
$ git pull
```

## 🔌 Creating Plugins

Buat file baru di folder `plugins/` dengan format ESM:

```javascript
export default async function ({ sock, m, args, text, reply, fileBuffer }) {
    // Plugin logic here
    await reply("Hello from plugin!");
}
```

### Plugin Context

Setiap plugin menerima context object:

```javascript
{
    sock,           // WhatsApp socket
    chat,           // Chat ID
    from,           // Alias for chat
    args,           // Command arguments (array)
    text,           // Full text after command
    m,              // Serialized message object
    fileBuffer,     // Media buffer (if any)
    isGroup,        // Is group chat
    sender,         // Sender JID
    groupCache,     // Group cache instance
    reply           // Reply function
}
```

### Example Plugin: Ping

```javascript
// plugins/ping.js
export default async function ({ reply }) {
    const start = Date.now();
    await reply(`Pong! ${Date.now() - start}ms`);
}
```

Usage: `.ping`

### Example Plugin: Sticker

```javascript
// plugins/sticker.js
export default async function ({ sock, m, fileBuffer, reply }) {
    if (!fileBuffer) {
        return await reply("Reply/kirim gambar dengan caption .sticker");
    }

    await sock.sendMessage(m.chat, {
        sticker: fileBuffer
    });
}
```

Usage: `.sticker` (reply to image/video)



## 🛡️ Session Cleaner

Session cleaner secara otomatis membersihkan file-file temporary di folder session untuk menghemat storage.

### Protected Files (Tidak Dihapus)

- `creds.json` - Account credentials
- `app-state-sync-key-*.json` - Encryption keys
- `message_store.json` - Message store

### Konfigurasi

```javascript
SESSION_CLEANUP_INTERVAL: 1,    // Cleanup setiap 1 jam
SESSION_MAX_SIZE_MB: 3          // Cleanup jika > 3MB
```

### Manual Cleanup

```javascript
// Via eval
> sessionCleaner.manualCleanup()
```

## 🗑️ Anti-Delete & Anti-Edit

Bot otomatis mendeteksi pesan yang dihapus atau diedit di private chat:

### Features
- ✅ Deteksi pesan dihapus
- ✅ Deteksi pesan diedit
- ✅ Simpan history edit
- ✅ Resend media yang dihapus
- ✅ Timestamp lengkap

**Note**: Hanya bekerja untuk private chat (non-group)

## 👥 Group Cache

Intelligent caching system untuk group metadata:

```javascript
// Via socket extensions
await sock.getGroupMetadata(jid)
await sock.getGroupParticipants(jid)
await sock.getGroupAdmins(jid)
await sock.isGroupAdmin(jid, userJid)

// Via groupCache
groupCache.get(jid)
groupCache.getAdmins(jid)
groupCache.isAdmin(jid, userJid)
```

### Cache Statistics

```javascript
// Via eval
> groupCache.logStats()
```

## 🔧 Socket Extensions

Bot menambahkan helper functions pada socket:

```javascript
// Group operations
await sock.getGroupMetadata(jid)
await sock.getGroupParticipants(jid)
await sock.getGroupAdmins(jid)
await sock.isGroupAdmin(jid, userJid)
await sock.groupAdd(jid, [participant])
await sock.groupRemove(jid, [participant])
await sock.groupPromote(jid, [participant])
await sock.groupDemote(jid, [participant])
await sock.updateGroupSubject(jid, subject)
await sock.updateGroupDescription(jid, desc)
await sock.updateGroupSettings(jid, adminsOnly)
await sock.leaveGroup(jid)

// Participant helpers
await sock.getJidParticipants(jid, id)
await sock.getLidParticipants(jid, id)
```

## 📝 Message Serialization

Setiap message diserialisasi dengan properties tambahan:

```javascript
m.isGroup       // Is group chat
m.isStatus      // Is WhatsApp status
m.isChannel     // Is channel message
m.chat          // Chat ID
m.from          // Alias for chat
m.sender        // Sender JID
m.fromMe        // Is from self
m.text          // Message text
m.quoted        // Quoted message (if any)
m.mentions      // Mentioned users
m.isMedia       // Is media message
m.download()    // Download media
m.reply(text)   // Reply to message
m.react(emoji)  // React to message
```

## 🎨 Utilities

### File Upload
```javascript
import upload from "./lib/upload.js";

const url = await upload(buffer);
```

## 🔒 Security Notes

- Bot berjalan dalam mode **SELFBOT** (hanya merespon diri sendiri)
- Eval & Exec commands sangat powerful - gunakan dengan hati-hati
- Jangan share `session/` folder ke orang lain
- Protected files tidak akan terhapus oleh session cleaner

## 📊 Logging

Bot menggunakan colored logging untuk visibility:

- 🤖 Cyan: System messages
- ✅ Green: Success operations
- ❌ Red: Errors
- ⚠️ Yellow: Warnings
- 📨 Incoming messages dengan detail lengkap

## 🚨 Troubleshooting

### Bot tidak merespon
- Pastikan command dimulai dengan prefix yang benar
- Pastikan pesan dikirim dari akun sendiri (self mode)
- Check console untuk error messages

### Session error
- Hapus folder `session/` dan login ulang
- Pastikan koneksi internet stabil

### Plugin tidak load
- Check syntax error di plugin file
- Reload plugins: `> loadPlugins()`
- Restart bot

## 📜 License

ISC License

## 👤 Author

**IKYYOFC**

## 🙏 Credits

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [@colors/colors](https://github.com/DABH/colors.js) - Terminal colors
- [node-cache](https://github.com/node-cache/node-cache) - Caching solution

---

Made with ❤️ by IKYYOFC