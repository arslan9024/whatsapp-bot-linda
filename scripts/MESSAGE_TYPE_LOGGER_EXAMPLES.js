/**
 * Message Type Logger - Usage Examples
 * 
 * Shows practical examples of how to use the message type logger
 * in your WhatsApp bot
 */

// ============================================================
// EXAMPLE 1: Basic Usage (Already Enabled by Default)
// ============================================================

import { WhatsAppClient } from 'whatsapp-web.js';
import { logMessageTypeCompact } from './code/utils/messageTypeLogger.js';

const client = new WhatsAppClient();

// This is how it's already set up in WhatsAppClientFunctions.js
client.on('message', msg => {
  // Automatically logs message type
  logMessageTypeCompact(msg);
  
  // Your message handling code here
});


// ============================================================
// EXAMPLE 2: Full Detailed Logging with Metadata
// ============================================================

import { logMessageType } from './code/utils/messageTypeLogger.js';

client.on('message', msg => {
  // Full detailed logging with all metadata
  logMessageType(msg);
  
  // Your message handling code here
});


// ============================================================
// EXAMPLE 3: Conditional Logging Based on Message Type
// ============================================================

import { logMessageTypeCompact } from './code/utils/messageTypeLogger.js';

client.on('message', msg => {
  // Log all messages
  logMessageTypeCompact(msg);
  
  // Special handling for different types
  switch(msg.type) {
    case 'chat':
    case 'text':
      console.log(`📝 Processing text message: "${msg.body}"`);
      break;
      
    case 'image':
      console.log(`🖼️ Processing image - Caption: "${msg.caption || 'No caption'}"`);
      break;
      
    case 'video':
      console.log(`🎥 Processing video - Caption: "${msg.caption || 'No caption'}"`);
      break;
      
    case 'document':
      console.log(`📄 Processing document: ${msg.filename}`);
      break;
      
    case 'audio':
      console.log(`🎵 Processing audio file`);
      break;
      
    case 'ptt':
      console.log(`🎤 Processing voice message`);
      break;
      
    case 'location':
      console.log(`📍 Location received - Lat: ${msg.lat}, Long: ${msg.lng}`);
      break;
      
    default:
      console.log(`❓ Processing message type: ${msg.type}`);
  }
});


// ============================================================
// EXAMPLE 4: Message Statistics Tracking
// ============================================================

import { 
  logMessageTypeCompact, 
  createMessageStats, 
  updateMessageStats, 
  displayMessageStats 
} from './code/utils/messageTypeLogger.js';

// Initialize statistics
const messageStats = createMessageStats();

client.on('message', msg => {
  // Log each message
  logMessageTypeCompact(msg);
  
  // Update statistics
  updateMessageStats(messageStats, msg);
  
  // Your message handling code here
});

// Display statistics every hour
setInterval(() => {
  console.log('\n─'.repeat(50));
  displayMessageStats(messageStats);
  console.log('─'.repeat(50) + '\n');
}, 3600000); // 1 hour


// ============================================================
// EXAMPLE 5: Advanced - Custom Statistics with Grouping
// ============================================================

import { logMessageTypeCompact } from './code/utils/messageTypeLogger.js';

class MessageTracker {
  constructor() {
    this.stats = {
      total: 0,
      byType: {},
      byChat: {},
      byHour: {},
      startTime: new Date()
    };
  }

  track(msg) {
    this.stats.total++;
    
    // Count by type
    const type = msg.type || 'unknown';
    this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;
    
    // Count by chat
    const chatKey = msg.isGroupMsg ? 'groups' : 'direct';
    this.stats.byChat[chatKey] = (this.stats.byChat[chatKey] || 0) + 1;
    
    // Count by hour
    const hour = new Date().getHours();
    this.stats.byHour[hour] = (this.stats.byHour[hour] || 0) + 1;
  }

  report() {
    console.log(`
╔════════════════════════════════════════╗
║       📊 CUSTOM MESSAGE REPORT        ║
├────────────────────────────────────────┤
║ Total Messages: ${String(this.stats.total).padStart(22)} ║
│ Direct Messages: ${String(this.stats.byChat.direct || 0).padStart(20)} ║
║ Group Messages:  ${String(this.stats.byChat.groups || 0).padStart(20)} ║
│ Message Types:
`);
    Object.entries(this.stats.byType).forEach(([type, count]) => {
      console.log(`║   ${type}: ${count}`);
    });
    console.log(`╚════════════════════════════════════════╝
`);
  }
}

const tracker = new MessageTracker();

