/**
 * Conversation Analyzer
 * Analyzes message types, conversation patterns, and displays results in terminal
 * 
 * Features:
 * - Logs message type for every message received
 * - Tracks conversation statistics
 * - Analyzes sentiment and intent
 * - Displays real-time metrics
 * 
 * Date: February 7, 2026 - Session 18
 */

import { readFileSync } from 'fs';
import { logger } from '../integrations/google/utils/logger.js';

/**
 * Message Type Definitions and Emojis
 */
const MESSAGE_TYPES = {
  'chat': { emoji: '💬', name: 'Text Message', category: 'text' },
  'text': { emoji: '💬', name: 'Text Message', category: 'text' },
  'image': { emoji: '🖼️', name: 'Image', category: 'media' },
  'video': { emoji: '🎥', name: 'Video', category: 'media' },
  'document': { emoji: '📄', name: 'Document', category: 'media' },
  'audio': { emoji: '🎵', name: 'Audio', category: 'media' },
  'ptt': { emoji: '🎤', name: 'Voice Message', category: 'media' },
  'location': { emoji: '📍', name: 'Location', category: 'interactive' },
  'vcard': { emoji: '👤', name: 'Contact', category: 'interactive' },
  'sticker': { emoji: '🎭', name: 'Sticker', category: 'media' },
  'call_log': { emoji: '☎️', name: 'Call Log', category: 'system' },
  'reaction': { emoji: '😀', name: 'Reaction', category: 'interactive' },
  'ciphertext': { emoji: '🔐', name: 'Encrypted', category: 'system' },
  'revoked': { emoji: '🚫', name: 'Revoked', category: 'system' },
  'interactive': { emoji: '🔘', name: 'Interactive', category: 'interactive' },
  'template': { emoji: '📋', name: 'Template', category: 'interactive' },
  'e2e_notification': { emoji: 'ℹ️', name: 'Security Notification', category: 'system' },
};

/**
 * Conversation Analyzer Class
 */
function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length < 5 ? '[redacted]' : `***${digits.slice(-4)}`;
}

class ConversationAnalyzer {
  constructor() {
    this.messages = [];
    this.stats = {
      total: 0,
      byType: {},
      byCategory: {},
      textMessages: 0,
      mediaMessages: 0,
      directChats: 0,
      groupChats: 0,
      startTime: new Date(),
      lastMessageTime: null,
      messageRate: 0, // messages per minute
    };
    this.conversationPatterns = {
      avgMessageLength: 0,
      longestMessage: '',
      shortestMessage: '',
      mostActiveHour: null,
      mostActiveDayOfWeek: null,
    };
    this.senders = new Map(); // Track unique senders
    this.sessionStartTime = new Date();
  }

  /**
   * Log message type to console with detailed information
   * @param {Object} msg - WhatsApp message object
   */
  logMessageType(msg) {
    const type = msg.type || 'unknown';
    const typeInfo = MESSAGE_TYPES[type] || { 
      emoji: '❓', 
      name: 'Unknown', 
      category: 'unknown' 
    };

    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const chatType = msg.isGroupMsg ? '👥 GROUP' : '👤 DIRECT';
    const sender = maskPhone(msg.from);
    
    // Extract message preview
    let preview = '';
    if (type === 'chat' || type === 'text') {
      preview = msg.body ? '[message content redacted]' : '(empty)';
    } else if (type === 'image' || type === 'video') {
      preview = msg.caption ? '[caption redacted]' : '(no caption)';
    } else if (type === 'document') {
      preview = msg.filename ? '[filename redacted]' : 'unknown';
    } else if (type === 'location') {
      preview = '[location redacted]';
    } else if (type === 'ptt' || type === 'audio') {
      preview = `Duration: ${msg.duration || 'unknown'}s`;
    } else {
      preview = '(media)';
    }

    // Main message log
    console.log(
      `\n${typeInfo.emoji} [${timestamp}] ${typeInfo.name.toUpperCase()} | ${chatType} | From: ${sender}`
    );
    console.log(`   📝 Preview: "${preview}"`);
    console.log(`   🏷️  Type: ${type} | Category: ${typeInfo.category}`);

    // Additional metadata
    if (msg.hasQuotedMsg) console.log(`   ↩️  Has quoted message: Yes`);
    if (msg.hasMedia) console.log(`   📎 Has media: Yes`);
    if (msg.isForwarded) console.log(`   ➡️  Forwarded: Yes`);
    if (msg.isStarred) console.log(`   ⭐ Starred: Yes`);
    
    // Update statistics
    this.updateStats(msg, typeInfo);

    // Log to file as well
    logger.info(`Message received: ${typeInfo.name}`, {
      type,
      from: sender,
      isGroup: msg.isGroupMsg,
      hasMedia: msg.hasMedia,
      timestamp
    });
  }

