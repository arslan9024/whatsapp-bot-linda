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
    expect(greeting).toMatch(/Good (morning|afternoon|evening) Mr\. John! Hope you're having a wonderful day\./);
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
    const res1 = await manager.processLead(lead1, { dryRun: false });

    expect(res1.success).toBe(true);
    expect(res1.action).toBe('fresh_greeting_sent');
    expect(mockClient.sendMessage).toHaveBeenCalledWith(
      '971502222222@c.us',
      expect.stringMatching(/Good (morning|afternoon|evening)/)
    );

    // Immediate second lead on same day must be rejected due to 1/day quota limit
    const lead2 = { name: 'Fresh Owner 2', phone: '+971503333333' };
    const res2 = await manager.processLead(lead2, { dryRun: false });

    expect(res2.success).toBe(false);
    expect(res2.action).toBe('quota_exhausted_for_today');
  });
});