client.on('message', msg => {
  logMessageTypeCompact(msg);
  tracker.track(msg);
});

// Get report on demand
global.getMessageReport = () => tracker.report();
// Usage: Type "getMessageReport()" in global context


// ============================================================
// EXAMPLE 6: Filtering Messages by Type
// ============================================================

import { logMessageTypeCompact } from './code/utils/messageTypeLogger.js';

const messageFilters = {
  textOnly: (msg) => msg.type === 'chat' || msg.type === 'text',
  mediaOnly: (msg) => ['image', 'video', 'document', 'audio', 'ptt'].includes(msg.type),
  groupsOnly: (msg) => msg.isGroupMsg,
  directOnly: (msg) => !msg.isGroupMsg,
  withQuotes: (msg) => msg.hasQuotedMsg,
  withLinks: (msg) => msg.hasLink
};

client.on('message', msg => {
  logMessageTypeCompact(msg);
  
  // Process only text messages from direct chats
  if (messageFilters.textOnly(msg) && messageFilters.directOnly(msg)) {
    console.log('✅ Processing direct text message');
    // Your handler here
  }
  
  // Process media from groups
  if (messageFilters.mediaOnly(msg) && messageFilters.groupsOnly(msg)) {
    console.log('✅ Processing group media');
    // Your handler here
  }
});


// ============================================================
// EXAMPLE 7: Integration with Existing MessageAnalyzer
// ============================================================

import { logMessageTypeCompact } from './code/utils/messageTypeLogger.js';
import { MessageAnalyzer } from './code/WhatsAppBot/MessageAnalyzer.js';

client.on('message', msg => {
  // Always log message type first
  logMessageTypeCompact(msg);
  
  // Then analyze
  MessageAnalyzer(msg);
});


// ============================================================
// EXAMPLE 8: Detailed Logging Only for Errors/Unusual Types
// ============================================================

import { 
  logMessageTypeCompact, 
  logMessageType,
  getMessageTypeConfig 
} from './code/utils/messageTypeLogger.js';

client.on('message', msg => {
  // Compact logging for normal types
  logMessageTypeCompact(msg);
  
  // Full detailed logging only for unusual types
  const config = getMessageTypeConfig(msg.type);
  const unusualTypes = ['call_log', 'ciphertext', 'revoked', 'reaction', 'interactive'];
  
  if (unusualTypes.includes(msg.type)) {
    console.log('\n⚠️  UNUSUAL MESSAGE TYPE DETECTED:');
    logMessageType(msg);
  }
});


// ============================================================
// EXAMPLE 9: Real-Time Message Dashboard
// ============================================================

import { logMessageTypeCompact } from './code/utils/messageTypeLogger.js';

let lastMessageTime = Date.now();
let messageCountThisMinute = 0;

client.on('message', msg => {
  logMessageTypeCompact(msg);
  
  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTime;
  
  // Reset counter every minute
  if (timeSinceLastMessage > 60000) {
    messageCountThisMinute = 0;
  }
  
  messageCountThisMinute++;
  lastMessageTime = now;
  
  // Display activity level
  const activity = messageCountThisMinute > 10 ? '🔥 HIGH' : 
                   messageCountThisMinute > 5 ? '⚡ NORMAL' : 
                   '😴 LOW';
  console.log(`   Activity Level: ${activity} (${messageCountThisMinute} msgs/min)`);
});


// ============================================================
// EXAMPLE 10: Export Message Logs to File
// ============================================================

import fs from 'fs';
import { logMessageTypeCompact } from './code/utils/messageTypeLogger.js';

const logFile = './message_logs.txt';

function logMessageToFile(msg) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] Type: ${msg.type} | From: ${msg.from} | Body: ${msg.body || '(media)'}\n`;
  
  fs.appendFileSync(logFile, logEntry);
}

client.on('message', msg => {
  // Console logging
  logMessageTypeCompact(msg);
  
  // File logging
  logMessageToFile(msg);
  
  // Your handler here
});


// ============================================================
// HOW TO USE THESE EXAMPLES
// ============================================================

/*
1. Copy the example you want to use
2. Update the import paths as needed
3. Integrate into your message handler
4. Test with real WhatsApp messages
5. Review the terminal output

The message type logger is designed to be:
- Non-intrusive: Works alongside existing code
- Flexible: Use compact or detailed logging
- Powerful: Track statistics and filter by type
- Production-ready: Minimal performance impact

For detailed documentation, see: MESSAGE_TYPE_LOGGER_GUIDE.md
*/

export {
  logMessageTypeCompact,
  logMessageType
};
