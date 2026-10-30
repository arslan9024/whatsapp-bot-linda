import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ApiQueueWorker, { API_QUEUE_LIMIT_ID, apiQueueWorkerConfig } from '../../src/campaigns/ApiQueueWorker.js';
import CommunicationService from '../../src/database/services/CommunicationService.js';
import CommunicationLog from '../../src/database/schemas/CommunicationLogSchema.js';
import ContactConsentService from '../../src/campaigns/ContactConsentService.js';
import { DailyLimit } from '../../src/database/schemas/CampaignSchema.js';
import { campaignRateLimiter } from '../../src/campaigns/CampaignRateLimiter.js';

const MASTER = '+971500000001';
const RECIPIENT = '+971500000002';
const ALWAYS_OPEN = { startMinute: 0, endMinute: 24 * 60, timezone: 'UTC', warnings: [] };

// The persistence tests need a real mongod, so they are opt-in rather than faked:
// TEST_MONGODB_URI=<uri of a *test* database>, or TEST_MONGO_MEMORY=1 for mongodb-memory-server
// (on Windows that needs the Microsoft VC++ runtime).
const useMemoryServer = process.env.TEST_MONGO_MEMORY === '1';
const describeWithMongo = process.env.TEST_MONGODB_URI || useMemoryServer ? describe : describe.skip;
let memoryServer = null;

function fakes({ state = 'CONNECTED', sendResult = { id: { _serialized: 'm1' } }, allowed = true, budget = { allowed: true, isNew: false } } = {}) {
  const client = {
    getState: jest.fn().mockResolvedValue(state),
    sendMessage: jest.fn().mockImplementation(async () => {
      if (sendResult instanceof Error) throw sendResult;
      return sendResult;
    }),
  };
  const service = {
    expireStaleQueued: jest.fn().mockResolvedValue(0),
    processQueue: jest.fn().mockImplementation(async (sendFn) => {
      try {
        await sendFn(RECIPIENT, 'hello');
        return { success: true, stats: { processed: 1, sent: 1, failed: 0, skipped: 0 } };
      } catch (error) {
        service.lastError = error;
        return { success: true, stats: { processed: 1, sent: 0, failed: 1, skipped: 0 } };
      }
    }),
  };
  const rateLimiter = {
    WHATSAPP_DAILY_LIMIT: 45,
    canSendMessage: jest.fn().mockResolvedValue({ allowed, reason: allowed ? 'ok' : 'Daily limit reached' }),
    recordOutcome: jest.fn(),
  };
  const limits = { incrementDailySent: jest.fn().mockResolvedValue({}) };
  const log = jest.fn();
  const guard = { reserve: jest.fn().mockResolvedValue(budget) };
  const worker = new ApiQueueWorker({
    accountClients: new Map([[MASTER, client]]),
    accountConfigManager: { getMasterPhoneNumber: () => MASTER },
    logBot: log,
    config: { enabled: true, minIntervalMs: 3000, maxIntervalMs: 3000, maxAgeMs: 86400000 },
    workingHours: ALWAYS_OPEN,
    service, rateLimiter, limits,
    isDatabaseReady: () => true,
    newConversationGuard: guard,
  });
  return { worker, client, service, rateLimiter, limits, log, guard };
}

describe('ApiQueueWorker new-conversation budget', () => {
  const NOW = new Date('2030-01-10T08:00:00Z');

  test('a new conversation over budget is deferred to the next slot without sending', async () => {
    const retryAt = new Date('2030-01-10T20:00:00Z');
    const { worker, client, guard } = fakes({
      budget: { allowed: false, isNew: true, reason: 'daily new-conversation limit reached (2/2)', retryAt },
    });
    worker.now = () => NOW;
    const error = await worker.send(client, MASTER, RECIPIENT, 'hi', { queuedAt: NOW }).catch(e => e);
    expect(error).toMatchObject({ code: 'DEFERRED', deferUntil: retryAt });
    expect(guard.reserve).toHaveBeenCalledWith({ account: MASTER, client, phone: '971500000002', source: 'api' });
    expect(client.sendMessage).not.toHaveBeenCalled();
  });

  test('cancels instead of holding an API message beyond the queue age limit', async () => {
    const { worker, client } = fakes({
      budget: { allowed: false, isNew: true, reason: 'monthly new-conversation limit reached (30/30)', retryAt: new Date('2030-02-01T00:00:00Z') },
    });
    const error = await worker.send(client, MASTER, RECIPIENT, 'hi', { queuedAt: NOW }).catch(e => e);
    expect(error.code).toBe('NEW_CONVERSATION_LIMIT');
    expect(client.sendMessage).not.toHaveBeenCalled();
  });

  test('existing chats send normally', async () => {
    const { worker, client } = fakes();
    await worker.send(client, MASTER, RECIPIENT, 'hi');
    expect(client.sendMessage).toHaveBeenCalledWith('971500000002@c.us', 'hi');
  });
});

