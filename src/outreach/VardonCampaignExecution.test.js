import { describe, it, expect, beforeEach } from 'vitest';
import { WhatsAppDispatchPool } from './WhatsAppDispatchPool.js';
import { InboundIntentCategorizer, RE_INTENT_CATEGORIES } from './InboundIntentCategorizer.js';
import { BroadcastListManager } from './BroadcastListManager.js';
import { VardonLiveCampaignExecutor } from './VardonLiveCampaignExecutor.js';

describe('Vardon Campaign & WhatsApp Multi-Account Dispatch Suite', () => {
  let pool;
  let categorizer;
  let broadcastMgr;
  let executor;

  const mockAccounts = ['+971505760056', '+971553633595', '+971589969886'];

  beforeEach(() => {
    pool = new WhatsAppDispatchPool({ accountPhones: mockAccounts, maxDailyPerAccount: 5 });
    categorizer = new InboundIntentCategorizer();
    broadcastMgr = new BroadcastListManager();
    executor = new VardonLiveCampaignExecutor({
      pool,
      categorizer,
      broadcastManager: broadcastMgr,
      dailyTarget: 6,
    });
  });

  it('rotates across accounts in round-robin fashion', () => {
    const s1 = pool.acquireNextSender();
    const s2 = pool.acquireNextSender();
    const s3 = pool.acquireNextSender();
    const s4 = pool.acquireNextSender();

    expect(s1).toBe('+971505760056');
    expect(s2).toBe('+971553633595');
    expect(s3).toBe('+971589969886');
    expect(s4).toBe('+971505760056'); // Loops back
  });

  it('categorizes inbound messages into real estate intent lists', () => {
    const sellerRes = categorizer.categorize('Hello Linda, I want to sell my villa in Vardon');
    expect(sellerRes.category).toBe(RE_INTENT_CATEGORIES.SELLER);

    const buyerRes = categorizer.categorize('Interested in buying an offplan unit with good ROI');
    expect(buyerRes.category).toBe(RE_INTENT_CATEGORIES.BUYER);

    const brokerRes = categorizer.categorize('Hi, I am an agent with direct client, commission split?');
    expect(brokerRes.category).toBe(RE_INTENT_CATEGORIES.BROKER);

    const tenantRes = categorizer.categorize('Looking for rent with 4 cheques in Akoya');
    expect(tenantRes.category).toBe(RE_INTENT_CATEGORIES.TENANT);

    const landlordRes = categorizer.categorize('I need to rent out my property and renew ejari');
    expect(landlordRes.category).toBe(RE_INTENT_CATEGORIES.LANDLORD);
  });

  it('enrolls contacts automatically into broadcast lists upon inbound reply', () => {
    const inbound = executor.handleInboundReply('+971501112233', 'I want to sell my townhouse in Vardon');
    expect(inbound.category).toBe(RE_INTENT_CATEGORIES.SELLER);

    const enrolled = broadcastMgr.getRecipients('LIST_SELLER');
    expect(enrolled).toContain('+971501112233');
  });

  it('executes live dispatch verification batch without exhausting pool', () => {
    const testCandidates = [
      { phone: '+971500000001', name: 'Rashid', project: 'VARDON' },
      { phone: '+971500000002', name: 'Khalid', project: 'VARDON' },
      { phone: '+971500000003', name: 'Fatima', project: 'VARDON' },
      { phone: '+971500000004', name: 'Tariq', project: 'VARDON' },
    ];

    const batch = executor.executeDispatchBatch(testCandidates);
    expect(batch.status).toBe('ACTIVE_DISPATCH_VERIFIED');
    expect(batch.totalDispatched).toBe(4);
    expect(batch.skipped).toBe(0);

    const status = executor.getCampaignStatus();
    expect(status.totalDispatchesToday).toBe(4);
  });
});
