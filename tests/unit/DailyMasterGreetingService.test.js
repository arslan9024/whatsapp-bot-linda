import { jest } from '@jest/globals';
import { DailyMasterGreetingService } from '../../src/services/DailyMasterGreetingService.js';

describe('DailyMasterGreetingService', () => {
  let service;
  let mockAcm;
  let mockClients;
  let mockMasterClient;
  let logOutput;

  beforeEach(() => {
    logOutput = [];
    const logBot = (msg, level) => logOutput.push({ msg, level });

    mockMasterClient = {
      getState: jest.fn().mockResolvedValue('CONNECTED'),
      sendMessage: jest.fn().mockResolvedValue({ id: 'msg-123' }),
    };

    mockClients = new Map([
      ['+971505760056', mockMasterClient],
    ]);

    mockAcm = {
      getMasterPhoneNumber: jest.fn().mockReturnValue('+971505760056'),
      getAllMasterAccounts: jest.fn().mockReturnValue([
        { phoneNumber: '+971505760056', displayName: 'Arslan Malik', role: 'primary' },
        { phoneNumber: '+971553633595', displayName: 'Big Broker', role: 'primary' },
        { phoneNumber: '+971589969886', displayName: 'Master 971589969886', role: 'primary' },
      ]),
    };

    service = new DailyMasterGreetingService({
      accountConfigManager: mockAcm,
      accountClients: mockClients,
      sendIntervalMs: 0, // fast testing
      logBot,
    });
  });

  afterEach(() => {
    service.stop();
  });

  test('skips daily greetings if primary master client is offline or not CONNECTED', async () => {
    mockMasterClient.getState.mockResolvedValueOnce('DISCONNECTED');

    const result = await service.sendGreetingsNow();
    expect(result.success).toBe(false);
    expect(result.reason).toBe('master_offline');
    expect(mockMasterClient.sendMessage).not.toHaveBeenCalled();
    expect(logOutput.some(l => l.msg.includes('Primary master (+971505760056) is offline'))).toBe(true);
  });

  test('skips daily greetings if master client is not initialized', async () => {
    mockClients.clear();

    const result = await service.sendGreetingsNow();
    expect(result.success).toBe(false);
    expect(result.reason).toBe('client_not_initialized');
    expect(mockMasterClient.sendMessage).not.toHaveBeenCalled();
  });

  test('sends formatted Dubai greetings to all registered master accounts when online', async () => {
    const result = await service.sendGreetingsNow();

    expect(result.success).toBe(true);
    expect(result.sentCount).toBe(3);
    expect(result.total).toBe(3);
    expect(mockMasterClient.sendMessage).toHaveBeenCalledTimes(3);

    // Verify JIDs and content
    expect(mockMasterClient.sendMessage).toHaveBeenCalledWith(
      '971505760056@c.us',
      expect.stringContaining('Good Morning Arslan Malik!')
    );
    expect(mockMasterClient.sendMessage).toHaveBeenCalledWith(
      '971553633595@c.us',
      expect.stringContaining('Good Morning Big Broker!')
    );
    expect(mockMasterClient.sendMessage).toHaveBeenCalledWith(
      '971589969886@c.us',
      expect.stringContaining('GST / Dubai')
    );
  });

  test('continues sending to other masters if one message fails', async () => {
    mockMasterClient.sendMessage
      .mockResolvedValueOnce({ id: '1' })
      .mockRejectedValueOnce(new Error('Network drop on recipient'))
      .mockResolvedValueOnce({ id: '3' });

    const result = await service.sendGreetingsNow();

    expect(result.success).toBe(true);
    expect(result.sentCount).toBe(2);
    expect(mockMasterClient.sendMessage).toHaveBeenCalledTimes(3);
    expect(logOutput.some(l => l.msg.includes('Failed to send greeting to +971553633595'))).toBe(true);
  });

  test('formats greeting message with Dubai indicators', () => {
    const message = service.formatGreetingMessage('Arslan', 'Friday, October 30, 2026', '09:00 AM');
    expect(message).toContain('Good Morning Arslan!');
    expect(message).toContain('Friday, October 30, 2026');
    expect(message).toContain('09:00 AM (GST / Dubai)');
    expect(message).toContain('Online & Active');
  });

  test('start and stop controls scheduling lifecycle', () => {
    expect(service.getStatus().isRunning).toBe(false);
    service.start();
    expect(service.getStatus().isRunning).toBe(true);
    service.stop();
    expect(service.getStatus().isRunning).toBe(false);
  });
});
