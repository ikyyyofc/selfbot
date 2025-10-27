```markdown
# WhatsApp Self-Bot

A lightweight, efficient WhatsApp self-bot built with Baileys. Features smart caching, anti-delete/edit detection, automatic session management, and modular plugin system.

## Features

- 🚀 **Lightweight & Fast** - Optimized for performance with minimal dependencies
- 🔌 **Plugin System** - Easy-to-use modular plugin architecture
- 💾 **Smart Caching** - Group metadata caching to reduce API calls
- 🗑️ **Anti-Delete/Edit** - Detects and logs deleted/edited messages
- 🧹 **Auto Session Cleanup** - Automatic session folder management
- 📝 **Message Store** - Persistent message storage with edit history
- ⚡ **Code Execution** - Built-in eval and exec commands
- 🔐 **Pairing Code** - Easy authentication via pairing code
- 📊 **Detailed Logging** - Comprehensive message and system logging

## Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ikyyyofc/selfbot.git
cd selfbot
```

2. Install dependencies:
```bash
npm install
```

3. Configure the bot (optional):
Edit `config.js` to customize settings:
```javascript
export default {
    SESSION: "session",           // Session directory
    PAIRING_CODE: "IKYYSELF",    // Pairing code prefix
    PREFIX: [".", "!", "/"],      // Command prefixes
    BOT_NAME: "IKYY",            // Bot name
    OWNER_NAME: "IKYYOFC",       // Owner name
    SESSION_CLEANUP_INTERVAL: 1,  // Cleanup interval (hours)
    SESSION_MAX_SIZE_MB: 3       // Max session size (MB)
};
```

4. Start the bot:
```bash
npm start
```

5. Enter your WhatsApp number when prompted:
```
📱 Enter WhatsApp number (example: 628123456789): 
```

6. Scan the pairing code in WhatsApp:
- Open WhatsApp > Settings > Linked Devices
- Link a Device > Enter code manually
- Enter the displayed pairing code

## Project Structure

```
.
├── bot.js                      # Main bot initialization
├── index.js                    # Process manager
├── config.js                   # Configuration
├── lib/
│   ├── AntiDeleteEditHandler.js  # Anti-delete/edit logic
│   ├── BotState.js               # State management
│   ├── ConnectionManager.js      # Connection handling
│   ├── MessageHandler.js         # Message processing
│   ├── PluginManager.js          # Plugin system
│   ├── SessionCleaner.js         # Session management
│   ├── groupCache.js             # Group metadata cache
│   ├── messageLogger.js          # Message logging
│   ├── serialize.js              # Message serialization
│   ├── socket.js                 # Socket extensions
│   ├── gemini.js                 # AI integration
│   └── upload.js                 # File upload utility
├── plugins/                    # Plugin directory
│   ├── ping.js
│   ├── sticker.js
│   └── ...
└── session/                    # Session data (auto-created)
```

## Built-in Commands

### Code Execution

**Eval (JavaScript):**
```
> console.log("Hello World")
```

**Eval with Return:**
```
=> 1 + 1
```

**Shell Execution:**
```
$ ls -la
```

### Plugin Commands

Commands use configured prefixes (default: `.`, `!`, `/`)

**Ping:**
```
.ping
```

**Create Sticker:**
```
.sticker
# Reply to image/video/gif
```

## Creating Plugins

Create a new file in `plugins/` directory:

```javascript
// plugins/hello.js
export default async ({ sock, m, args, text, reply }) => {
    const name = text || "World";
    await reply(`Hello, ${name}!`);
};
```

Usage:
```
.hello John
```

### Plugin Context API

Available parameters in plugin functions:

```javascript
{
    sock,           // WhatsApp socket
    m,              // Serialized message object
    chat,           // Chat ID
    from,           // From ID
    args,           // Command arguments array
    text,           // Full text after command
    fileBuffer,     // Media buffer (if message contains media)
    isGroup,        // Boolean: is group chat
    sender,         // Sender JID
    groupCache,     // Group cache utility
    reply           // Quick reply function
}
```

### Message Object (m)

```javascript
{
    key: {
        remoteJid,      // Chat ID
        fromMe,         // Boolean
        id,             // Message ID
        participant     // Participant JID (group only)
    },
    message,            // Raw message object
    messageTimestamp,   // Unix timestamp
    pushName,           // Sender name
    text,               // Message text
    sender,             // Sender JID
    isGroup,            // Boolean
    isStatus,           // Boolean
    isChannel,          // Boolean
    quoted,             // Quoted message object
    isMedia,            // Boolean
    type,               // Message type
    mentions,           // Array of mentioned JIDs
    
    // Methods
    reply(text),        // Reply to message
    react(emoji),       // React to message
    download()          // Download media
}
```

### Socket Extensions

Custom socket methods:

