import { TerminalConversationAnalysis } from '../../src/terminal/TerminalConversationAnalysis.js';

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
});