  /**
   * Log message type in compact format (one line)
   * @param {Object} msg - WhatsApp message object
   */
  logMessageTypeCompact(msg) {
    const type = msg.type || 'unknown';
    const typeInfo = MESSAGE_TYPES[type] || { emoji: '❓', name: 'Unknown' };

    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const chatType = msg.isGroupMsg ? '👥' : '👤';
    const sender = maskPhone(msg.from);
    
    let preview = '';
    if (type === 'chat' || type === 'text') {
      preview = msg.body ? '[message content redacted]' : '(empty)';
    } else {
      preview = '(media)';
    }

    // Compact one-line log
    console.log(
      `${typeInfo.emoji} [${timestamp}] ${typeInfo.name} ${chatType} | "${preview}"`
    );

    // Update statistics
    this.updateStats(msg, typeInfo);
  }

  /**
   * Update conversation statistics
   * @param {Object} msg - Message object
   * @param {Object} typeInfo - Message type information
   */
  updateStats(msg, typeInfo) {
    // Total messages
    this.stats.total++;

    // By type
    if (!this.stats.byType[msg.type]) {
      this.stats.byType[msg.type] = 0;
    }
    this.stats.byType[msg.type]++;

    // By category
    const category = typeInfo.category;
    if (!this.stats.byCategory[category]) {
      this.stats.byCategory[category] = 0;
    }
    this.stats.byCategory[category]++;

    // Other stats
    if (msg.type === 'chat' || msg.type === 'text') {
      this.stats.textMessages++;
    } else {
      this.stats.mediaMessages++;
    }

    if (msg.isGroupMsg) {
      this.stats.groupChats++;
    } else {
      this.stats.directChats++;
    }

    // Track unique senders
    if (msg.from) {
      const sender = msg.from;
      if (!this.senders.has(sender)) {
        this.senders.set(sender, { count: 0, types: {} });
      }
      const senderInfo = this.senders.get(sender);
      senderInfo.count++;
      if (!senderInfo.types[msg.type]) {
        senderInfo.types[msg.type] = 0;
      }
      senderInfo.types[msg.type]++;
    }

    // Update time
    this.stats.lastMessageTime = new Date();

    // Message rate calculation
    const uptime = (new Date() - this.stats.startTime) / 60000; // minutes
    this.stats.messageRate = (this.stats.total / uptime).toFixed(2);
  }

