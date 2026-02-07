/**
 * Message Type Logger Utility
 * Displays message type and details in terminal for every received message
 * 
 * Supports all WhatsApp message types:
 * - text, image, video, document, audio, location, vcard, sticker
 * - call_log, ciphertext, revoked, ptt, reaction, template, interactive
 */

import chalk from 'chalk';

// Map message types to emojis and colors
const messageTypeConfig = {
  'chat': { emoji: '💬', color: 'cyan', label: 'TEXT MESSAGE' },
  'text': { emoji: '💬', color: 'cyan', label: 'TEXT MESSAGE' },
  'image': { emoji: '🖼️', color: 'magenta', label: 'IMAGE' },
  'video': { emoji: '🎥', color: 'magenta', label: 'VIDEO' },
  'document': { emoji: '📄', color: 'yellow', label: 'DOCUMENT' },
  'audio': { emoji: '🎵', color: 'blue', label: 'AUDIO' },
  'ptt': { emoji: '🎤', color: 'blue', label: 'VOICE MESSAGE' },
  'location': { emoji: '📍', color: 'green', label: 'LOCATION' },
  'vcard': { emoji: '👤', color: 'white', label: 'CONTACT' },
  'sticker': { emoji: '🎭', color: 'yellow', label: 'STICKER' },
  'call_log': { emoji: '☎️', color: 'red', label: 'CALL LOG' },
  'reaction': { emoji: '😀', color: 'yellow', label: 'REACTION' },
  'template': { emoji: '📋', color: 'cyan', label: 'TEMPLATE' },
  'interactive': { emoji: '🔘', color: 'magenta', label: 'INTERACTIVE' },
  'ciphertext': { emoji: '🔐', color: 'red', label: 'ENCRYPTED' },
  'revoked': { emoji: '❌', color: 'red', label: 'REVOKED MESSAGE' },
  'unknown': { emoji: '❓', color: 'white', label: 'UNKNOWN TYPE' }
};

/**
 * Get message type configuration
 * @param {string} type - Message type from WhatsApp
 * @returns {Object} Config object with emoji, color, and label
 */
function getMessageTypeConfig(type) {
  return messageTypeConfig[type] || messageTypeConfig['unknown'];
}

/**
 * Format message preview (truncate long messages)
 * @param {string} body - Message body/content
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string} Formatted preview
 */
function formatMessagePreview(body, maxLength = 50) {
  if (!body) return '(no content)';
  if (body.length > maxLength) {
    return body.substring(0, maxLength) + '...';
  }
  return body;
}

/**
 * Get sender info
 * @param {Object} msg - WhatsApp message object
 * @returns {string} Human-readable sender name/number
 */
function getSenderInfo(msg) {
  try {
    const from = msg.from;
    const senderName = msg._data?.notifyName || msg._data?.pushname || 'Unknown';
    return `${senderName} (${from})`;
  } catch (e) {
    return msg.from || 'Unknown sender';
  }
}

/**
 * Get chat info (individual or group)
 * @param {Object} msg - WhatsApp message object
 * @returns {string} Chat type and info
 */
function getChatInfo(msg) {
  try {
    if (msg.isGroupMsg) {
      return `GROUP CHAT - ${msg.from}`;
    } else {
      return 'INDIVIDUAL CHAT';
    }
  } catch (e) {
    return 'UNKNOWN CHAT TYPE';
  }
}

/**
 * Main function to log message type in terminal
 * @param {Object} msg - WhatsApp message object
 */
