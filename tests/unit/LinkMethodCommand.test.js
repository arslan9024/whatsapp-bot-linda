import LindaCommandHandler from '../../src/commands/LindaCommandHandler.js';
import services from '../../src/core/ServiceRegistry.js';

jest.mock('../../src/commands/LindaConversationLearner.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ logCommand: jest.fn().mockResolvedValue(undefined) })),
}));
jest.mock('../../src/commands/CampaignCommands.js', () => ({
  __esModule: true, default: {},
}));

describe('Direct WhatsApp linking commands', () => {
  let handler;
  let linking;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    linking = { isLinking: false, initiateMasterAccountLinking: jest.fn().mockResolvedValue(true) };
    services.register('manualLinkingHandler', linking);
    services.register('accountConfigManager', { getMasterPhoneNumber: () => '+15551234567' });
    handler = new LindaCommandHandler(jest.fn());
  });

  afterEach(() => {
    services.clear();
  });

  function message(body, { admin = true, author = '15557654321@lid', from = '12345@g.us', fromMe = false } = {}) {
    return {
      body, from, author, fromMe,
      reply: jest.fn().mockResolvedValue(undefined),
      getChat: jest.fn().mockResolvedValue({
        isGroup: true,
        participants: [{ id: { _serialized: author }, isAdmin: admin, isSuperAdmin: false }],
      }),
    };
  }

  test.each(['code', 'qr'])('group admin starts %s linking immediately', async method => {
    const msg = message(`!link-${method}`);
    const result = await handler.processMessage(msg, '+15551234567', { isMasterAccount: true });
    expect(result.processed).toBe(true);
    expect(linking.initiateMasterAccountLinking).toHaveBeenCalledWith(method);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('for this attempt only'));
    expect(msg.reply.mock.invocationCallOrder[0]).toBeLessThan(
      linking.initiateMasterAccountLinking.mock.invocationCallOrder[0]
    );
  });

  test('old preference command explains direct commands and does not start linking', async () => {
    const msg = message('!link-method code');
    expect((await handler.processMessage(msg, '+15551234567')).processed).toBe(true);
    expect(linking.initiateMasterAccountLinking).not.toHaveBeenCalled();
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('no longer saved'));
  });

  test('ordinary members cannot start linking even if the bot session is authenticated', async () => {
    handler.sessionAuth.set('+15551234567', { timestamp: Date.now(), authenticated: true });
    const msg = message('!link-code', { admin: false });
    expect((await handler.processMessage(msg, '+15551234567')).processed).toBe(false);
    expect(linking.initiateMasterAccountLinking).not.toHaveBeenCalled();
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Only group admins'));
  });

  test('configured master can start linking without group admin status', async () => {
    const msg = message('!link-qr', { admin: false, author: '15551234567@c.us' });
    expect((await handler.processMessage(msg, '+15551234567')).processed).toBe(true);
    expect(linking.initiateMasterAccountLinking).toHaveBeenCalledWith('qr');
  });

  test('missing group senders are denied', async () => {
    const msg = message('!link-code', { admin: false });
    msg.author = undefined;
    expect((await handler.processMessage(msg, '+15551234567')).processed).toBe(false);
    expect(linking.initiateMasterAccountLinking).not.toHaveBeenCalled();
  });

  test('unrelated private sender cannot start linking', async () => {
    const msg = message('!link-qr', { from: '15557654321@c.us' });
    expect((await handler.processMessage(msg, '+15551234567')).processed).toBe(false);
    expect(msg.getChat).not.toHaveBeenCalled();
  });

  test.each(['!link-code qr', '!link-qr code'])('rejects extra arguments: %s', async body => {
    const msg = message(body);
    expect((await handler.processMessage(msg, '+15551234567')).error).toBe('invalid-args');
    expect(linking.initiateMasterAccountLinking).not.toHaveBeenCalled();
  });

  test('reports linking failure explicitly', async () => {
    linking.initiateMasterAccountLinking.mockResolvedValue(false);
    const msg = message('!link-code');
    expect((await handler.processMessage(msg, '+15551234567')).processed).toBe(false);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Master linking failed'));
  });

  test('does not start a second attempt while one is in progress', async () => {
    linking.isLinking = true;
    const msg = message('!link-qr');
    expect((await handler.processMessage(msg, '+15551234567')).processed).toBe(false);
    expect(linking.initiateMasterAccountLinking).not.toHaveBeenCalled();
  });
});
