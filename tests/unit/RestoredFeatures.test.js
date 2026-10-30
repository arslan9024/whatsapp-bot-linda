import fs from 'fs';
import os from 'os';
import path from 'path';
import { normalizePhone } from '../../src/services/DeduplicationService.js';
import HealthScorer from '../../src/accounts/HealthScorer.js';
import {
  sentimentLines, intentLines, similarLines, dedupeLines, validateLines,
  scoreLines, pickClient, sendSingleMessage,
} from '../../src/terminal/TerminalFeatureCommands.js';

describe('restored intelligence commands', () => {
  test('sentiment separates positive and negative text', () => {
    expect(sentimentLines('Thank you, this is great and excellent! 😊')[0]).toMatch(/Sentiment: .* score 0\.\d\d|score [1-9]/);
    expect(sentimentLines('This is terrible, awful and bad 😡')[0]).toMatch(/score -/);
  });

  test('intent returns an intent with confidence', () => {
    const lines = intentLines('What is the price of the villa?');
    expect(lines[0]).toMatch(/^Intent: \w+ \| confidence \d+%/);
  });

  test('similar compares names and phone numbers', () => {
    expect(similarLines('0501234567 | +971 50 123 4567')[0]).toContain('SAME CONTACT');
    expect(similarLines('Mohammed Ali | Mohamed Ali')[0]).toMatch(/LIKELY DUPLICATE|POSSIBLE MATCH/);
    expect(similarLines('only one')[0]).toMatch(/^Usage/);
  });

  test('normalizePhone applies the UAE default and keeps international numbers', () => {
    expect(normalizePhone('050 123 4567').formatted).toBe('+971501234567');
    expect(normalizePhone('+44 7700 900123').formatted).toBe('+447700900123');
    expect(normalizePhone('').isValid).toBe(false);
  });

  test('dedupe finds exact and possible duplicates in a JSON file', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dedupe-'));
    const file = path.join(dir, 'contacts.json');
    fs.writeFileSync(file, JSON.stringify([
      { Name: 'Ali Khan', Phone: '0501234567' },
      { Name: 'Ali Khan', Phone: '0501234567' },
      { Name: 'Sara Ahmed', Phone: '0559876543' },
    ]));
    try {
      const lines = await dedupeLines(file);
      expect(lines[0]).toMatch(/^Dedupe: 3 rows/);
      expect(lines[0]).toMatch(/unique 2/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('validate reports format and WhatsApp registration', async () => {
    const client = { getNumberId: jest.fn().mockResolvedValue({ _serialized: '971501234567@c.us' }) };
    const lines = await validateLines('0501234567', client);
    expect(lines[0]).toContain('+971501234567');
    expect(lines.join('\n')).toContain('VALID');
    expect(lines.join('\n')).toContain('REGISTERED');
    expect((await validateLines('0501234567')).join('\n')).toContain('skipped');
  });
});

describe('HealthScorer (no database)', () => {
  test('scores metrics, keeps in-memory history and caps offline devices', async () => {
    const scorer = new HealthScorer();
    const report = await scorer.calculateScore({ phoneNumber: '+1', metrics: {} });
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(Number.isNaN(report.overallScore)).toBe(false);
    expect((await scorer.getHistory('+1', 10)).length).toBe(1);

    const managers = new Map([['+971501234567', { state: 'DISCONNECTED', metrics: { totalConnections: 5 } }]]);
    const lines = await scoreLines(managers);
    expect(lines[0]).toMatch(/^\+971501234567: ([0-9]|[1-3][0-9])\/100 CRITICAL \(offline\)/);
    expect((await scoreLines(new Map()))[0]).toMatch(/No connections/);
  });
});

describe('single message helpers', () => {
  test('pickClient prefers the requested connected phone', () => {
    const clients = new Map([['+1', 'a'], ['+2', 'b']]);
    const managers = new Map([['+1', { state: 'DISCONNECTED' }], ['+2', { state: 'CONNECTED' }]]);
    expect(pickClient(clients, managers, '+1')).toEqual({ phone: '+2', client: 'b' });
    expect(pickClient(clients, new Map(), '+1')).toBeNull();
  });

  test('sendSingleMessage resolves the WhatsApp id and sends', async () => {
    const client = {
      getNumberId: jest.fn().mockResolvedValue({ _serialized: '971501234567@c.us' }),
      sendMessage: jest.fn().mockResolvedValue({ id: { _serialized: 'msg1' } }),
    };
    await expect(sendSingleMessage(client, '0501234567', 'hi')).resolves.toEqual({ to: '+971501234567', id: 'msg1' });
    expect(client.sendMessage).toHaveBeenCalledWith('971501234567@c.us', 'hi');
    client.getNumberId.mockResolvedValue(null);
    await expect(sendSingleMessage(client, '0501234567', 'hi')).rejects.toThrow(/not on WhatsApp/);
  });

  test('sendSingleMessage blocks a new conversation over the budget without sending', async () => {
    const client = {
      getNumberId: jest.fn().mockResolvedValue({ _serialized: '971501234567@c.us' }),
      sendMessage: jest.fn(),
    };
    const guard = {
      reserve: jest.fn().mockResolvedValue({
        allowed: false, isNew: true, reason: 'daily new-conversation limit reached (2/2)', retryAt: new Date('2030-01-02T00:00:00Z'),
      }),
    };
    await expect(sendSingleMessage(client, '0501234567', 'hi', { guard, account: '+971500000001' }))
      .rejects.toMatchObject({ code: 'NEW_CONVERSATION_LIMIT' });
    expect(guard.reserve).toHaveBeenCalledWith({ account: '+971500000001', client, phone: '971501234567', source: 'terminal' });
    expect(client.sendMessage).not.toHaveBeenCalled();
  });
});
