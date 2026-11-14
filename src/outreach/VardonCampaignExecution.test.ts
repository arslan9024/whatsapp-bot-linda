// @ts-nocheck
import { describe, it, beforeEach, expect } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'node:events';
import { WhatsAppDispatchPool } from './WhatsAppDispatchPool.js';
import { InboundIntentCategorizer, RE_INTENT_CATEGORIES } from './InboundIntentCategorizer.js';
import { BroadcastListManager } from './BroadcastListManager.js';
import { VardonLiveCampaignExecutor } from './VardonLiveCampaignExecutor.js';
import { DynamicOutreachTemplateEngine } from './DynamicOutreachTemplateEngine.js';
import { LiveCampaignSchedulePacer } from './LiveCampaignSchedulePacer.js';
import { DamacHills2CampaignManager } from './DamacHills2CampaignManager.js';
import { AccountWarmupScheduler } from '../anti-ban/AccountWarmupScheduler.js';
import { OutreachSafetyController, outreachSafetyController } from './OutreachSafetyController.js';
import { COMMAND_HANDLERS } from '../whatsapp/bridge/commandRouter.js';
import { handleMasterAddDeviceRequest } from '../linking/MasterDeviceAdder.js';
import { InboundDeviceLinkingService } from '../linking/InboundDeviceLinkingService.js';

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

  it('toggles OutreachSafetyController via linda campaign active and linda campaign pause bridge commands', async () => {
    const replies = [];
    const mockMsg = {
      from: '971559156636@c.us',
      reply: async (text) => { replies.push(text); },
    };

    await COMMAND_HANDLERS.campaign({}, mockMsg, ['pause', 'Unit test hold']);
    expect(outreachSafetyController.isPaused()).toBe(true);
    expect(replies[0]).toContain('CAMPAIGN PAUSED (SAFE HOLD)');

    await COMMAND_HANDLERS.campaign({}, mockMsg, ['active', 'VARDON']);
    expect(outreachSafetyController.isPaused()).toBe(false);
    expect(replies[1]).toContain('CAMPAIGN ACTIVE (LIVE OUTREACH RESUMED)');
    expect(replies[1]).toContain('VARDON');

    await COMMAND_HANDLERS.campaign({ accountClients: new Map() }, mockMsg, ['dispatch-now', 'VARDON']);
    expect(replies[2]).toBeDefined();
    expect(
      replies[2].includes('DAMAC HILLS 2 LIVE DISPATCH SUMMARY [VARDON]') ||
      replies[2].includes('DISPATCH HELD — UAE QUIET HOURS ACTIVE')
    ).toBe(true);
  });

  it('auto-registers a secondary number and immediately returns its 8-character pairing code via !link / !pair', async () => {
    const accounts = new Map([
      ['+971505760056', { phoneNumber: '+971505760056', role: 'primary', displayName: 'Primary Master' }],
    ]);
    const mockAcm = {
      getMasterPhoneNumber: () => '+971505760056',
      getAccountByPhone: (p) => accounts.get(p) || null,
      getAllAccounts: () => Array.from(accounts.values()),
      addMasterAccount: async (phone, displayName) => {
        const acc = { phoneNumber: phone, displayName, role: 'master' };
        accounts.set(phone, acc);
        return { success: true, account: acc };
      },
    };

    const sentMessages = [];
    const mockPrimaryClient = {
      sendMessage: async (to, text) => { sentMessages.push({ to, text }); },
    };
    const mockNewClient = new EventEmitter();
    mockNewClient.options = { pairWithPhoneNumber: {} };

    const linkingService = new InboundDeviceLinkingService({
      accountConfigManager: mockAcm,
      accountClients: new Map(),
      connectionManagers: new Map(),
      createClient: async () => {
        setTimeout(() => mockNewClient.emit('code', 'ABCD-1234'), 10);
        return mockNewClient;
      },
      setupClientFlow: () => {},
      getFlowDeps: () => ({}),
      codeTimeoutMs: 2000,
    });

    const msg = {
      from: '971505760056@c.us',
      body: '!pair +971505110636 Agent2',
      reply: async (text) => { sentMessages.push({ to: 'reply', text }); },
    };

    const handled = await linkingService.handleMessage(msg, mockPrimaryClient, '+971505760056');
    expect(handled).toBe(true);
    expect(accounts.has('+971505110636')).toBe(true);
    expect(sentMessages.some(m => m.text.includes('ABCD-1234'))).toBe(true);
  });

  it('scales DAMAC Hills 2 multi-account dispatch from 1/day (cold) up to 12-15/day (warmed-up) with 15s-45s jitter and UAE quiet hours guard', async () => {
    const tmpQuota = path.resolve('data', 'outreach', 'vitest-quota.json');
    const tmpWarmup = path.resolve('data', 'outreach', 'vitest-warmup.json');
    const tmpRegistry = path.resolve('data', 'outreach', 'vitest-registry.json');
    [tmpQuota, tmpWarmup, tmpRegistry].forEach(f => {
      if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch (_) {}
    });

    outreachSafetyController.resume();
    const warmup = new AccountWarmupScheduler({ storagePath: tmpWarmup });
    // Account 1: brand new (Day 0 -> 1/day limit)
    warmup.registerAccount('+971501110001', new Date());
    // Account 2: mature (Day 20 -> 15/day limit)
    warmup.registerAccount('+971501110002', new Date(Date.now() - 20 * 24 * 60 * 60 * 1000));

    expect(warmup.getWarmupStatus('+971501110001').allowed).toBe(1);
    expect(warmup.getWarmupStatus('+971501110002').allowed).toBe(15);

    const sentByLine = [];
    const masterAlerts = [];
    const makeClient = (linePhone) => ({
      pupPage: { evaluate: async () => null },
      sendMessage: async (jid, text) => {
        if (linePhone === '+971505760056') masterAlerts.push({ jid, text });
        else sentByLine.push({ linePhone, jid, text });
        return { id: { id: `msg_${sentByLine.length}` } };
      },
    });

    const clients = new Map([
      ['+971501110001', makeClient('+971501110001')],
      ['+971501110002', makeClient('+971501110002')],
    ]);

    const manager = new DamacHills2CampaignManager({
      quotaFile: tmpQuota,
      registryFile: tmpRegistry,
      warmupScheduler: warmup,
      accountClients: clients,
      accountConfigManager: { getMasterPhoneNumber: () => '+971505760056' },
      crmSyncer: async (data) => ({ success: true, leadId: 'crm_lead_999', data }),
    });

    // Verify 15s-45s Gaussian jitter bounds
    const jitter = manager.getNextJitterDelayMs();
    expect(jitter).toBeGreaterThanOrEqual(15000);
    expect(jitter).toBeLessThanOrEqual(45000);

    // Verify UAE quiet-hours guard (22:00 GST -> 18:00 UTC is blocked)
    const quietTimeUtc = new Date('2026-11-14T18:30:00Z'); // 22:30 GST
    const quietBatch = await manager.dispatchNowBatch('VARDON', { now: quietTimeUtc });
    expect(quietBatch.status).toBe('QUIET_HOURS_BLOCKED');
    expect(quietBatch.dispatchedCount).toBe(0);

    // Verify compliant working hours (11:00 GST -> 07:00 UTC)
    const activeTimeUtc = new Date('2026-11-14T07:00:00Z'); // 11:00 GST
    const testLeads = [
      { name: 'Owner 1', phone: '+971520000001', unit: 'Vardon 1', cluster: 'VARDON' },
      { name: 'Owner 2', phone: '+971520000002', unit: 'Vardon 2', cluster: 'VARDON' },
      { name: 'Owner 3', phone: '+971520000003', unit: 'Vardon 3', cluster: 'VARDON' },
    ];
    const activeBatch = await manager.dispatchNowBatch('VARDON', {
      now: activeTimeUtc,
      leads: testLeads,
      instant: true,
    });

    expect(activeBatch.status).toBe('BATCH_COMPLETED');
    expect(activeBatch.dispatchedCount).toBe(3);
    // Line 1 (cold) can only send 1, Line 2 (warmed up) handles the rest!
    const line1Sends = sentByLine.filter(s => s.linePhone === '+971501110001').length;
    const line2Sends = sentByLine.filter(s => s.linePhone === '+971501110002').length;
    expect(line1Sends).toBe(1);
    expect(line2Sends).toBe(2);

    // Verify Real-Time Owner Reply Escalation & Delivery/Read Receipt Sync
    const receiptEntry = manager.recordDeliveryReceipt('+971520000001', 3, 'msg_1');
    expect(receiptEntry.receiptStatus).toBe('READ');

    const primaryMasterClient = makeClient('+971505760056');
    const escalation = await manager.handleOwnerReply({
      ownerPhone: '+971520000001',
      replyText: 'Yes I want to sell my villa in Vardon, what is the valuation?',
      receivingAgentPhone: '+971501110001',
      primaryClient: primaryMasterClient,
    });

    expect(escalation.success).toBe(true);
    expect(escalation.intent.category).toBe(RE_INTENT_CATEGORIES.SELLER);
    expect(escalation.crmSync.success).toBe(true);
    expect(escalation.vipAlertDispatched).toBe(true);
    expect(masterAlerts[0].text).toContain('VIP DAMAC HILLS 2 OWNER REPLY ESCALATION');
    expect(masterAlerts[0].text).toContain('Vardon 1');
    expect(masterAlerts[0].text).toContain('+971520000001');

    [tmpQuota, tmpWarmup, tmpRegistry].forEach(f => {
      if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch (_) {}
    });
  });
});
