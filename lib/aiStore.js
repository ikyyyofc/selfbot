// Nama file: lib/aiStore.js

// Map ini bakal nyimpen history chat AI buat tiap user.
// Key: user JID (e.g., "628123456789@s.whatsapp.net")
// Value: { history: [ ...pesan ], lastMessageId: "..." }
export const aiConversations = new Map();