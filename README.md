```markdown
# 🤖 Lightweight WhatsApp Bot

Bot WhatsApp minimalis berbasis Baileys dengan arsitektur modular dan sistem hot-reload otomatis.

## ✨ Fitur Utama

- 🔥 **Hot Reload** - Auto-reload semua file tanpa restart
- 🧩 **Plugin System** - Modular & mudah dikembangkan
- 💾 **SQLite Auth** - Session storage ringan
- 📊 **Real-time Monitor** - Dashboard web interaktif
- ⚡ **Queue System** - Handle pesan dengan priority
- 🗃️ **Group Cache** - Caching metadata grup otomatis
- 🎯 **Self/Public Mode** - Fleksibel mode operasi
- 📱 **Pairing Code** - Login tanpa scan QR

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Setup Environment
Buat file `.env`:
```env
mode=self
```

### Jalankan Bot
```bash
npm start
```

Masukkan nomor WhatsApp saat diminta pairing code.

### Monitor Dashboard
Akses dashboard di `http://localhost:8000/monitor`

## 📁 Struktur Project

```
├── bot.js                  # Entry point bot
├── index.js                # Process manager
├── config.js               # Konfigurasi global
├── server.js               # Monitor server
├── lib/
│   ├── BotState.js         # State management
│   ├── ConnectionManager.js # Connection handler
│   ├── MessageHandler.js   # Message processor
│   ├── PluginManager.js    # Plugin loader
│   ├── PluginHandler.js    # Plugin executor
│   ├── HotReload.js        # Auto-reload watcher
│   ├── serialize.js        # Message serializer
│   ├── socket.js           # Socket extensions
│   ├── groupCache.js       # Group metadata cache
│   ├── messageLogger.js    # Message logger
│   ├── CooldownManager.js  # Cooldown handler
│   ├── TimeHelper.js       # Time utilities
│   ├── sqliteAuthState.js  # Auth storage
│   ├── button.js           # Interactive buttons
│   ├── gemini.js           # Gemini AI
│   └── upload.js           # File uploader
└── plugins/                # Plugin directory
```

## 🔌 Membuat Plugin

### Command Plugin
File: `plugins/ping.js`
```javascript
export default {
    rules: {
        owner: false,
        group: false,
        private: false,
        admin: false
    },
    async execute({ m, reply }) {
        await reply('Pong! 🏓');
    }
};
```

### Listener Plugin
File: `plugins/___autoReply.js` (awali dengan `___`)
```javascript
export default {
    async execute({ m, text, reply }) {
        if (text.includes('halo')) {
            await reply('Halo juga!');
            return false; // stop processing
        }
        return true; // lanjut ke plugin lain
    }
};
```

## ⚙️ Konfigurasi

Edit `config.js`:

```javascript
export default {
    SESSION_DB: "./session.db",
    PAIRING_CODE: "IKYYSELF",
    PREFIX: [".", "!", "/", "-", "😹"],
    BOT_NAME: "IKYY",
    OWNER_NAME: "IKYYOFC",
    OWNER_NUMBER: "628xxx",
    BOT_MODE: "self", // "self" atau "public"
    AUTO_REACT_NUMBERS: ["628xxx"]
};
```

## 🛠️ Plugin Rules

```javascript
rules: {
    owner: true,    // khusus owner
    group: true,    // khusus grup
    private: true,  // khusus private chat
    admin: true     // khusus admin grup
}
```

## 💻 Owner Commands

### Eval
```javascript
> console.log('test')
=> 1 + 1
```

### Exec
```bash
$ ls -la
```

## 🔄 Hot Reload

Perubahan otomatis terdeteksi di:
- `plugins/` - Plugin auto-reload
- `lib/` - Library auto-reload
- `config.js` - Config auto-reload
- `.env` - Environment auto-reload

## 📊 Monitor Features

- Real-time message stats
- Command execution tracking
- Memory usage monitoring
- Live message feed
- Activity graph
- WebSocket updates

## 🎨 Context API

Tersedia di setiap plugin:

```javascript
{
    sock,              // Socket instance
    m,                 // Serialized message
    chat,              // Chat JID
    from,              // Same as chat
    args,              // Command arguments
    text,              // Full text
    sender,            // Sender JID
    isGroup,           // Boolean
    groupCache,        // Group cache instance
    state,             // Bot state
    reply,             // Reply function
    getFile            // Download media
}
```

## 🔧 Socket Extensions

```javascript
// Group management
await sock.getGroupMetadata(jid)
await sock.getGroupParticipants(jid)
await sock.getGroupAdmins(jid)
await sock.isGroupAdmin(jid, userJid)
await sock.groupAdd(jid, [participants])
await sock.groupRemove(jid, [participants])
await sock.groupPromote(jid, [participants])
await sock.groupDemote(jid, [participants])
await sock.updateGroupSubject(jid, subject)
await sock.updateGroupDescription(jid, desc)
await sock.updateGroupSettings(jid, adminsOnly)
await sock.leaveGroup(jid)

// Interactive messages
await sock.sendButtons(jid, {
    text: 'Choose option',
    buttons: [
        { id: 'opt1', text: 'Option 1' },
        { id: 'opt2', text: 'Option 2' }
    ],
    footer: 'Footer text'
})

// Album
await sock.sendAlbumMessage(jid, [
    { image: buffer1 },
    { image: buffer2 }
], quoted)
```

## 🗂️ Database

SQLite session storage di `session.db`:
- Authentication credentials
- Keys storage
- Auto-managed

## 📦 Dependencies

Core:
- `@whiskeysockets/baileys` - WhatsApp library
- `better-sqlite3` - Session storage
- `chokidar` - File watcher

Utilities:
- `axios` - HTTP client
- `cheerio` - HTML parser
- `file-type` - File detection
- `sharp` - Image processing

## 🐛 Debugging

Set verbose logging:
```env
LOG_VERBOSE=true
```

Disable hot reload:
```env
HOT_RELOAD=false
```

## 📝 License

ISC

## 👤 Author

IKYYOFC

---

**Note:** Bot ini didesain minimalis tapi powerful. Semua fitur essential tersedia dengan kode yang clean dan mudah dikembangkan.
```