  /**
   * Display statistics in terminal
   */
  displayStats() {
    const uptime = Math.round((new Date() - this.stats.startTime) / 1000);
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;

    console.log('\n' + '═'.repeat(70));
    console.log('📊 CONVERSATION STATISTICS');
    console.log('═'.repeat(70));

    // Overall stats
    console.log(`\n📈 Overall Metrics:`);
    console.log(`   Total Messages: ${this.stats.total}`);
    console.log(`   Uptime: ${minutes}m ${seconds}s`);
    console.log(`   Message Rate: ${this.stats.messageRate} msg/min`);
    console.log(`   Unique Senders: ${this.senders.size}`);

    // Message breakdown
    console.log(`\n💬 Message Types:`);
    console.log(`   Text: ${this.stats.textMessages} (${this.getPercentage(this.stats.textMessages)}%)`);
    console.log(`   Media: ${this.stats.mediaMessages} (${this.getPercentage(this.stats.mediaMessages)}%)`);

    // Chat types
    console.log(`\n👥 Chat Types:`);
    console.log(`   Direct: ${this.stats.directChats} (${this.getPercentage(this.stats.directChats)}%)`);
    console.log(`   Groups: ${this.stats.groupChats} (${this.getPercentage(this.stats.groupChats)}%)`);

    // By message type detail
    console.log(`\n🏷️  Detailed Breakdown:`);
    Object.entries(this.stats.byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) // Top 8
      .forEach(([type, count]) => {
        const typeInfo = MESSAGE_TYPES[type] || { emoji: '❓', name: type };
        const percentage = this.getPercentage(count);
        console.log(`   ${typeInfo.emoji} ${typeInfo.name}: ${count} (${percentage}%)`);
      });

    // Top senders
    if (this.senders.size > 0) {
      console.log(`\n👤 Top Senders:`);
      const topSenders = Array.from(this.senders.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);
      
      topSenders.forEach(([sender, info]) => {
        const cleanSender = sender.replace('@c.us', '').replace('@g.us', '');
        console.log(`   ${cleanSender}: ${info.count} messages`);
      });
    }

    console.log('\n' + '═'.repeat(70) + '\n');
  }

  /**
   * Calculate percentage
   * @param {number} count - Count
   * @returns {string} Percentage
   */
  getPercentage(count) {
    if (this.stats.total === 0) return '0';
    return ((count / this.stats.total) * 100).toFixed(1);
  }

  /**
   * Clear statistics
   */
  clearStats() {
    this.stats.total = 0;
    this.stats.byType = {};
    this.stats.byCategory = {};
    this.stats.textMessages = 0;
    this.stats.mediaMessages = 0;
    this.stats.directChats = 0;
    this.stats.groupChats = 0;
    this.stats.startTime = new Date();
    this.messages = [];
    this.senders.clear();
    console.log('\n✅ Statistics cleared\n');
  }

  /**
   * Get current stats object
   * @returns {Object} Stats
   */
  getStats() {
    return this.stats;
  }

  /**
   * Analyze conversation sentiment (simple version)
   * @param {Object} msg - Message object
   * @returns {string} Sentiment: positive, neutral, negative
   */
  analyzeSentiment(msg) {
    if (msg.type !== 'chat' && msg.type !== 'text') return 'neutral';

    const body = msg.body.toLowerCase();
    
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'happy', 'thanks', 'thank', 'yes', 'ok', 'okay', '👍', '😊', '😀', '❤️'];
    const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'sad', 'no', 'hate', 'problem', 'issue', 'error', '😠', '😭', '❌'];

    let positiveCount = positiveWords.filter(word => body.includes(word)).length;
    let negativeCount = negativeWords.filter(word => body.includes(word)).length;

    if (positiveCount > negativeCount) return '😊 positive';
    if (negativeCount > positiveCount) return '😠 negative';
    return '😐 neutral';
  }

  /**
   * Analyze message intent (simple version)
   * @param {Object} msg - Message object
   * @returns {string} Intent
   */
  analyzeIntent(msg) {
    if (msg.type !== 'chat' && msg.type !== 'text') return 'information';

    const body = msg.body.toLowerCase();

    if (body.includes('?') || body.includes('what') || body.includes('how') || body.includes('why')) {
      return '❓ question';
    }
    if (body.includes('!') || body.includes('let\'s') || body.includes('let us')) {
      return '💪 command';
    }
    if (body.includes('thank') || body.includes('please') || body.includes('hello') || body.includes('hi')) {
      return '🤝 greeting/politeness';
    }
    return 'ℹ️ information';
  }
}

// Singleton instance
let analyzerInstance = null;

/**
 * Get or create analyzer instance
 * @returns {ConversationAnalyzer}
 */
function getConversationAnalyzer() {
  if (!analyzerInstance) {
    analyzerInstance = new ConversationAnalyzer();
  }
  return analyzerInstance;
}

export {
  ConversationAnalyzer,
  getConversationAnalyzer,
  MESSAGE_TYPES
};
