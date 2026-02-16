/**
 * ============================================
 * MESSAGE & CONVERSATION SCHEMAS (Phase 17)
 * ============================================
 * 
 * MongoDB schemas for persisting WhatsApp messages, conversations,
 * actions, and analytics. Supports comprehensive message handling.
 */

import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// ============================================
// MESSAGE SCHEMA
// ============================================
const messageSchema = new Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  fromNumber: {
    type: String,
    required: true,
    index: true,
  },
  toNumber: {
    type: String,
    required: true,
    index: true,
  },
  body: String,
  type: {
    type: String,
    enum: [
      'chat', 'text', 'image', 'video', 'audio', 'document',
      'sticker', 'ptt', 'location', 'contact', 'vcard',
      'buttons', 'list', 'template', 'interactive', 'system'
    ],
    index: true,
  },
  media: {
    mimeType: String,
    filename: String,
    size: Number,
    duration: Number,
    caption: String,
    url: String,
    downloaded: Boolean,
    localPath: String,
  },
  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    speed: Number,
  },
  hasQuotedMsg: Boolean,
  quotedMsgId: String,
  isForwarded: Boolean,
  isStarred: Boolean,
  hasLink: Boolean,
  entities: {
    phones: [{
      value: String,
      confidence: Number,
      format: String,
    }],
    urls: [{
      value: String,
      domain: String,
    }],
    emails: [{
      value: String,
    }],
    dates: [{
      value: String,
      normalizedDate: Date,
      confidence: Number,
    }],
    currencies: [{
      value: Number,
      currency: String,
      confidence: Number,
    }],
    properties: [{
      type: String,
      unit: String,
      project: String,
      confidence: Number,
    }],
  },
  analysis: {
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
    },
    sentimentScore: Number,
    intent: String,
    intentConfidence: Number,
    language: String,
  },
  enrichment: {
    relatedProperties: [Schema.Types.ObjectId],
    relatedContacts: [Schema.Types.ObjectId],
    suggestedResponse: String,
    responseConfidence: Number,
  },
  messageHash: {
    type: String,
    index: true,
  },
  isDuplicate: Boolean,
  duplicateOf: String,
  timestamp: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  ack: {
    type: Number,
    enum: [1, 2, 3],
  },
  ackTimestamp: Date,
  deviceId: String,
  processed: Boolean,
  processingTime: Number,
  errors: [String],
}, { collection: 'messages', timestamps: true });

// ============================================
// CONVERSATION SCHEMA
// ============================================
const conversationSchema = new Schema({
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true,
  },
  isGroupChat: Boolean,
  groupName: String,
  groupMembers: [String],
  messageCount: {
    type: Number,
    default: 0,
  },
  firstMessageAt: Date,
  lastMessageAt: {
    type: Date,
    index: true,
  },
  state: {
    topic: String,
    stage: String,
    isActive: Boolean,
    lastInteractionType: String,
  },
  sentimentTrend: {
    overall: String,
    trend: String,
  },
  messageTypes: {
    text: Number,
    media: Number,
    reactions: Number,
    edits: Number,
  },
  summary: String,
  extractedData: {
    phones: [String],
    properties: [Schema.Types.ObjectId],
    contacts: [Schema.Types.ObjectId],
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { collection: 'conversations' });

// ============================================
// MESSAGE ACTIONS SCHEMA
// ============================================
const messageActionSchema = new Schema({
  actionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  messageId: {
    type: String,
    required: true,
    index: true,
  },
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  actionType: {
    type: String,
    enum: ['reaction', 'edit', 'delete', 'forward', 'read', 'pin'],
    required: true,
    index: true,
  },
  actor: {
    type: String,
    required: true,
    index: true,
  },
  data: {
    emoji: String,
    newBody: String,
    forwardedTo: [String],
  },
  timestamp: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { collection: 'message_actions' });

// ============================================
// CONVERSATION SUMMARY SCHEMA
// ============================================
const conversationSummarySchema = new Schema({
  summaryId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true,
  },
  period: {
    type: String,
    enum: ['day', 'week', 'month'],
  },
  startDate: Date,
  endDate: Date,
  messageCount: Number,
  uniqueIntents: [String],
  sentimentDistribution: {
    positive: Number,
    negative: Number,
    neutral: Number,
  },
  topicsCovered: [String],
  propertiesDiscussed: [Schema.Types.ObjectId],
  responseRate: Number,
  responseTime: Number,
  summary: String,
  keyPoints: [String],
  recommendations: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { collection: 'conversation_summaries' });

// ============================================
// CREATE MODELS
// ============================================
const Message = mongoose.model('Message', messageSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);
const MessageAction = mongoose.model('MessageAction', messageActionSchema);
const ConversationSummary = mongoose.model('ConversationSummary', conversationSummarySchema);

// ============================================
// CREATE INDEXES
// ============================================
async function createMessageIndexes() {
  try {
    await Message.collection.createIndex({ fromNumber: 1, timestamp: -1 });
    await Message.collection.createIndex({ conversationId: 1, timestamp: -1 });
    await Message.collection.createIndex({ fromNumber: 1, type: 1 });
    await Message.collection.createIndex({ messageHash: 1 }, { sparse: true });
    
    await Conversation.collection.createIndex({ phoneNumber: 1, lastMessageAt: -1 });
    await Conversation.collection.createIndex({ isActive: 1, lastMessageAt: -1 });
    
    await MessageAction.collection.createIndex({ messageId: 1, timestamp: -1 });
    await MessageAction.collection.createIndex({ actor: 1, timestamp: -1 });
    
    await ConversationSummary.collection.createIndex({ conversationId: 1, period: 1 });
    await ConversationSummary.collection.createIndex({ phoneNumber: 1, startDate: -1 });
    
    console.log('✅ Message indexes created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating message indexes:', error.message);
    return false;
  }
}

export {
  Message,
  Conversation,
  MessageAction,
  ConversationSummary,
  createMessageIndexes,
};

export const messageSchemas = {
  messageSchema,
  conversationSchema,
  messageActionSchema,
  conversationSummarySchema,
};
