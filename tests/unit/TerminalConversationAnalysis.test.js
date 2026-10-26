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
