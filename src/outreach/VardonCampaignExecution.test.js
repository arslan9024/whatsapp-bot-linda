import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
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

    assert.equal(s1, '+971505760056');
    assert.equal(s2, '+971553633595');
    assert.equal(s3, '+971589969886');
    assert.equal(s4, '+971505760056'); // Loops back
  });

  it('categorizes inbound messages into real estate intent lists', () => {
    const sellerRes = categorizer.categorize('Hello Linda, I want to sell my villa in Vardon');
    assert.equal(sellerRes.category, RE_INTENT_CATEGORIES.SELLER);

    const buyerRes = categorizer.categorize('Interested in buying an offplan unit with good ROI');
    assert.equal(buyerRes.category, RE_INTENT_CATEGORIES.BUYER);

    const brokerRes = categorizer.categorize('Hi, I am an agent with direct client, commission split?');
    assert.equal(brokerRes.category, RE_INTENT_CATEGORIES.BROKER);

    const tenantRes = categorizer.categorize('Looking for rent with 4 cheques in Akoya');
    assert.equal(tenantRes.category, RE_INTENT_CATEGORIES.TENANT);

    const landlordRes = categorizer.categorize('I need to rent out my property and renew ejari');
    assert.equal(landlordRes.category, RE_INTENT_CATEGORIES.LANDLORD);
  });

  it('enrolls contacts automatically into broadcast lists upon inbound reply', () => {
    const inbound = executor.handleInboundReply('+971501112233', 'I want to sell my townhouse in Vardon');
    assert.equal(inbound.category, RE_INTENT_CATEGORIES.SELLER);

    const enrolled = broadcastMgr.getRecipients('LIST_SELLER');
    assert.ok(enrolled.includes('+971501112233'));
  });

  it('executes live dispatch verification batch without exhausting pool', () => {
    const testCandidates = [
      { phone: '+971500000001', name: 'Rashid', project: 'VARDON' },
      { phone: '+971500000002', name: 'Khalid', project: 'VARDON' },
      { phone: '+971500000003', name: 'Fatima', project: 'VARDON' },
      { phone: '+971500000004', name: 'Tariq', project: 'VARDON' },
    ];

    const batch = executor.executeDispatchBatch(testCandidates);
    assert.equal(batch.status, 'ACTIVE_DISPATCH_VERIFIED');
    assert.equal(batch.totalDispatched, 4);
    assert.equal(batch.skipped, 0);

    const status = executor.getCampaignStatus();
    assert.equal(status.totalDispatchesToday, 4);
  });
});
