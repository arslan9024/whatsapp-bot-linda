import {
  TerminalConversationAnalysis, conversationReportLines, conversationSummaryLines,
} from '../../src/terminal/TerminalConversationAnalysis.js';

describe('Explicit local read-only conversation samples', () => {
  const phone = '+15550000001';
  let client;
  let clients;
  let fetchMessages;
  let output;
  let analysis;
  let managers;

  beforeEach(() => {
    fetchMessages = jest.fn().mockResolvedValue([
      { id: { _serialized: 'one' }, fromMe: false, body: 'Private question?', timestamp: 1 },
      { id: { _serialized: 'one' }, fromMe: false, body: 'Duplicate', timestamp: 1 },
      { id: { _serialized: 'two' }, fromMe: true, body: 'Private response', timestamp: 2, hasMedia: true },
    ]);
    client = {
      getState: jest.fn().mockResolvedValue('CONNECTED'),
      getChats: jest.fn().mockResolvedValue([
        { id: { _serialized: 'one@c.us' }, name: 'Customer', isGroup: false },
        { id: { _serialized: 'two@g.us' }, name: 'Team', isGroup: true },
        { id: { _serialized: 'status@broadcast' }, name: 'Excluded' },
      ]),
      getChatById: jest.fn().mockResolvedValue({ fetchMessages }),
      sendMessage: jest.fn(),
      sendSeen: jest.fn(),
    };
    clients = new Map([[phone, client]]);
    managers = new Map([[phone, { state: 'CONNECTED' }]]);
    output = jest.fn();
    analysis = new TerminalConversationAnalysis({
      accountClients: clients, output,
      getFlowDeps: () => ({
        connectionManagers: managers,
        sharedContext: { accountConfigManager: {
          getAllAccounts: () => [{ phoneNumber: phone }], getMasterPhoneNumber: () => phone,
        } },
      }),
    });
  });

  test('listing chats fetches no message history and uses configured master by default', async () => {
    expect(await analysis.list()).toBe(2);
    expect(fetchMessages).not.toHaveBeenCalled();
    expect(client.getChatById).not.toHaveBeenCalled();
    expect(output).toHaveBeenCalledWith(expect.stringContaining('1. Customer'));
  });

  test('analysis reads only explicitly selected chat, deduplicates, and never prints bodies or sends messages', async () => {
    await analysis.list(phone);
    const result = await analysis.analyze(phone, '2', '100');
    expect(client.getChatById).toHaveBeenCalledWith('two@g.us');
    expect(fetchMessages).toHaveBeenCalledWith({ limit: 100 });
    expect(result).toEqual({ messages: 2, incoming: 1, outgoing: 1, media: 1, incomingQuestions: 1, latestDirection: 'outgoing' });
    expect(output.mock.calls.flat().join('\n')).not.toContain('Private');
    expect(client.sendMessage).not.toHaveBeenCalled();
    expect(client.sendSeen).not.toHaveBeenCalled();
  });

  test.each(['0', '-1', '501', '1.5', '1e2', 'NaN'])('invalid sample limit %s never reads history', async limit => {
    await analysis.list(phone);
    await expect(analysis.analyze(phone, '1', limit)).rejects.toThrow('Message limit');
    expect(fetchMessages).not.toHaveBeenCalled();
  });

  test('replaced clients invalidate previously displayed chat numbers', async () => {
    await analysis.list(phone);
    clients.set(phone, { ...client });
    await expect(analysis.analyze(phone, '1')).rejects.toThrow('Run chats');
    expect(fetchMessages).not.toHaveBeenCalled();
  });

  test('offline accounts cannot list or analyze conversations', async () => {
    managers.get(phone).state = 'DISCONNECTED';
    await expect(analysis.list(phone)).rejects.toThrow('not active');
    expect(client.getChats).not.toHaveBeenCalled();
  });

  test('number selection requires a current list and rejects out-of-range chats', async () => {
    await expect(analysis.analyze(phone, '1')).rejects.toThrow('Run chats');
    await analysis.list(phone);
    await expect(analysis.analyze(phone, '3')).rejects.toThrow('Unknown chat');
  });

  test('paged chat numbers remain stable until page one is refreshed', async () => {
    client.getChats.mockResolvedValue(Array.from({ length: 21 }, (_, index) => ({
      id: { _serialized: `${index}@c.us` }, name: `Chat ${index + 1}`,
    })));
    await analysis.list(phone);
    await analysis.list(phone, '2');
    expect(client.getChats).toHaveBeenCalledTimes(1);
    expect(output.mock.calls.at(-1)[0]).toContain('21. Chat 21');
    await analysis.analyze(phone, '21', '500');
    expect(client.getChatById).toHaveBeenCalledWith('20@c.us');
  });

  test('chat names cannot inject terminal control characters', async () => {
    client.getChats.mockResolvedValue([{ id: { _serialized: 'one@c.us' }, name: '\x1b[2J\nhidden' }]);
    await analysis.list(phone);
    expect(output.mock.calls[0][0]).not.toContain('\x1b');
  });

  test('a disconnect while history is loading prevents a stale analysis report', async () => {
    await analysis.list(phone);
    output.mockClear();
    fetchMessages.mockImplementation(async () => {
      managers.get(phone).state = 'DISCONNECTED';
      return [];
    });
    await expect(analysis.analyze(phone, '1')).rejects.toThrow('connection changed');
    expect(output).not.toHaveBeenCalled();
  });

  describe('conversation overview report', () => {
    const chat = (id, name, timestamp, messages, extra = {}) => ({
      id: { _serialized: id, user: id.split('@')[0] }, name, timestamp,
      fetchMessages: jest.fn().mockResolvedValue(messages), ...extra,
    });
    const msgs = (count, outgoing = 0) => Array.from({ length: count }, (_, i) => ({
      id: { _serialized: `m${i}` }, fromMe: i < outgoing,
    }));

    test('counts all chats, messages per chat and finds the last conversation', async () => {
      client.getChats.mockResolvedValue([
        chat('old@c.us', 'Old friend', 100, msgs(3, 1)),
        chat('new@c.us', 'Newest', 300, msgs(5, 2), { unreadCount: 2, lastMessage: { body: 'See you\x1b[2J soon', fromMe: false } }),
        chat('team@g.us', 'Team', 200, msgs(4), { isGroup: true }),
        chat('status@broadcast', 'Status', 400, msgs(9)),
      ]);
      const progress = jest.fn();
      const report = await analysis.overview(phone, { onProgress: progress });
      expect(report).toMatchObject({
        phone, totalChats: 3, individualChats: 2, groupChats: 1, unreadChats: 1, unreadMessages: 2,
        countedChats: 3, totalMessages: 12, outgoing: 3, incoming: 9, cappedChats: 0,
      });
      expect(report.entries.map(entry => [entry.number, entry.name, entry.messages])).toEqual([
        [1, 'Newest', 5], [2, 'Team', 4], [3, 'Old friend', 3],
      ]);
      expect(report.last.name).toBe('Newest');
      expect(report.last.lastPreview).not.toContain('\x1b');
      expect(report.busiest.name).toBe('Newest');
      expect(progress).toHaveBeenLastCalledWith(3, 3);
      expect(analysis.getReport(phone.slice(1))).toBe(report);
      expect(client.sendMessage).not.toHaveBeenCalled();
      expect(client.sendSeen).not.toHaveBeenCalled();

      const summary = conversationSummaryLines(report, { now: 400 * 1000 }).join('\n');
      expect(summary).toContain('Conversations: 3 (2 people, 1 groups)');
      expect(summary).toContain('Last conversation: #1 Newest');
      expect(summary).toContain('#2 Team 4');
      const table = conversationReportLines(report).join('\n');
      expect(table).toContain('CONVERSATION REPORT');
      expect(table).toMatch(/3 {2}Old friend/);
    });

    test('marks capped counts, tolerates failing chats, and binds analyze numbers to the report', async () => {
      const broken = chat('broken@c.us', 'Broken', 50, []);
      broken.fetchMessages.mockRejectedValue(new Error('boom'));
      client.getChats.mockResolvedValue([chat('big@c.us', 'Big', 90, msgs(2)), broken]);
      const report = await analysis.overview(phone, { perChatLimit: 2 });
      expect(report.entries[0]).toMatchObject({ messages: 2, capped: true });
      expect(report.entries[1].messages).toBeNull();
      expect(report).toMatchObject({ countedChats: 1, skippedChats: 1, cappedChats: 1 });
      expect(conversationSummaryLines(report)[0]).toContain('Messages counted: 2+');
      client.getChatById.mockResolvedValue({ fetchMessages });
      await analysis.analyze(phone, '2');
      expect(client.getChatById).toHaveBeenCalledWith('broken@c.us');
    });

    test('inbox counts read only the chat list: conversations and unread messages', async () => {
      const fetch = jest.fn();
      client.getChats.mockResolvedValue([
        { id: { _serialized: 'a@c.us' }, unreadCount: 3, fetchMessages: fetch },
        { id: { _serialized: 'a@c.us' }, unreadCount: 3, fetchMessages: fetch },
        { id: { _serialized: 'b@c.us' }, unreadCount: 0, fetchMessages: fetch },
        { id: { _serialized: 'team@g.us' }, isGroup: true, unreadCount: 4, fetchMessages: fetch },
        { id: { _serialized: 'status@broadcast' }, unreadCount: 9, fetchMessages: fetch },
      ]);
      const counts = await analysis.counts(phone);
      expect(counts).toMatchObject({ phone, totalChats: 3, people: 2, groups: 1, unreadChats: 2, unreadMessages: 7 });
      expect(analysis.getCounts(phone.slice(1))).toBe(counts);
      expect(fetch).not.toHaveBeenCalled();
      expect(client.sendSeen).not.toHaveBeenCalled();
      managers.get(phone).state = 'DISCONNECTED';
      await expect(analysis.counts(phone)).rejects.toThrow('not active');
    });

    test('inbox counters follow WhatsApp events in O(1) without re-reading chats', async () => {
      const { EventEmitter } = await import('node:events');
      const live = Object.assign(new EventEmitter(), client);
      clients.set(phone, live);
      const changes = jest.fn();
      analysis.onInboxChange = changes;
      live.getChats = jest.fn().mockResolvedValue([
        { id: { _serialized: 'a@c.us' }, unreadCount: 3 },
        { id: { _serialized: 'team@g.us' }, isGroup: true, unreadCount: 0 },
      ]);
      live.getState = jest.fn().mockResolvedValue('CONNECTED');
      await analysis.counts(phone);
      const now = () => analysis.getCounts(phone);
      expect(now()).toMatchObject({ totalChats: 2, unreadChats: 1, unreadMessages: 3 });

      live.emit('message', { fromMe: false, from: 'a@c.us', id: { remote: 'a@c.us' } });
      expect(now()).toMatchObject({ totalChats: 2, unreadChats: 1, unreadMessages: 3 });
      live.emit('unread_count', { id: { _serialized: 'a@c.us' }, unreadCount: 4 });
      expect(now().unreadMessages).toBe(4);

      live.emit('unread_count', { id: { _serialized: 'team@g.us' }, isGroup: true, unreadCount: 2 });
      live.emit('message', { fromMe: false, from: 'team@g.us', id: { remote: 'team@g.us' } });
      expect(now()).toMatchObject({ unreadChats: 2, unreadMessages: 6 });

      live.emit('message', { fromMe: false, from: 'new@c.us', id: { remote: 'new@c.us' } });
      expect(now()).toMatchObject({ totalChats: 3, unreadChats: 2, unreadMessages: 6 });
      live.emit('unread_count', { id: { _serialized: 'new@c.us' }, unreadCount: 1 });
      expect(now()).toMatchObject({ totalChats: 3, people: 2, groups: 1, unreadChats: 3, unreadMessages: 7 });
      live.emit('message', { fromMe: true, from: 'me@c.us', id: { remote: 'a@c.us' } });
      live.emit('message', { fromMe: false, from: 'status@broadcast', id: { remote: 'status@broadcast' } });
      expect(now().unreadMessages).toBe(7);

      live.emit('unread_count', { id: { _serialized: 'a@c.us' }, unreadCount: 0 });
      expect(now()).toMatchObject({ unreadChats: 2, unreadMessages: 3 });
      live.emit('chat_removed', { id: { _serialized: 'new@c.us' } });
      expect(now()).toMatchObject({ totalChats: 2, unreadChats: 1, unreadMessages: 2 });
      expect(live.getChats).toHaveBeenCalledTimes(1);
      expect(changes).toHaveBeenCalled();

      clients.set(phone, client);
      expect(analysis.getCounts(phone)).toBeNull();
    });

    test('rapid and duplicate events use exact deltas, never a time-window guess', async () => {
      const { EventEmitter } = await import('node:events');
      const live = Object.assign(new EventEmitter(), client);
      clients.set(phone, live);
      live.getChats.mockResolvedValue([{ id: { _serialized: 'a@c.us' }, unreadCount: 3 }]);
      analysis.onInboxChange = jest.fn();
      await analysis.counts(phone);
      const message = { from: 'a@c.us', id: { remote: 'a@c.us' } };
      live.emit('unread_count', { id: { _serialized: 'a@c.us' }, unreadCount: 4 });
      live.emit('message', message);
      live.emit('message_create', message);
      live.emit('message', message);
      expect(analysis.getCounts(phone).unreadMessages).toBe(4);
      expect(analysis.onInboxChange).toHaveBeenCalledTimes(1);
      live.emit('unread_count', { id: { _serialized: 'a@c.us' }, unreadCount: 4 });
      expect(analysis.onInboxChange).toHaveBeenCalledTimes(1);
      live.emit('message', message);
      live.emit('unread_count', { id: { _serialized: 'a@c.us' }, unreadCount: 5 });
      expect(analysis.getCounts(phone).unreadMessages).toBe(5);
      live.emit('unread_count', { id: { _serialized: 'a@c.us' }, unreadCount: 0 });
      expect(analysis.getCounts(phone)).toMatchObject({ unreadMessages: 0, unreadChats: 0 });
      live.emit('message_create', { fromMe: true, to: 'new@c.us' });
      expect(analysis.getCounts(phone)).toMatchObject({ totalChats: 2, unreadMessages: 0 });
      await analysis.counts(phone);
      expect(live.getChats).toHaveBeenCalledTimes(1);
      expect(live.listenerCount('unread_count')).toBe(1);
    });

    test('events during baseline loading win over an older snapshot without losing new chats', async () => {
      const { EventEmitter } = await import('node:events');
      const live = Object.assign(new EventEmitter(), client);
      clients.set(phone, live);
      let finish;
      live.getChats.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
      const baseline = analysis.counts(phone);
      await new Promise(resolve => setImmediate(resolve));
      const joined = analysis.counts(phone);
      live.emit('unread_count', { id: { _serialized: 'a@c.us' }, unreadCount: 4 });
      live.emit('chat_removed', { id: { _serialized: 'removed@c.us' } });
      live.emit('message', { from: 'new@c.us' });
      live.emit('message', { from: 'existing@c.us' });
      expect(analysis.getCounts(phone)).toBeNull();
      finish([
        { id: { _serialized: 'a@c.us' }, unreadCount: 3 },
        { id: { _serialized: 'removed@c.us' }, unreadCount: 9 },
        { id: { _serialized: 'existing@c.us' }, unreadCount: 2 },
      ]);
      expect(await baseline).toMatchObject({ totalChats: 3, unreadMessages: 6, unreadChats: 2 });
      expect(await joined).toBe(analysis.getCounts(phone));
      expect(live.getChats).toHaveBeenCalledTimes(1);
      expect(live.listenerCount('message')).toBe(1);
    });

    test('a failed baseline can be retried without duplicated event listeners', async () => {
      const { EventEmitter } = await import('node:events');
      const live = Object.assign(new EventEmitter(), client);
      clients.set(phone, live);
      live.getChats.mockRejectedValueOnce(new Error('Chat list unavailable')).mockResolvedValue([]);
      await expect(analysis.counts(phone)).rejects.toThrow('Chat list unavailable');
      expect(analysis.getCounts(phone)).toBeNull();
      await analysis.counts(phone);
      live.emit('unread_count', { id: { _serialized: 'a@c.us' }, unreadCount: 4 });
      expect(analysis.getCounts(phone)).toMatchObject({ totalChats: 1, unreadMessages: 4 });
      expect(live.listenerCount('unread_count')).toBe(1);
      managers.get(phone).state = 'DISCONNECTED';
      live.emit('unread_count', { id: { _serialized: 'a@c.us' }, unreadCount: 7 });
      expect(analysis.getCounts(phone)).toBeNull();
    });

    test('a ready lifecycle refreshes the baseline without registering duplicate listeners', async () => {
      const { EventEmitter } = await import('node:events');
      const live = Object.assign(new EventEmitter(), client);
      clients.set(phone, live);
      live.getChats.mockResolvedValue([{ id: { _serialized: 'a@c.us' }, unreadCount: 3 }]);
      await analysis.counts(phone);
      live.getChats.mockResolvedValue([{ id: { _serialized: 'a@c.us' }, unreadCount: 4 }]);
      await analysis.counts(phone, { refresh: true });
      expect(analysis.getCounts(phone).unreadMessages).toBe(4);
      expect(live.getChats).toHaveBeenCalledTimes(2);
      expect(live.listenerCount('unread_count')).toBe(1);
      live.emit('unread_count', { id: { _serialized: 'a@c.us' }, unreadCount: 5 });
      expect(analysis.getCounts(phone).unreadMessages).toBe(5);
    });

    test('a disconnect during the report aborts it and stores nothing', async () => {
      const only = chat('a@c.us', 'A', 1, []);
      only.fetchMessages.mockImplementation(async () => {
        managers.get(phone).state = 'DISCONNECTED';
        return [];
      });
      client.getChats.mockResolvedValue([only]);
      await expect(analysis.overview(phone)).rejects.toThrow('connection changed');
      expect(analysis.getReport(phone)).toBeNull();
    });
  });
});
