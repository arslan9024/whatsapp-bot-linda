class ConversationMetadataSheetsRecorder {
  static MAX_SHEET_NAME_LENGTH = 95;

  constructor({
    googleSheetsManager,
    spreadsheetId = null,
    sheetPrefix = 'Conversations',
    flushIntervalMs = 300000,
    logBot = null,
  } = {}) {
    this.googleSheetsManager = googleSheetsManager || null;
    this.spreadsheetId = spreadsheetId;
    this.sheetPrefix = sheetPrefix;
    this.flushIntervalMs = Number(flushIntervalMs) || 300000;
    this.logBot = typeof logBot === 'function' ? logBot : null;
    this.accountStores = new Map();
    this.flushTimer = null;
  }

  startAutoSync() {
    if (!this.spreadsheetId || !this.googleSheetsManager || this.flushTimer) return false;
    this.flushTimer = setInterval(async () => {
      try {
        await this.exportAllSummaries();
      } catch (_) {
        // best effort
      }
    }, this.flushIntervalMs);
    return true;
  }

  stopAutoSync() {
    if (!this.flushTimer) return;
    clearInterval(this.flushTimer);
    this.flushTimer = null;
  }

  recordIncoming(accountPhone, msg) {
    if (!msg || msg.fromMe) return;
    const chatId = this._extractChatId(msg, false);
    if (!chatId || chatId.includes('@g.us')) return;
    const store = this._getChatStore(accountPhone, chatId);
    const now = new Date();

    if (!store.firstMessageAt) store.firstMessageAt = now;
    store.lastMessageAt = now;
    store.lastIncomingAt = now;
    store.incomingCount += 1;
    store.contact = this._cleanContact(chatId);
  }

  recordOutgoing(accountPhone, msg) {
    if (!msg || !msg.fromMe) return;
    const chatId = this._extractChatId(msg, true);
    if (!chatId || chatId.includes('@g.us')) return;
    const store = this._getChatStore(accountPhone, chatId);
    const now = new Date();

    if (!store.firstMessageAt) store.firstMessageAt = now;
    store.lastMessageAt = now;
    store.lastOutgoingAt = now;
    store.outgoingCount += 1;
    store.contact = this._cleanContact(chatId);

    const ack = this._normalizeAck(msg.ack);
    store.lastAck = ack;

    const messageId = this._extractMessageId(msg);
    if (messageId && ack < 3 && !store.pendingUnreadMessageIds.has(messageId)) {
      store.pendingUnreadMessageIds.add(messageId);
      store.pendingUnreadCount += 1;
    }
  }

  recordAck(accountPhone, msg, ackValue) {
    if (!msg) return;
    const chatId = this._extractChatId(msg, true);
    if (!chatId || chatId.includes('@g.us')) return;
    const store = this._getChatStore(accountPhone, chatId);
    const ack = this._normalizeAck(ackValue);
    store.lastAck = ack;

    const messageId = this._extractMessageId(msg);
    if (!messageId) return;

    if (ack >= 3 && store.pendingUnreadMessageIds.has(messageId)) {
      store.pendingUnreadMessageIds.delete(messageId);
      store.pendingUnreadCount = Math.max(0, store.pendingUnreadCount - 1);
    } else if (ack < 3 && !store.pendingUnreadMessageIds.has(messageId)) {
      store.pendingUnreadMessageIds.add(messageId);
      store.pendingUnreadCount += 1;
    }
  }

  buildSummary(accountPhone) {
    const accountKey = this._normalizeAccount(accountPhone);
    const chats = Array.from((this.accountStores.get(accountKey) || new Map()).values());

    if (!chats.length) {
      return {
        accountPhone: accountKey,
        oldestConversation: null,
        topConversation: null,
        mostRepliesConversation: null,
        unreadConversations: [],
        neverRepliedConversations: [],
        totalConversations: 0,
      };
    }

    const byFirst = [...chats].sort((a, b) => new Date(a.firstMessageAt) - new Date(b.firstMessageAt));
    const byLast = [...chats].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    const byReplies = [...chats].sort((a, b) => b.incomingCount - a.incomingCount);
    const unread = chats.filter((c) => c.pendingUnreadCount > 0).sort((a, b) => b.pendingUnreadCount - a.pendingUnreadCount);
    const neverReplied = chats.filter((c) => c.outgoingCount > 0 && c.incomingCount === 0);

    return {
      accountPhone: accountKey,
      oldestConversation: byFirst[0] || null,
      topConversation: byLast[0] || null,
      mostRepliesConversation: byReplies[0] || null,
      unreadConversations: unread,
      neverRepliedConversations: neverReplied,
      totalConversations: chats.length,
    };
  }

  async exportAccountSummary(accountPhone, spreadsheetId = null) {
    const targetSpreadsheetId = spreadsheetId || this.spreadsheetId;
    if (!targetSpreadsheetId) {
      return { success: false, error: 'No spreadsheet ID configured' };
    }
    if (!this.googleSheetsManager) {
      return { success: false, error: 'GoogleSheetsManager not available' };
    }

    const summary = this.buildSummary(accountPhone);
    const sheetName = this._buildSheetName(summary.accountPhone);
    await this._ensureSheet(targetSpreadsheetId, sheetName);

    const rows = this._summaryToRows(summary);
    await this.googleSheetsManager.clearRange(targetSpreadsheetId, `${sheetName}!A1:Z1000`);
    const result = await this.googleSheetsManager.updateRange(targetSpreadsheetId, `${sheetName}!A1`, rows);

    if (result.success) {
      this._log(`Conversation metadata exported for ${summary.accountPhone} → ${sheetName}`, 'success');
      return { success: true, accountPhone: summary.accountPhone, sheetName, rows: rows.length - 1 };
    }
    return { success: false, error: result.error || 'Failed to update sheet' };
  }

  async exportAllSummaries(spreadsheetId = null) {
    const targetSpreadsheetId = spreadsheetId || this.spreadsheetId;
    if (!targetSpreadsheetId) return { success: false, error: 'No spreadsheet ID configured' };
    const accountKeys = Array.from(this.accountStores.keys());
    if (!accountKeys.length) return { success: true, exported: 0, results: [] };

    const results = [];
    for (const accountPhone of accountKeys) {
      const res = await this.exportAccountSummary(accountPhone, targetSpreadsheetId);
      results.push(res);
    }

    return {
      success: true,
      exported: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  _summaryToRows(summary) {
    const rows = [[
      'GeneratedAt',
      'AccountPhone',
      'MetricType',
      'ChatId',
      'Contact',
      'FirstMessageAt',
      'LastMessageAt',
      'IncomingReplies',
      'OutgoingMessages',
      'PendingUnreadMessages',
      'LastAck',
      'Notes',
    ]];

    const now = new Date().toISOString();
    const account = summary.accountPhone;

    const pushRow = (metricType, chat, notes = '') => {
      if (!chat) {
        rows.push([now, account, metricType, '-', '-', '-', '-', 0, 0, 0, '-', notes || 'No data']);
        return;
      }
      rows.push([
        now,
        account,
        metricType,
        chat.chatId || '-',
        chat.contact || '-',
        this._asIso(chat.firstMessageAt),
        this._asIso(chat.lastMessageAt),
        chat.incomingCount || 0,
        chat.outgoingCount || 0,
        chat.pendingUnreadCount || 0,
        this._ackLabel(chat.lastAck),
        notes,
      ]);
    };

    pushRow('oldest_conversation', summary.oldestConversation);
    pushRow('top_conversation_latest_activity', summary.topConversation);
    pushRow('most_replies', summary.mostRepliesConversation);

    if (summary.unreadConversations.length === 0) {
      pushRow('recipient_not_seen', null, 'No unread outgoing conversations');
    } else {
      for (const chat of summary.unreadConversations) {
        pushRow('recipient_not_seen', chat, 'Pending unread outgoing message(s)');
      }
    }

    if (summary.neverRepliedConversations.length === 0) {
      pushRow('never_replied', null, 'No never-replied conversations');
    } else {
      for (const chat of summary.neverRepliedConversations) {
        pushRow('never_replied', chat, 'Outgoing messages exist but no incoming reply');
      }
    }

    return rows;
  }

  async _ensureSheet(spreadsheetId, sheetName) {
    const namesResult = await this.googleSheetsManager.getSheetNames(spreadsheetId);
    if (!namesResult.success) return false;
    if (namesResult.sheets.includes(sheetName)) return true;
    const createResult = await this.googleSheetsManager.createSheet(spreadsheetId, sheetName);
    return Boolean(createResult.success);
  }

  _getChatStore(accountPhone, chatId) {
    const accountKey = this._normalizeAccount(accountPhone);
    if (!this.accountStores.has(accountKey)) {
      this.accountStores.set(accountKey, new Map());
    }
    const accountMap = this.accountStores.get(accountKey);
    if (!accountMap.has(chatId)) {
      accountMap.set(chatId, {
        chatId,
        contact: this._cleanContact(chatId),
        firstMessageAt: null,
        lastMessageAt: null,
        lastIncomingAt: null,
        lastOutgoingAt: null,
        incomingCount: 0,
        outgoingCount: 0,
        lastAck: null,
        pendingUnreadCount: 0,
        pendingUnreadMessageIds: new Set(),
      });
    }
    return accountMap.get(chatId);
  }

  _normalizeAccount(accountPhone) {
    return String(accountPhone || 'unknown-account').trim();
  }

  _extractChatId(msg, preferTo = false) {
    if (!msg) return null;
    return preferTo ? (msg.to || msg.from || msg.fromId || null) : (msg.from || msg.to || msg.fromId || null);
  }

  _extractMessageId(msg) {
    return msg?.id?._serialized || msg?.id?.id || null;
  }

  _cleanContact(chatId) {
    return String(chatId || '').replace('@c.us', '').replace('@g.us', '');
  }

  _normalizeAck(ack) {
    const value = Number(ack);
    return Number.isFinite(value) ? value : 0;
  }

  _ackLabel(ack) {
    const map = {
      '-1': 'ERROR',
      0: 'PENDING',
      1: 'SENT',
      2: 'DELIVERED',
      3: 'READ',
      4: 'PLAYED',
    };
    return map[ack] ?? String(ack ?? '-');
  }

  _buildSheetName(accountPhone) {
    const suffix = String(accountPhone || 'unknown').replace(/[\\/?*:\[\]]/g, '-').slice(-24);
    return `${this.sheetPrefix}-${suffix}`.slice(0, ConversationMetadataSheetsRecorder.MAX_SHEET_NAME_LENGTH);
  }

  _asIso(value) {
    if (!value) return '-';
    try {
      return new Date(value).toISOString();
    } catch (_) {
      return '-';
    }
  }

  _log(message, level = 'info') {
    if (!this.logBot) return;
    this.logBot(message, level);
  }
}

export default ConversationMetadataSheetsRecorder;
