import fs from 'fs';
import path from 'path';
import { DamacHills2CampaignManager, formatFreshGreeting } from '../../src/outreach/DamacHills2CampaignManager.js';

describe('DamacHills2CampaignManager (1 Lead/Day/Account Outreach Engine)', () => {
  const testQuotaFile = path.resolve('data', 'outreach', 'test-daily-quota.json');

  beforeEach(() => {
    if (fs.existsSync(testQuotaFile)) {
      try {
        fs.unlinkSync(testQuotaFile);
      } catch (_) {}
    }
  });

  afterAll(() => {
    if (fs.existsSync(testQuotaFile)) {
      try {
        fs.unlinkSync(testQuotaFile);
      } catch (_) {}
    }
  });

  it('formats greetings-only message for fresh leads', () => {
    const greeting = formatFreshGreeting('Mr. John');
    expect(greeting).toMatch(/(Good (morning|afternoon|evening)|Hello|Hi).*Mr\. John/);
  });

  it('processes lead with existing history by skipping cold send and alerting sub-agent', async () => {
    const mockClientAgent = {
      pupPage: {
        evaluate: jest.fn().mockResolvedValue({
          found: true,
          jid: '971501111111@c.us',
          messageCount: 1,
          lastTimestamp: Date.now() - 500000,
        }),
      },
    };

    const clients = new Map([['+971589969886', mockClientAgent]]);

    const manager = new DamacHills2CampaignManager({
      quotaFile: testQuotaFile,
      accountClients: clients,
      accountConfigManager: {
        getAccountByPhone: () => ({ displayName: 'Sub-Agent Line' }),
      },
    });

    const lead = {
      name: 'Ahmed Tariq',
      phone: '+971501111111',
      community: 'Damac Hills 2',
      unit: 'Victoria Cluster',
    };

    const result = await manager.processLead(lead, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.action).toBe('supervisor_reminder_simulated');
    expect(result.assignedAgent).toBe('+971589969886');
  });

  it('processes fresh lead by sending greeting and exhausting 1/day quota', async () => {
    const mockClient = {
      pupPage: { evaluate: jest.fn().mockResolvedValue(null) },
      sendMessage: jest.fn().mockResolvedValue({ id: { id: 'sent-msg-1' } }),
    };

    const clients = new Map([['+971559156636', mockClient]]);

    const manager = new DamacHills2CampaignManager({
      quotaFile: testQuotaFile,
      accountClients: clients,
      accountConfigManager: {
        getAccountByPhone: () => ({ displayName: 'Junior Agent' }),
      },
    });

    const lead1 = { name: 'Fresh Owner 1', phone: '+971502222222' };
    const res1 = await manager.processLead(lead1, { dryRun: false, instant: true });

    expect(res1.success).toBe(true);
    expect(res1.action).toBe('fresh_greeting_sent');
    expect(mockClient.sendMessage).toHaveBeenCalledWith(
      '971502222222@c.us',
      expect.stringMatching(/(Good (morning|afternoon|evening)|Hello|Hi)/),
      expect.anything()
    );

    // Immediate second lead on same day must be rejected due to 1/day quota limit
    const lead2 = { name: 'Fresh Owner 2', phone: '+971503333333' };
    const res2 = await manager.processLead(lead2, { dryRun: false, instant: true });

    expect(res2.success).toBe(false);
    expect(res2.action).toBe('quota_exhausted_for_today');
  });

  it('syncs status back to Google Sheets when sheetSource and rowIndex are provided', async () => {
    const mockClient = {
      pupPage: { evaluate: jest.fn().mockResolvedValue(null) },
      sendMessage: jest.fn().mockResolvedValue({ id: { id: 'sent-msg-2' } }),
    };

    const mockSheetSource = {
      writeStatus: jest.fn().mockResolvedValue({ ok: true, updated: 1 }),
    };

    const clients = new Map([['+971559156636', mockClient]]);
    const manager = new DamacHills2CampaignManager({
      quotaFile: testQuotaFile,
      accountClients: clients,
      sheetSource: mockSheetSource,
    });

    const lead = { name: 'Fresh Owner 3', phone: '+971504444444', rowIndex: 5 };
    const mainValues = [['Name', 'Phone', 'Linda Outreach'], ['A', '1'], ['B', '2'], ['C', '3'], ['Fresh Owner 3', '971504444444']];

    const res = await manager.processLead(lead, {
      dryRun: false,
      instant: true,
      syncSheet: true,
      mainValues,
    });

    expect(res.success).toBe(true);
    expect(mockSheetSource.writeStatus).toHaveBeenCalledTimes(1);
    const passedMap = mockSheetSource.writeStatus.mock.calls[0][1];
    expect(passedMap.get(5)).toContain('+971559156636');
  });
});