describe('ApiQueueWorker (unit)', () => {
  test('is off unless explicitly enabled', () => {
    expect(apiQueueWorkerConfig({}).enabled).toBe(false);
    expect(apiQueueWorkerConfig({ API_QUEUE_WORKER: '1' }).enabled).toBe(true);
    expect(apiQueueWorkerConfig({ API_QUEUE_MIN_INTERVAL_SEC: '1' }).minIntervalMs).toBe(3000);
    const { worker, log } = fakes();
    worker.config = { ...worker.config, enabled: false };
    expect(worker.start()).toBe(false);
    expect(worker.timer).toBeNull();
    expect(log.mock.calls[0][0]).toContain('API_QUEUE_WORKER=1');
  });

  test('outside working hours nothing is expired, claimed or sent', async () => {
    const { worker, client, service, rateLimiter } = fakes();
    worker.workingHours = { startMinute: 9 * 60, endMinute: 20 * 60, timezone: 'Asia/Dubai', warnings: [] };
    worker.now = () => new Date('2026-10-26T18:00:00Z'); // 22:00 in Dubai
    await expect(worker.tick()).resolves.toMatchObject({
      status: 'waiting',
      reason: 'working-hours',
      resumeInMs: 11 * 60 * 60 * 1000,
    });
    expect(client.getState).not.toHaveBeenCalled();
    expect(service.expireStaleQueued).not.toHaveBeenCalled();
    expect(service.processQueue).not.toHaveBeenCalled();
    expect(rateLimiter.canSendMessage).not.toHaveBeenCalled();

    worker.now = () => new Date('2026-10-26T06:00:00Z'); // 10:00 in Dubai
    await expect(worker.tick()).resolves.toMatchObject({ status: 'processed' });
  });

  test('does not touch the queue while the master is offline or the DB is down', async () => {
    const offline = fakes({ state: 'OPENING' });
    await expect(offline.worker.tick()).resolves.toMatchObject({ status: 'waiting', reason: 'master' });
    expect(offline.service.processQueue).not.toHaveBeenCalled();

    const noDb = fakes();
    noDb.worker.isDatabaseReady = () => false;
    await expect(noDb.worker.tick()).resolves.toMatchObject({ reason: 'database' });
    expect(noDb.service.processQueue).not.toHaveBeenCalled();
  });

  test('pauses without claiming a message when the daily cap or circuit breaker blocks', async () => {
    const { worker, service, rateLimiter } = fakes({ allowed: false });
    await expect(worker.tick()).resolves.toMatchObject({ status: 'limited' });
    expect(rateLimiter.canSendMessage).toHaveBeenCalledWith(API_QUEUE_LIMIT_ID, MASTER, 45);
    expect(service.processQueue).not.toHaveBeenCalled();
  });

  test('sends one message via the master and counts it toward the daily cap', async () => {
    const { worker, client, service, rateLimiter, limits } = fakes();
    await expect(worker.tick()).resolves.toMatchObject({ status: 'processed', sent: 1 });
    expect(service.processQueue).toHaveBeenCalledWith(expect.any(Function), 1, 0);
    expect(client.sendMessage).toHaveBeenCalledWith('971500000002@c.us', 'hello');
    expect(rateLimiter.recordOutcome).toHaveBeenCalledWith(MASTER, true);
    expect(limits.incrementDailySent).toHaveBeenCalledWith(API_QUEUE_LIMIT_ID, MASTER);
  });

  test('a send error is DELIVERY_UNKNOWN, trips the breaker and is not counted as sent', async () => {
    const { worker, service, rateLimiter, limits } = fakes({ sendResult: new Error('socket closed') });
    await worker.tick();
    expect(service.lastError.code).toBe('DELIVERY_UNKNOWN');
    expect(rateLimiter.recordOutcome).toHaveBeenCalledWith(MASTER, false);
    expect(limits.incrementDailySent).not.toHaveBeenCalled();
  });

  test('logs a repeated state only once to keep the terminal quiet', async () => {
    const { worker, service, log } = fakes();
    service.processQueue.mockResolvedValue({ success: true, stats: { processed: 0, sent: 0, failed: 0, skipped: 0 } });
    await worker.tick();
    await worker.tick();
    await worker.tick();
    expect(log.mock.calls.filter(([message]) => message.includes('no due messages'))).toHaveLength(1);
  });
});