export function logMessageType(msg) {
  try {
    const messageType = msg.type || 'unknown';
    const config = getMessageTypeConfig(messageType.toLowerCase());
    
    // Build timestamp
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Get message preview
    const preview = formatMessagePreview(msg.body || msg._data?.caption || '(media)');
    
    // Get sender info
    const sender = getSenderInfo(msg);
    
    // Get chat type
    const chatType = getChatInfo(msg);
    
    // Format based on color library availability
    const useChalk = Boolean(chalk);
    
    console.log(`
┌─────────────────────────────────────────────────────────┐
│ ${config.emoji} MESSAGE RECEIVED - ${config.label}
├─────────────────────────────────────────────────────────┤
│ ⏱️  Time:     ${timestamp}
│ 👤 From:     ${sender}
│ 💬 Chat:     ${chatType}
│ 🏷️  Type:     ${messageType.toUpperCase()}
│ 📝 Preview:  ${preview}
│ 🔗 ID:       ${msg.id?.id || msg.id || 'N/A'}
│ ${msg.isStarred ? '⭐' : '  '} Starred:   ${msg.isStarred ? 'YES' : 'NO'}
│ ${msg.hasQuotedMsg ? '↩️' : '  '} Quoted:    ${msg.hasQuotedMsg ? 'YES' : 'NO'}
│ ${msg.hasLink ? '🔗' : '  '} Has Link:  ${msg.hasLink ? 'YES' : 'NO'}
└─────────────────────────────────────────────────────────┘
`);
    
    // Log additional info for special message types
    if (messageType === 'image' || messageType === 'video') {
      console.log(`   📦 Media Info: ${msg.filename || msg.caption || 'No caption'}\n`);
    }
    
    if (messageType === 'document') {
      console.log(`   📎 File: ${msg.filename || msg._data?.filename || 'Unknown file'}\n`);
    }
    
    if (messageType === 'location') {
      console.log(`   📍 Coordinates: Lat=${msg.lat}, Long=${msg.lng}\n`);
    }
    
    if (msg.hasQuotedMsg) {
      console.log(`   ↩️  Replying to previous message\n`);
    }
    
  } catch (error) {
    console.error(`❌ Error logging message type: ${error.message}`);
  }
}

/**
 * Simple compact version of message type logging
 * @param {Object} msg - WhatsApp message object
 */
export function logMessageTypeCompact(msg) {
  try {
    const messageType = msg.type || 'unknown';
    const config = getMessageTypeConfig(messageType.toLowerCase());
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      minute: '2-digit',
      second: '2-digit'
    });
    
    const preview = formatMessagePreview(msg.body || msg._data?.caption || '(media)', 35);
    const chatType = msg.isGroupMsg ? 'GROUP' : 'DIRECT';
    
    console.log(`${config.emoji} [${timestamp}] ${config.label} (${chatType}): ${preview}`);
    
  } catch (error) {
    console.error(`❌ Error logging message type (compact): ${error.message}`);
  }
}

/**
 * Count message statistics
 * @returns {Object} Empty stats object (to be used with accumulator)
 */
export function createMessageStats() {
  return {
    text: 0,
    image: 0,
    video: 0,
    document: 0,
    audio: 0,
    ptt: 0,
    location: 0,
    vcard: 0,
    sticker: 0,
    call_log: 0,
    reaction: 0,
    other: 0,
    total: 0,
    startTime: new Date()
  };
}

/**
 * Update message stats with new message
 * @param {Object} stats - Stats object
 * @param {Object} msg - WhatsApp message object
 * @returns {Object} Updated stats
 */
export function updateMessageStats(stats, msg) {
  const type = msg.type || 'unknown';
  
  if (stats[type] !== undefined) {
    stats[type]++;
  } else {
    stats.other++;
  }
  
  stats.total++;
  return stats;
}

/**
 * Display message statistics summary
 * @param {Object} stats - Stats object
 */
export function displayMessageStats(stats) {
  const uptime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000);
  
  console.log(`
╔════════════════════════════════════════╗
║      📊 MESSAGE STATISTICS            ║
├────────────────────────────────────────┤
║ Total Messages:    ${String(stats.total).padStart(20)} ║
║ Text Messages:     ${String(stats.text || 0).padStart(20)} ║
║ Images:            ${String(stats.image || 0).padStart(20)} ║
║ Videos:            ${String(stats.video || 0).padStart(20)} ║
║ Documents:         ${String(stats.document || 0).padStart(20)} ║
║ Audio:             ${String(stats.audio || 0).padStart(20)} ║
║ Voice Messages:    ${String(stats.ptt || 0).padStart(20)} ║
║ Locations:         ${String(stats.location || 0).padStart(20)} ║
║ Contacts (vcard):  ${String(stats.vcard || 0).padStart(20)} ║
║ Stickers:          ${String(stats.sticker || 0).padStart(20)} ║
║ Call Logs:         ${String(stats.call_log || 0).padStart(20)} ║
║ Reactions:         ${String(stats.reaction || 0).padStart(20)} ║
║ Other Types:       ${String(stats.other || 0).padStart(20)} ║
├────────────────────────────────────────┤
║ Uptime: ${formatUptime(uptime).padStart(32)} ║
╚════════════════════════════════════════╝
`);
}

/**
 * Format uptime in human readable format
 * @param {number} seconds - Seconds
 * @returns {string} Formatted uptime
 */
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours}h ${minutes}m ${secs}s`;
}

export default {
  logMessageType,
  logMessageTypeCompact,
  createMessageStats,
  updateMessageStats,
  displayMessageStats,
  getMessageTypeConfig
};
