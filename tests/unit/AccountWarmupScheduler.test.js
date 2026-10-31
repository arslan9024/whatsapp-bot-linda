import fs from 'fs';
import path from 'path';
import { AccountWarmupScheduler, WARMUP_SCHEDULE } from '../../src/anti-ban/AccountWarmupScheduler.js';

describe('AccountWarmupScheduler (Pillar 2 - Graduated Outreach)', () => {
  const testStorage = path.resolve('data', 'test-warmup.json');

  beforeEach(() => {
    if (fs.existsSync(testStorage)) {
      fs.unlinkSync(testStorage);
    }
  });

  afterAll(() => {
    if (fs.existsSync(testStorage)) {
      fs.unlinkSync(testStorage);
    }
  });

  it('restricts brand new account (day 0) to Stage 1 limit (1 new lead/day)', () => {
    const scheduler = new AccountWarmupScheduler({ storagePath: testStorage });
    const phone = '+971501112233';

    scheduler.registerAccount(phone, new Date());

    const status = scheduler.getWarmupStatus(phone);
    expect(status.ageDays).toBe(0);
    expect(status.allowed).toBe(1);
    expect(status.stage).toBe('STAGE_1_COLD');
    expect(status.remaining).toBe(1);
    expect(scheduler.canSend(phone)).toBe(true);

    scheduler.recordSend(phone);
    const updated = scheduler.getWarmupStatus(phone);
    expect(updated.sentToday).toBe(1);
    expect(updated.remaining).toBe(0);
    expect(scheduler.canSend(phone)).toBe(false);
  });

  it('scales limits upward as account matures (Day 4 -> 3 leads, Day 7 -> 7 leads)', () => {
    const scheduler = new AccountWarmupScheduler({ storagePath: testStorage });
    const phone = '+971505556677';

    // Simulated 4 days ago
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    scheduler.registerAccount(phone, fourDaysAgo);

    const statusDay4 = scheduler.getWarmupStatus(phone);
    expect(statusDay4.ageDays).toBe(4);
    expect(statusDay4.allowed).toBe(3);
    expect(statusDay4.stage).toBe('STAGE_2_GRADUAL');

    // Simulated 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    scheduler.registerAccount('+971507778899', sevenDaysAgo);
    const statusDay7 = scheduler.getWarmupStatus('+971507778899');
    expect(statusDay7.allowed).toBe(7);
    expect(statusDay7.stage).toBe('STAGE_3_ACCELERATING');
  });

  it('allows full capacity for accounts older than 14 days', () => {
    const scheduler = new AccountWarmupScheduler({ storagePath: testStorage });
    const phone = '+971509990011';

    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    scheduler.registerAccount(phone, twentyDaysAgo);

    const status = scheduler.getWarmupStatus(phone);
    expect(status.ageDays).toBe(20);
    expect(status.stage).toBe('STAGE_MATURE');
    expect(status.allowed).toBe(25);
  });
});

