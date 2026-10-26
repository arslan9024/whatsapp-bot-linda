const positiveInteger = (value, maximum, label) => {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > maximum) {
    throw new Error(`${label} must be an integer between 1 and ${maximum}`);
  }
  return Number(value);
};
const safeLabel = value => String(value).replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').slice(0, 100);
const envInteger = (name, fallback, maximum) => {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
};
const preview = message => {
  if (!message) return '';
  const body = String(message.body || '').replace(/[\x00-\x1f\x7f-\x9f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (body) return body.length > 48 ? `${body.slice(0, 47)}…` : body;
  return message.hasMedia ? `[${message.type || 'media'}]` : `[${message.type || 'message'}]`;
};
const timeAgo = (seconds, now = Date.now()) => {
  if (!seconds) return 'unknown time';
  const diff = Math.max(0, Math.round(now / 1000 - seconds));
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};
const formatCount = entry => (entry.messages === null ? '?' : `${entry.messages}${entry.capped ? '+' : ''}`);

/** Short summary lines of a conversation report for the OUTPUT panel. */
export function conversationSummaryLines(report, { top = 5, now = Date.now() } = {}) {
  if (!report) return [];
  const last = report.last;
  const lines = [
    `Conversations: ${report.totalChats} (${report.individualChats} people, ${report.groupChats} groups) | ` +
      `Unread: ${report.unreadMessages} in ${report.unreadChats} chats | Messages counted: ${report.totalMessages}` +
      `${report.cappedChats ? '+' : ''} (in ${report.incoming} / out ${report.outgoing})`,
    last ? `Last conversation: #${last.number} ${last.name}${last.group ? ' [group]' : ''} · ${timeAgo(last.timestamp, now)} · ` +
      `${last.lastFromMe === null ? '' : last.lastFromMe ? 'you: ' : 'them: '}${last.lastPreview || '(no preview)'} · ${formatCount(last)} msgs` :
      'Last conversation: none',
  ];
  const ranked = report.entries.filter(entry => entry.messages !== null).slice(0, top);
  if (ranked.length) {
    lines.push(`Recent chats (messages each): ${ranked.map(entry => `#${entry.number} ${entry.name.slice(0, 18)} ${formatCount(entry)}`).join(' | ')}`);
  }
  lines.push(`Report ${new Date(report.generatedAt).toLocaleTimeString()} · ${(report.durationMs / 1000).toFixed(1)}s · ` +
    `count limit ${report.perChatLimit}/chat${report.skippedChats ? ` · ${report.skippedChats} chats not counted` : ''} · full list: convos`);
  return lines;
}

/** Full per-conversation table for the `convos` command. */
export function conversationReportLines(report, { now = Date.now() } = {}) {
  if (!report) return ['No conversation report yet. Run: convos [phone]'];
  const lines = [`CONVERSATION REPORT | ${report.phone}`, ...conversationSummaryLines(report, { top: 0, now }), ''];
  lines.push(`${'#'.padStart(4)}  ${'Chat'.padEnd(32)} ${'Msgs'.padStart(6)} ${'In'.padStart(5)} ${'Out'.padStart(5)} ${'Unread'.padStart(6)}  Last activity`);
  for (const entry of report.entries) {
    lines.push(`${String(entry.number).padStart(4)}  ${`${entry.name}${entry.group ? ' [g]' : ''}`.slice(0, 32).padEnd(32)} ` +
      `${formatCount(entry).padStart(6)} ${String(entry.messages === null ? '-' : entry.incoming).padStart(5)} ` +
      `${String(entry.messages === null ? '-' : entry.outgoing).padStart(5)} ${String(entry.unread).padStart(6)}  ${timeAgo(entry.timestamp, now)}`);
  }
  lines.push('', `"+" = at least this many (raise LINDA_CHAT_REPORT_LIMIT to count more). Analyze one chat: analyze ${report.phone} <#>`);
  return lines;
}

export class TerminalConversationAnalysis {
  constructor({ accountClients, getFlowDeps, output = console.log }) {
    this.accountClients = accountClients;
    this.getFlowDeps = getFlowDeps;
    this.output = output;
    this.snapshots = new Map();
    this.reports = new Map();
  }

  async connected(requestedPhone) {
    const deps = this.getFlowDeps();
    const configs = deps.sharedContext.accountConfigManager;
    const requested = requestedPhone || configs?.getMasterPhoneNumber();
    if (!requested) throw new Error('Configure a master account before inspecting conversations');
    const phone = configs?.getAllAccounts().find(account =>
      account.phoneNumber.replace(/^\+/, '') === requested.replace(/^\+/, ''))?.phoneNumber || requested;
    const client = this.accountClients.get(phone);
    if (!client || deps.connectionManagers.get(phone)?.state !== 'CONNECTED' ||
        await client.getState() !== 'CONNECTED') {
      throw new Error(`Account ${phone} is not active; recover its saved session first`);
    }
    return { phone, client };
  }

  async list(phoneNumber, requestedPage = '1') {
    const page = positiveInteger(requestedPage, 10000, 'Page');
    const { phone, client } = await this.connected(phoneNumber);
    let snapshot = this.snapshots.get(phone);
    if (page === 1) {
      const chats = [...await client.getChats()].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      if (this.accountClients.get(phone) !== client || this.getFlowDeps().connectionManagers.get(phone)?.state !== 'CONNECTED') {
        throw new Error('Account connection changed while listing chats; retry after recovery');
      }
      const seen = new Set();
      const entries = [];
      for (const chat of chats) {
        const id = chat.id?._serialized;
        if (!id || seen.has(id) || !/@(c\.us|g\.us|lid)$/.test(id)) continue;
        seen.add(id);
        entries.push({ id, name: safeLabel(chat.name || id), group: chat.isGroup === true });
      }
      snapshot = { client, entries };
      this.snapshots.set(phone, snapshot);
    }
    if (!snapshot || snapshot.client !== client) throw new Error('Run chats for this account again to refresh chat numbers');
    const pages = Math.max(1, Math.ceil(snapshot.entries.length / 20));
    if (page > pages) throw new Error(`Chat page does not exist; available pages: ${pages}`);
    const lines = [`CHATS | ${phone} | ${snapshot.entries.length} available | page ${page}/${pages}`];
    for (let i = (page - 1) * 20; i < Math.min(page * 20, snapshot.entries.length); i++) {
      const chat = snapshot.entries[i];
      lines.push(`${i + 1}. ${chat.name}${chat.group ? ' [group]' : ''}`);
    }
    lines.push('Use analyze <phone> <chat-number> [limit]. Local read-only statistics; no replies or external AI.');
    this.output(lines.join('\n'));
    return snapshot.entries.length;
  }

  async analyze(phoneNumber, requestedNumber, requestedLimit = '100') {
    const number = positiveInteger(requestedNumber, 1000000, 'Chat number');
    const limit = positiveInteger(requestedLimit, 500, 'Message limit');
    const { phone, client } = await this.connected(phoneNumber);
    const snapshot = this.snapshots.get(phone);
    if (!snapshot || snapshot.client !== client) throw new Error('Run chats for this account first; chat numbers are bound to the active session');
    const selected = snapshot.entries[number - 1];
    if (!selected) throw new Error('Unknown chat number; use the current chats list');
    const chat = await client.getChatById(selected.id);
    const fetched = await chat.fetchMessages({ limit });
    if (this.accountClients.get(phone) !== client || this.getFlowDeps().connectionManagers.get(phone)?.state !== 'CONNECTED') {
      throw new Error('Account connection changed during analysis; retry with a fresh chats list');
    }
    const seen = new Set();
    const messages = fetched.filter(message => {
      const id = message.id?._serialized;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }).slice(-limit).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const incoming = messages.filter(message => !message.fromMe).length;
    const report = {
      messages: messages.length, incoming, outgoing: messages.length - incoming,
      media: messages.filter(message => message.hasMedia).length,
      incomingQuestions: messages.filter(message => !message.fromMe && /\?/.test(message.body || '')).length,
      latestDirection: messages.length ? (messages.at(-1).fromMe ? 'outgoing' : 'incoming') : 'none',
    };
    this.output([
      `LOCAL ANALYSIS | ${selected.name} | ${phone}`,
      `Available sample: ${report.messages}/${limit} requested | Incoming: ${report.incoming} | Outgoing: ${report.outgoing}`,
      `Media: ${report.media} | Incoming messages containing "?": ${report.incomingQuestions} | Latest message: ${report.latestDirection}`,
      'Sample statistics only, not an AI summary or proof of an unanswered question.',
      'No message bodies printed or saved, no media downloaded, no external AI calls, no replies sent.',
      'WhatsApp may expose only part of the history. Read requests still communicate with WhatsApp.',
    ].join('\n'));
    return report;
  }

  /**
   * Analyze every conversation of an active account: total chats, last conversation and the
   * number of messages per chat (counted up to `perChatLimit`; `capped` marks "or more").
   * Chat numbers match the `chats` list, so `analyze <phone> <n>` works afterwards.
   */
  async overview(phoneNumber, {
    perChatLimit = envInteger('LINDA_CHAT_REPORT_LIMIT', 200, 5000),
    maxChats = envInteger('LINDA_CHAT_REPORT_MAX_CHATS', 500, 100000),
    concurrency = 3,
    onProgress = null,
  } = {}) {
    const { phone, client } = await this.connected(phoneNumber);
    const startedAt = Date.now();
    const stillConnected = () => this.accountClients.get(phone) === client &&
      this.getFlowDeps().connectionManagers.get(phone)?.state === 'CONNECTED';
    const chats = await client.getChats();
    if (!stillConnected()) throw new Error('Account connection changed while reading chats; retry after recovery');
    const seen = new Set();
    const valid = [];
    for (const chat of chats) {
      const id = chat.id?._serialized;
      if (!id || seen.has(id) || !/@(c\.us|g\.us|lid)$/.test(id)) continue;
      seen.add(id);
      valid.push(chat);
    }
    valid.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const entries = valid.map((chat, index) => ({
      number: index + 1,
      id: chat.id._serialized,
      name: safeLabel(chat.name || chat.id.user || chat.id._serialized),
      group: chat.isGroup === true,
      unread: Number(chat.unreadCount) || 0,
      timestamp: chat.timestamp || chat.lastMessage?.timestamp || 0,
      lastFromMe: chat.lastMessage ? chat.lastMessage.fromMe === true : null,
      lastPreview: preview(chat.lastMessage),
      messages: null,
      incoming: 0,
      outgoing: 0,
      capped: false,
    }));
    this.snapshots.set(phone, { client, entries: entries.map(({ id, name, group }) => ({ id, name, group })) });

    const toCount = entries.slice(0, maxChats);
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < toCount.length) {
        const entry = toCount[next++];
        try {
          const fetched = await valid[entry.number - 1].fetchMessages({ limit: perChatLimit });
          const ids = new Set();
          const messages = fetched.filter(message => {
            const id = message.id?._serialized;
            if (!id) return true;
            if (ids.has(id)) return false;
            ids.add(id);
            return true;
          });
          entry.messages = messages.length;
          entry.outgoing = messages.filter(message => message.fromMe).length;
          entry.incoming = entry.messages - entry.outgoing;
          entry.capped = fetched.length >= perChatLimit;
        } catch {
          entry.messages = null;
        }
        done++;
        if (onProgress && (done % 25 === 0 || done === toCount.length)) onProgress(done, toCount.length);
        if (!stillConnected()) throw new Error('Account connection changed during the conversation report');
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, toCount.length)) }, worker));

    const counted = toCount.filter(entry => entry.messages !== null);
    const report = {
      phone,
      generatedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      perChatLimit,
      totalChats: entries.length,
      individualChats: entries.filter(entry => !entry.group).length,
      groupChats: entries.filter(entry => entry.group).length,
      unreadChats: entries.filter(entry => entry.unread > 0).length,
      unreadMessages: entries.reduce((sum, entry) => sum + entry.unread, 0),
      countedChats: counted.length,
      skippedChats: entries.length - counted.length,
      totalMessages: counted.reduce((sum, entry) => sum + entry.messages, 0),
      incoming: counted.reduce((sum, entry) => sum + entry.incoming, 0),
      outgoing: counted.reduce((sum, entry) => sum + entry.outgoing, 0),
      cappedChats: counted.filter(entry => entry.capped).length,
      last: entries[0] || null,
      busiest: [...counted].sort((a, b) => b.messages - a.messages)[0] || null,
      entries,
    };
    this.reports.set(phone, report);
    return report;
  }

  getReport(phone) {
    if (!phone) return null;
    if (this.reports.has(phone)) return this.reports.get(phone);
    const bare = String(phone).replace(/^\+/, '');
    for (const [key, report] of this.reports) if (key.replace(/^\+/, '') === bare) return report;
    return null;
  }

  clear(phone) {
    this.snapshots.delete(phone);
    this.reports.delete(phone);
  }
}