```javascript
// Get group metadata (cached)
await sock.getGroupMetadata(jid);

// Get group participants (cached)
await sock.getGroupParticipants(jid);

// Get participant JID by participant ID
await sock.getJidParticipants(jid, participantId);

// Get group admins (cached)
await sock.getGroupAdmins(jid);

// Check if user is admin (cached)
await sock.isGroupAdmin(jid, userJid);

// Add participants
await sock.groupAdd(jid, [participant1, participant2]);

// Remove participants
await sock.groupRemove(jid, [participant1, participant2]);

// Promote to admin
await sock.groupPromote(jid, [participant1]);

// Demote from admin
await sock.groupDemote(jid, [participant1]);

// Update group subject
await sock.updateGroupSubject(jid, "New Subject");

// Update group description
await sock.updateGroupDescription(jid, "New Description");

// Leave group
await sock.leaveGroup(jid);

// Update group settings (admins only / all participants)
await sock.updateGroupSettings(jid, true); // true = admins only
```

## Advanced Features

### Anti-Delete/Edit Detection

Automatically detects and logs:
- Deleted messages (text, media, stickers)
- Edited messages with history
- Works in private chats only
- Resends deleted media

### Session Cleaner

Automatic session management:
- Runs every configured interval
- Deletes non-essential files
- Protects important files (creds.json, keys, message store)
- Configurable size limit
- Manual cleanup available

View stats:
```javascript
> sessionCleaner.logStats()
```

Manual cleanup:
```javascript
> await sessionCleaner.manualCleanup()
```

### Group Cache

Smart caching system:
- Reduces API calls to WhatsApp servers
- Auto-updates on participant changes
- Configurable TTL (default: 10 minutes)
- Cache statistics tracking

View cache stats:
```javascript
> groupCache.logStats()
```

### Message Store

Persistent message storage:
- Stores last 1000 messages
- Tracks edit history
- Auto-saves every 10 messages
- Saved to `session/message_store.json`

## Configuration Options

### config.js

```javascript
{
    SESSION: "session",              // Session directory name
    PAIRING_CODE: "IKYYSELF",       // Pairing code prefix
    PREFIX: [".", "!", "/"],         // Command prefixes (array)
    BOT_NAME: "IKYY",               // Bot display name
    OWNER_NAME: "IKYYOFC",          // Owner display name
    SESSION_CLEANUP_INTERVAL: 1,     // Hours between cleanups
    SESSION_MAX_SIZE_MB: 3          // Max cleanable size (MB)
}
```

### Session Cleaner Settings

Modify in `lib/SessionCleaner.js`:

```javascript
this.config = {
    intervalHours: 6,               // Cleanup interval
    maxSizeMB: 500,                 // Max cleanable size
    protectedFiles: [               // Files to protect
        "creds.json",
        "app-state-sync-key-*.json",
        "message_store.json"
    ]
};
```

### Cache Settings

Modify in `lib/groupCache.js`:

```javascript
this.cache = new NodeCache({
    stdTTL: 600,        // 10 minutes TTL
    checkperiod: 120,   // Check every 2 minutes
    useClones: false    // Better performance
});
```

## Utilities

### File Upload

```javascript
import upload from "./lib/upload.js";

const url = await upload(buffer);
```

### Gemini AI

```javascript
import chat from "./lib/gemini.js";

const response = await chat([
    { role: "user", content: "Hello!" }
], fileBuffer);
```

## Troubleshooting

### Connection Issues

1. Delete session folder and reconnect:
```bash
rm -rf session/
npm start
```

2. Check Node.js version:
```bash
node --version  # Should be 18.x or higher
```

### Plugin Not Working

1. Check plugin file name matches command
2. Verify plugin exports default function
3. Check console for error messages
4. Reload plugins:
```javascript
> await loadPlugins()
```

### High Memory Usage

1. Reduce message store limit in `lib/BotState.js`
2. Lower cache TTL in `lib/groupCache.js`
3. Reduce session max size in `config.js`

### Session Errors

1. Check session folder permissions
2. Verify credentials are not corrupted
3. Try manual cleanup:
```javascript
> await sessionCleaner.manualCleanup()
```

## Performance Tips

1. **Use Cache**: Always use cached methods for group data
2. **Limit Media**: Don't store large media files unnecessarily
3. **Clean Sessions**: Run cleanup regularly
4. **Optimize Plugins**: Keep plugins lightweight and async
5. **Monitor Logs**: Watch for performance warnings

## Security Notes

- ⚠️ Never share your `session/` folder
- ⚠️ Keep `creds.json` secure
- ⚠️ Don't run untrusted plugins
- ⚠️ Be careful with eval/exec commands
- ⚠️ Don't expose your pairing code

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

This project is licensed under the ISC License.

## Credits

- Built with [Baileys](https://github.com/WhiskeySockets/Baileys)
- Developed by [IKYYOFC](https://github.com/ikyyyofc)

## Disclaimer

This bot is for educational purposes only. Use at your own risk. The developers are not responsible for any misuse or violations of WhatsApp's Terms of Service.

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues first
- Provide detailed information (logs, error messages, steps to reproduce)

---

**Made with ❤️ by IKYYOFC**
```