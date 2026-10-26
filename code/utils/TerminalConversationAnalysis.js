const positiveInteger = (value, maximum, label) => {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > maximum) {
    throw new Error(`${label} must be an integer between 1 and ${maximum}`);
  }
  return Number(value);
};
const safeLabel = value => String(value).replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').slice(0, 100);

export class TerminalConversationAnalysis {
  constructor({ accountClients, getFlowDeps, output = console.log }) {
    this.accountClients = accountClients;
    this.getFlowDeps = getFlowDeps;
    this.output = output;
    this.snapshots = new Map();
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
      const chats = await client.getChats();
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

  clear(phone) {
    this.snapshots.delete(phone);
  }
}
