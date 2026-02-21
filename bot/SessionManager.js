/**
 * Session Manager
 * Manages user/group sessions, conversation state, and context
 * Handles: session storage, context preservation, timeout cleanup
 */

import EventEmitter from 'events';

class SessionManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = config;
    this.sessions = new Map(); // userId -> Session object
    this.maxSessions = config.maxSessions || 10000;
    this.sessionTimeout = config.sessionTimeout || 1200000; // 20 minutes
    this.cleanupInterval = config.cleanupInterval || 300000; // 5 minutes

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);

    this.log('SessionManager initialized');
  }

  /**
   * Get or create session
   */
  getSession(userId, metadata = {}) {
    let session = this.sessions.get(userId);

    if (!session) {
      if (this.sessions.size >= this.maxSessions) {
        throw new Error(`Max sessions (${this.maxSessions}) reached`);
      }

      session = new Session(userId, metadata);
      this.sessions.set(userId, session);
      this.emit('session:created', { userId, session });
    }

    // Update last activity
    session.lastActivity = Date.now();

    return session;
  }

  /**
   * Destroy session
   */
  destroySession(userId) {
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.delete(userId);
      this.emit('session:destroyed', { userId });
    }
  }

  /**
   * Check if session exists
   */
  hasSession(userId) {
    return this.sessions.has(userId);
  }

  /**
   * Set session state
   */
  setState(userId, key, value) {
    const session = this.getSession(userId);
    session.setState(key, value);
    this.emit('session:state-changed', { userId, key, value });
  }

  /**
   * Get session state
   */
  getState(userId, key) {
    const session = this.sessions.get(userId);
    return session ? session.getState(key) : null;
  }

  /**
   * Add message to session history
   */
  addMessage(userId, message) {
    const session = this.getSession(userId);
    session.addMessage(message);

    // Keep only last N messages
    const maxHistory = this.config.maxHistoryPerSession || 100;
    if (session.messageHistory.length > maxHistory) {
      session.messageHistory = session.messageHistory.slice(-maxHistory);
    }
  }

  /**
   * Get message history
   */
  getHistory(userId, limit = 10) {
    const session = this.sessions.get(userId);
    if (!session) return [];
    return session.messageHistory.slice(-limit);
  }

  /**
   * Clear session history
   */
  clearHistory(userId) {
    const session = this.sessions.get(userId);
    if (session) {
      session.messageHistory = [];
      this.emit('session:history-cleared', { userId });
    }
  }

  /**
   * Set context
   */
  setContext(userId, context) {
    const session = this.getSession(userId);
    session.context = { ...session.context, ...context };
    this.emit('session:context-changed', { userId, context: session.context });
  }

  /**
   * Get context
   */
  getContext(userId) {
    const session = this.sessions.get(userId);
    return session ? session.context : {};
  }

  /**
   * Add tag
   */
  addTag(userId, tag) {
    const session = this.getSession(userId);
    if (!session.tags.includes(tag)) {
      session.tags.push(tag);
      this.emit('session:tag-added', { userId, tag });
    }
  }

  /**
   * Remove tag
   */
  removeTag(userId, tag) {
    const session = this.getSession(userId);
    session.tags = session.tags.filter(t => t !== tag);
    this.emit('session:tag-removed', { userId, tag });
  }

  /**
   * Get sessions by tag
   */
  getSessionsByTag(tag) {
    const result = [];
    for (const [userId, session] of this.sessions.entries()) {
      if (session.tags.includes(tag)) {
        result.push({ userId, session });
      }
    }
    return result;
  }

  /**
   * Increment counter
   */
  incrementCounter(userId, counterName) {
    const session = this.getSession(userId);
    if (!session.counters[counterName]) {
      session.counters[counterName] = 0;
    }
    session.counters[counterName]++;
    return session.counters[counterName];
  }

  /**
   * Get counter
   */
  getCounter(userId, counterName) {
    const session = this.sessions.get(userId);
    return session ? (session.counters[counterName] || 0) : 0;
  }

  /**
   * Reset counter
   */
  resetCounter(userId, counterName) {
    const session = this.sessions.get(userId);
    if (session) {
      session.counters[counterName] = 0;
    }
  }

  /**
   * Cleanup expired sessions
   */
  cleanup() {
    const now = Date.now();
    const toDelete = [];

    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        toDelete.push(userId);
      }
    }

    for (const userId of toDelete) {
      this.destroySession(userId);
      this.log(`Cleaned up expired session: ${userId}`);
    }

    if (toDelete.length > 0) {
      this.emit('cleanup', { removedCount: toDelete.length });
    }
  }

  /**
   * Get stats
   */
  getStats() {
    const sessions = Array.from(this.sessions.values());
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageHistory.length, 0);
    const activeSessions = sessions.filter(s => Date.now() - s.lastActivity < 60000).length;

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      totalMessages,
      averageMessagesPerSession: sessions.length ? totalMessages / sessions.length : 0,
      avgSessionAge: sessions.length
        ? sessions.reduce((sum, s) => sum + (Date.now() - s.createdAt), 0) / sessions.length
        : 0
    };
  }

  /**
   * Export sessions (for backup)
   */
  export() {
    const data = {};
    for (const [userId, session] of this.sessions.entries()) {
      data[userId] = session.toJSON();
    }
    return data;
  }

  /**
   * Import sessions
   */
  import(data) {
    for (const [userId, sessionData] of Object.entries(data)) {
      const session = new Session(userId);
      session.fromJSON(sessionData);
      this.sessions.set(userId, session);
    }
  }

  /**
   * Destroy all sessions
   */
  destroyAll() {
    this.sessions.clear();
    this.emit('all-sessions-destroyed', {});
  }

  /**
   * Logging utility
   */
  log(message) {
    console.log(`[SessionManager] ${message}`);
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    clearInterval(this.cleanupTimer);
    this.destroyAll();
  }
}

/**
 * Individual Session Class
 */
class Session {
  constructor(userId, metadata = {}) {
    this.userId = userId;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.metadata = metadata;
    this.state = {}; // Custom state key-value store
    this.context = {}; // Conversation context
    this.messageHistory = []; // Message history
    this.tags = []; // Session tags
    this.counters = {}; // Named counters
  }

  /**
   * Set state value
   */
  setState(key, value) {
    this.state[key] = value;
  }

  /**
   * Get state value
   */
  getState(key) {
    return this.state[key];
  }

  /**
   * Add message to history
   */
  addMessage(message) {
    this.messageHistory.push({
      ...message,
      addedAt: Date.now()
    });
  }

  /**
   * Get uptime
   */
  getUptime() {
    return Date.now() - this.createdAt;
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      userId: this.userId,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      metadata: this.metadata,
      state: this.state,
      context: this.context,
      messageHistory: this.messageHistory,
      tags: this.tags,
      counters: this.counters
    };
  }

  /**
   * Import from JSON
   */
  fromJSON(data) {
    Object.assign(this, data);
  }
}

export { SessionManager, Session };
