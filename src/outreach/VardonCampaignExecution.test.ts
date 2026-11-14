// @ts-nocheck
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { WhatsAppDispatchPool } from './WhatsAppDispatchPool.js';
import { InboundIntentCategorizer, RE_INTENT_CATEGORIES } from './InboundIntentCategorizer.js';
import { BroadcastListManager } from './BroadcastListManager.js';
import { VardonLiveCampaignExecutor } from './VardonLiveCampaignExecutor.js';
import { DynamicOutreachTemplateEngine } from './DynamicOutreachTemplateEngine.js';
import { LiveCampaignSchedulePacer } from './LiveCampaignSchedulePacer.js';

describe('Vardon Campaign & WhatsApp Multi-Account Dispatch Suite', () => {
  let pool;
  let categorizer;
  let broadcastMgr;
  let executor;
  let mockWarmup;
  let mockCrmSyncer;
  let mockNotifier;
  let templates;
  let pacer;

  const mockAccounts = ['+971505760056', '+971553633595', '+971589969886'];

  beforeEach(() => {
    pool = new WhatsAppDispatchPool({ accountPhones: mockAccounts, maxDailyPerAccount: 5 });
    categorizer = new InboundIntentCategorizer();
    broadcastMgr = new BroadcastListManager();
    templates = new DynamicOutreachTemplateEngine();
    pacer = new LiveCampaignSchedulePacer({ minGapMinutes: 35, maxGapMinutes: 55, dailyLimit: 12 });

    mockWarmup = {
      canSend: () => ({ allowed: true, limit: 12 }),
      recordSend: () => {},
    };
    mockCrmSyncer = async (leadData) => ({ success: true, leadId: 'lead_mock_123' });
    mockNotifier = {
      notifyAdmins: async (alertData) => ({ sent: 3, failed: 0, recipients: mockAccounts }),
    };

    executor = new VardonLiveCampaignExecutor({
      pool,
      categorizer,
      broadcastManager: broadcastMgr,
      warmupScheduler: mockWarmup,
      templates,
      pacer,
      crmSyncer: mockCrmSyncer,
      notifier: mockNotifier,
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

  it('generates dynamic bilingual spintax outreach messages for Vardon cluster', () => {
    const enOutreach = templates.generateOutreachMessage('VARDON_VALUATION_EN', { firstName: 'Rashid', cluster: 'Vardon' });
    assert.equal(enOutreach.language, 'EN');
    assert.ok(enOutreach.messageText.includes('Rashid'));
    assert.ok(enOutreach.messageText.includes('Vardon'));
    assert.ok(enOutreach.variationsAvailable > 1);

    const arOutreach = templates.generateOutreachMessage('VARDON_VALUATION_AR', { firstName: 'سلطان', cluster: 'فاردون' });
    assert.equal(arOutreach.language, 'AR');
    assert.ok(arOutreach.messageText.includes('سلطان'));
    assert.ok(arOutreach.messageText.includes('وايت كيفز العقارية'));
  });

  it('plans compliant campaign schedule with 35-55m delay spacing and daily cap', () => {
    const prospects = [
      { phone: '+971501110001', name: 'Rashid' },
      { phone: '+971501110002', name: 'Khalid' },
      { phone: '+971501110003', name: 'Fatima' },
    ];
    const plan = executor.planCampaignSchedule(prospects);
    assert.equal(plan.totalScheduled, 3);
    assert.equal(plan.scheduledDispatches.length, 3);
    assert.equal(plan.scheduledDispatches[0].delayMinutesFromStart, 0);
    assert.ok(plan.scheduledDispatches[1].delayMinutesFromStart >= 35);
    assert.ok(plan.scheduledDispatches[2].delayMinutesFromStart >= 70);
  });

  it('categorizes inbound messages into real estate intent lists in English and Arabic', () => {
    const sellerRes = categorizer.categorize('Hello Linda, I want to sell my villa in Vardon');
    assert.equal(sellerRes.category, RE_INTENT_CATEGORIES.SELLER);
    assert.equal(sellerRes.isHighPriority, true);

    const buyerRes = categorizer.categorize('Interested in buying an offplan unit with good ROI');
    assert.equal(buyerRes.category, RE_INTENT_CATEGORIES.BUYER);

    const cashBuyerRes = categorizer.categorize('Ready cash buyer looking for urgent villa deal in Vardon');
    assert.equal(cashBuyerRes.category, RE_INTENT_CATEGORIES.BUYER);
    assert.equal(cashBuyerRes.isHighPriority, true);

    const arabicSellerRes = categorizer.categorize('السلام عليكم، أريد أبيع فيلتي في مجمع فاردون داماك هيلز 2 وعندي سند الملكية');
    assert.equal(arabicSellerRes.category, RE_INTENT_CATEGORIES.SELLER);
    assert.equal(arabicSellerRes.isHighPriority, true);

    const brokerRes = categorizer.categorize('Hi, I am an agent with direct client, commission split?');
    assert.equal(brokerRes.category, RE_INTENT_CATEGORIES.BROKER);

    const tenantRes = categorizer.categorize('Looking for rent with 4 cheques in Akoya');
    assert.equal(tenantRes.category, RE_INTENT_CATEGORIES.TENANT);

    const landlordRes = categorizer.categorize('I need to rent out my property and renew ejari');
    assert.equal(landlordRes.category, RE_INTENT_CATEGORIES.LANDLORD);
  });

  it('enrolls contacts automatically and syncs leads to CRM & triggers admin alerts', async () => {
    const inbound = await executor.handleInboundReply('+971501112233', 'I want to sell my townhouse in Vardon', { name: 'Sultan' });
    assert.equal(inbound.category, RE_INTENT_CATEGORIES.SELLER);
    assert.equal(inbound.isHighPriority, true);
    assert.equal(inbound.crmSync.success, true);
    assert.equal(inbound.crmSync.leadId, 'lead_mock_123');
    assert.equal(inbound.adminAlert.sent, 3);

    const enrolled = broadcastMgr.getRecipients('LIST_SELLER');
    assert.ok(enrolled.includes('+971501112233'));
    assert.ok(inbound.readReceipt.scheduledDelayMs >= 2500);
  });

  it('executes live dispatch verification batch with dynamic templates and anti-ban typing pacing', () => {
    const testCandidates = [
      { phone: '+971500000001', name: 'Rashid', project: 'VARDON', templateId: 'VARDON_VALUATION_EN' },
      { phone: '+971500000002', name: 'Khalid', project: 'VARDON', templateId: 'VARDON_VALUATION_AR' },
      { phone: '+971500000003', name: 'Fatima', project: 'VARDON', templateId: 'VARDON_RENTAL_EJARI_EN' },
      { phone: '+971500000004', name: 'Tariq', project: 'VARDON' },
    ];

    const batch = executor.executeDispatchBatch(testCandidates);
    assert.equal(batch.status, 'ACTIVE_DISPATCH_VERIFIED');
    assert.equal(batch.totalDispatched, 4);
    assert.equal(batch.skipped, 0);
    assert.ok(batch.recentLogs[0].typingDurationMs >= 1200);
    assert.ok(batch.recentLogs[0].messageText.includes('Rashid'));
    assert.ok(batch.recentLogs[1].messageText.includes('خالد') || batch.recentLogs[1].messageText.includes('Khalid'));

    const status = executor.getCampaignStatus();
    assert.equal(status.totalDispatchesToday, 4);
    assert.ok(status.availableTemplates >= 5);
  });
});
