import { SupervisorAlertDispatcher } from '../../src/intelligence/SupervisorAlertDispatcher.js';

describe('SupervisorAlertDispatcher (Telegram & Webhook Alerting)', () => {
  it('dispatches hot lead alerts via mock fetch', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

    const dispatcher = new SupervisorAlertDispatcher({
      telegramBotToken: 'mock_token',
      telegramChatId: '123456789',
      fetchImpl: mockFetch,
    });

    const res = await dispatcher.notifyHotLead({
      ownerName: 'Rashid Al Maktoum',
      phone: '+971501234567',
      tier: 'HOT',
      text: 'I want to sell my villa in Amazon cluster immediately for cash.',
      assignedAgent: 'Agent John',
    });

    expect(res.sent).toBe(true);
    expect(res.provider).toBe('telegram');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('api.telegram.org/botmock_token/sendMessage');
    const body = JSON.parse(options.body);
    expect(body.chat_id).toBe('123456789');
    expect(body.text).toContain('HOT LEAD DETECTED');
    expect(body.text).toContain('••••••4567');
  });

  it('dispatches 24h SLA breach alert via webhook', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true });

    const dispatcher = new SupervisorAlertDispatcher({
      webhookUrl: 'https://hooks.slack.com/services/test/mock',
      fetchImpl: mockFetch,
    });

    const res = await dispatcher.notifySlaBreach({
      ownerName: 'Sara Smith',
      clientPhone: '+971509998888',
      assignedAgentPhone: '+971501112222',
      elapsedHours: 26,
    });

    expect(res.sent).toBe(true);
    expect(res.provider).toBe('webhook');
    expect(mockFetch).toHaveBeenCalledWith('https://hooks.slack.com/services/test/mock', expect.any(Object));
  });

  it('handles network failure gracefully without throwing', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const dispatcher = new SupervisorAlertDispatcher({
      telegramBotToken: 'mock_token',
      telegramChatId: '123456789',
      fetchImpl: mockFetch,
    });

    const res = await dispatcher.notifyAccountState('+971501112222', 'DISCONNECTED', 'Session expired');
    expect(res.sent).toBe(false);
    expect(res.provider).toBe('error');
    expect(res.error).toBe('Network error');
  });
});