describeWithMongo('API queue persistence (MongoDB)', () => {
  beforeAll(async () => {
    let mongoUri = process.env.TEST_MONGODB_URI;
    if (!mongoUri) {
      memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri('linda_api_queue_test');
    }
    await mongoose.connect(mongoUri);
    if (!/test/i.test(mongoose.connection.name)) {
      throw new Error(`Refusing to run destructive tests against database "${mongoose.connection.name}"; use a *test* database.`);
    }
  }, 120000);

  afterAll(async () => {
    if (/test/i.test(mongoose.connection.name)) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await memoryServer?.stop();
  });

  beforeEach(async () => {
    await Promise.all([CommunicationLog.deleteMany({}), DailyLimit.deleteMany({})]);
    campaignRateLimiter.recentFailures.clear();
    await ContactConsentService.setConsent(RECIPIENT, { granted: true, source: 'test', evidence: 'signed form' });
  });

  const queued = (fields = {}) => CommunicationLog.create({
    logId: CommunicationLog.generateLogId(),
    sentBy: 'api-test',
    recipientPhone: RECIPIENT,
    content: 'hello',
    status: 'queued',
    ...fields,
  });

  test('scheduled messages are not due before scheduledFor', async () => {
    await queued({ scheduledFor: new Date(Date.now() + 60 * 60 * 1000) });
    const due = await queued();
    const messages = await CommunicationLog.getQueuedMessages(10);
    expect(messages.map(message => message.logId)).toEqual([due.logId]);
  });

  test('stale messages are cancelled instead of sent', async () => {
    const old = await queued({ queuedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) });
    const fresh = await queued();
    expect(await CommunicationService.expireStaleQueued(24 * 60 * 60 * 1000)).toBe(1);
    expect((await CommunicationLog.findById(old._id)).status).toBe('cancelled');
    expect((await CommunicationLog.findById(fresh._id)).status).toBe('queued');
  });

  test('worker end to end: sends once, counts toward the account cap, uncertain sends are never retried', async () => {
    const ok = await queued();
    const client = {
      getState: async () => 'CONNECTED',
      sendMessage: jest.fn().mockResolvedValueOnce({ id: 'x' }).mockRejectedValueOnce(new Error('timeout')),
    };
    const worker = new ApiQueueWorker({
      accountClients: new Map([[MASTER, client]]),
      accountConfigManager: { getMasterPhoneNumber: () => MASTER },
      config: { enabled: true, minIntervalMs: 3000, maxIntervalMs: 3000, maxAgeMs: 86400000 },
    workingHours: ALWAYS_OPEN,
      newConversationGuard: { reserve: async () => ({ allowed: true, isNew: false }) },
    });

    await expect(worker.tick()).resolves.toMatchObject({ sent: 1 });
    expect((await CommunicationLog.findById(ok._id)).status).toBe('sent');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    expect((await DailyLimit.findOne({ campaignId: API_QUEUE_LIMIT_ID, accountNumber: MASTER, date: today })).sentCount).toBe(1);
    expect((await campaignRateLimiter.canSendMessage('other', MASTER, 10)).accountRemaining).toBe(44);

    const uncertain = await queued();
    await expect(worker.tick()).resolves.toMatchObject({ failed: 1 });
    const failed = await CommunicationLog.findById(uncertain._id);
    expect(failed).toMatchObject({ status: 'failed', errorCode: 'DELIVERY_UNKNOWN' });
    expect(await CommunicationLog.getFailedMessages(10)).toHaveLength(0);
    expect(client.sendMessage).toHaveBeenCalledTimes(2);
  });
});
