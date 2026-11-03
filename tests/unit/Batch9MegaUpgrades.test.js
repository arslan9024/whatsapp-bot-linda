/**
 * @file Batch9MegaUpgrades.test.js
 * @description Unit tests for Mega Batch 9 (Upgrades 111-125).
 */

import { InternalAgentMessagingBridge } from '../../src/core/InternalAgentMessagingBridge.js';
import { LeadVacationReallocator } from '../../src/accounts/LeadVacationReallocator.js';
import { CommissionDistributionCalculator } from '../../src/intelligence/CommissionDistributionCalculator.js';
import { GhostBrokeringDetector } from '../../src/intelligence/GhostBrokeringDetector.js';
import { BrokerFollowUpReminderBot } from '../../src/outreach/BrokerFollowUpReminderBot.js';
import { VoiceCallTranscriptionHandoff } from '../../src/intelligence/VoiceCallTranscriptionHandoff.js';
import { TeamQuotaBalancingEngine } from '../../src/accounts/TeamQuotaBalancingEngine.js';
import { BroadcastFloorAnnouncement } from '../../src/outreach/BroadcastFloorAnnouncement.js';
import { JuniorAgentCopilotMode } from '../../src/outreach/JuniorAgentCopilotMode.js';
import { CrossDepartmentRouter } from '../../src/accounts/CrossDepartmentRouter.js';
import { AgentWorkloadCapGuard } from '../../src/accounts/AgentWorkloadCapGuard.js';
import { ZeroSecretScanner } from '../../src/core/ZeroSecretScanner.js';
import { Aes256FieldEncryptor } from '../../src/core/Aes256FieldEncryptor.js';
import { PiiLogMasker } from '../../src/core/PiiLogMasker.js';
import { UaePdplComplianceManager } from '../../src/core/UaePdplComplianceManager.js';

describe('Mega Batch 9 (Upgrades 111–125) Test Suite', () => {
  // Upgrade 111
  test('Upgrade 111: InternalAgentMessagingBridge parses commands and enforces agent authorization', () => {
    const bridge = new InternalAgentMessagingBridge();
    bridge.authorizeAgents(['+971501112233']);

    const cmd1 = bridge.parseCommand('!status', '+971501112233');
    expect(cmd1.isCommand).toBe(true);
    expect(cmd1.command).toBe('status');
    expect(cmd1.authorized).toBe(true);

    const execRes = bridge.executeCommand('status');
    expect(execRes).toContain('Linda Operational');

    const cmdUnauthorized = bridge.parseCommand('!takeover', '+971559998877');
    expect(cmdUnauthorized.authorized).toBe(false);
  });

  // Upgrade 112
  test('Upgrade 112: LeadVacationReallocator resolves covering buddy during vacation window', () => {
    const realloc = new LeadVacationReallocator();
    realloc.scheduleVacation('agent_dubai_1', {
      startDate: '2026-11-01',
      endDate: '2026-11-15',
      coveringAgentId: 'agent_buddy_2'
    });

    const targetDate = new Date('2026-11-05');
    expect(realloc.isOnVacation('agent_dubai_1', targetDate)).toBe(true);

    const effective = realloc.resolveEffectiveAgent('agent_dubai_1', targetDate);
    expect(effective.redirected).toBe(true);
    expect(effective.effectiveAgentId).toBe('agent_buddy_2');
  });

  // Upgrade 113
  test('Upgrade 113: CommissionDistributionCalculator computes VAT and broker split correctly', () => {
    const calc = new CommissionDistributionCalculator({ vatRate: 0.05 });
    const res = calc.calculateCommission({
      dealValueAed: 2000000,
      marketType: 'secondary', // 2% = 40,000 AED
      brokerSplitRatio: 0.50
    });

    expect(res.grossCommissionAed).toBe(40000);
    expect(res.vatAmountAed).toBe(2000);
    expect(res.totalPayableWithVatAed).toBe(42000);
    expect(res.agentEarningsAed).toBe(20000);
    expect(res.brokerageGrossAed).toBe(20000);
  });

  // Upgrade 114
  test('Upgrade 114: GhostBrokeringDetector flags intermediary / curbstoning inquiries', () => {
    const detector = new GhostBrokeringDetector();
    const cleanMsg = detector.evaluateMessage('Hello, I am looking for a 2 bedroom apartment in Downtown.');
    expect(cleanMsg.isSuspectedGhostBroker).toBe(false);

    const ghostMsg = detector.evaluateMessage('Please send unbranded brochure, can we co-broke 50/50?');
    expect(ghostMsg.isSuspectedGhostBroker).toBe(true);
    expect(ghostMsg.confidence).toBeGreaterThanOrEqual(75);
    expect(ghostMsg.matches).toContain('unbranded brochure');
  });

  // Upgrade 115
  test('Upgrade 115: BrokerFollowUpReminderBot identifies dormant leads and formats nudge', () => {
    const bot = new BrokerFollowUpReminderBot({ staleThresholdHours: 48 });
    const now = new Date();
    const staleTime = new Date(now.getTime() - 50 * 60 * 60 * 1000).toISOString();
    const freshTime = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString();

    const assignments = [
      { brokerName: 'Karim', clientName: 'Rashid', clientPhone: '+971500001122', lastActivityAt: staleTime, dealStage: 'contacted' },
      { brokerName: 'Elena', clientName: 'Olga', clientPhone: '+971500003344', lastActivityAt: freshTime, dealStage: 'contacted' }
    ];

    const dormant = bot.findDormantAssignments(assignments, now);
    expect(dormant.length).toBe(1);
    expect(dormant[0].clientName).toBe('Rashid');

    const nudge = bot.formatBrokerNudge(dormant[0]);
    expect(nudge).toContain('Rashid');
    expect(nudge).toContain('Follow-Up Reminder');
  });

  // Upgrade 116
  test('Upgrade 116: VoiceCallTranscriptionHandoff creates executive summary and opening line', () => {
    const handoff = new VoiceCallTranscriptionHandoff();
    const brief = handoff.generatePreDialBriefing({
      rawTranscript: 'Hello, I have cash ready funds to buy an urgent villa in Palm Jumeirah this week.',
      callerName: 'Sheikh Mansoor',
      callerPhone: '+971501112233'
    });

    expect(brief.sentiment).toBe('HOT_LEAD');
    expect(brief.bulletSummary.some(s => s.includes('ready funds'))).toBe(true);
    expect(brief.bulletSummary.some(s => s.includes('High Urgency'))).toBe(true);

    const formatted = handoff.formatBriefingMessage(brief);
    expect(formatted).toContain('PRE-DIAL BRIEFING FOR SHEIKH MANSOOR');
  });

  // Upgrade 117
  test('Upgrade 117: TeamQuotaBalancingEngine selects broker with highest quota deficit', () => {
    const quotaEngine = new TeamQuotaBalancingEngine();
    quotaEngine.setQuota('agent_star', 1000000, 900000); // 90% achieved, deficit 0.1
    quotaEngine.setQuota('agent_struggling', 1000000, 200000); // 20% achieved, deficit 0.8

    const selected = quotaEngine.selectAgentByDeficit(['agent_star', 'agent_struggling']);
    expect(selected).toBe('agent_struggling');
  });

  // Upgrade 118
  test('Upgrade 118: BroadcastFloorAnnouncement formats hot pocket listing alert', () => {
    const broad = new BroadcastFloorAnnouncement();
    const alert = broad.formatHotListingBroadcast({
      title: '3BR Penthouse with Full Burj Khalifa View',
      community: 'Downtown Dubai',
      priceAed: 12500000,
      keyFeatures: 'Private Pool, Vacant on Transfer',
      listingAgentName: 'Zayd',
      listingAgentPhone: '+971509998877'
    });

    expect(alert).toContain('NEW EXCLUSIVE POCKET LISTING');
    expect(alert).toContain('12,500,000');
    expect(alert).toContain('Downtown Dubai');
    expect(alert).toContain('Zayd');
  });

  // Upgrade 119
  test('Upgrade 119: JuniorAgentCopilotMode requires approval for supervised junior brokers', () => {
    const copilot = new JuniorAgentCopilotMode();
    copilot.registerJuniorAgent('junior_101');

    // Senior broker bypasses
    const seniorSub = copilot.submitForDispatch({ agentId: 'senior_202', clientJid: 'client@s.whatsapp.net', proposedMessage: 'Hi' });
    expect(seniorSub.requiresApproval).toBe(false);

    // Junior broker proposal requires approval
    const juniorSub = copilot.submitForDispatch({ agentId: 'junior_101', clientJid: 'client@s.whatsapp.net', proposedMessage: 'Special discount' });
    expect(juniorSub.requiresApproval).toBe(true);

    const approved = copilot.reviewProposal(juniorSub.proposalId, 'senior_202', true);
    expect(approved.status).toBe('approved');
    expect(approved.reviewedBy).toBe('senior_202');
  });

  // Upgrade 120
  test('Upgrade 120: CrossDepartmentRouter classifies inquiries across sales, leasing, and maintenance', () => {
    const router = new CrossDepartmentRouter();

    const maint = router.classifyDepartment('AC is leaking in unit 402 and need maintenance urgently');
    expect(maint.department).toBe('PROPERTY_MANAGEMENT');

    const lease = router.classifyDepartment('What is the yearly rent for 1 bedroom in 4 cheques?');
    expect(lease.department).toBe('LEASING');

    const mortgage = router.classifyDepartment('Need mortgage pre-approval for expat loan');
    expect(mortgage.department).toBe('MORTGAGE_SERVICES');

    const ticket = router.createRoutingTicket('PROPERTY_MANAGEMENT', { name: 'Ali', phone: '+971501234567' });
    expect(ticket.targetDepartment).toBe('PROPERTY_MANAGEMENT');
    expect(ticket.priority).toBe('HIGH');
  });

  // Upgrade 121
  test('Upgrade 121: AgentWorkloadCapGuard prevents broker overload above capacity limit', () => {
    const cap = new AgentWorkloadCapGuard({ defaultMaxLeads: 2 });
    expect(cap.hasCapacity('agent_busy')).toBe(true);

    cap.assignLead('agent_busy');
    cap.assignLead('agent_busy');
    expect(cap.hasCapacity('agent_busy')).toBe(false);
    expect(cap.assignLead('agent_busy')).toBe(false);

    cap.releaseLead('agent_busy');
    expect(cap.hasCapacity('agent_busy')).toBe(true);
  });

  // Upgrade 122
  test('Upgrade 122: ZeroSecretScanner detects exposed API keys and connection strings', () => {
    const scanner = new ZeroSecretScanner();
    const cleanCode = 'const port = 5000; console.log(port);';
    expect(scanner.scanContent(cleanCode).hasSecrets).toBe(false);

    const exposedCode = 'const uri = "mongodb+srv://admin:P@ssw0rd123@cluster0.net/db";';
    const result = scanner.scanContent(exposedCode);
    expect(result.hasSecrets).toBe(true);
    expect(result.findings[0].name).toContain('MongoDB');
  });

  // Upgrade 123
  test('Upgrade 123: Aes256FieldEncryptor encrypts and decrypts sensitive PII payloads', () => {
    const encryptor = new Aes256FieldEncryptor();
    const sensitive = '+971501234567';
    const encrypted = encryptor.encrypt(sensitive);

    expect(encrypted).not.toBe(sensitive);
    expect(encrypted).toContain(':');

    const decrypted = encryptor.decrypt(encrypted);
    expect(decrypted).toBe(sensitive);
  });

  // Upgrade 124
  test('Upgrade 124: PiiLogMasker redacts phone numbers and emails in logs and objects', () => {
    const masker = new PiiLogMasker();
    const maskedPhone = masker.maskPhone('+971501234567');
    expect(maskedPhone).toContain('****');
    expect(maskedPhone.endsWith('567')).toBe(true);

    const maskedEmail = masker.maskEmail('investor@dubaiholding.ae');
    expect(maskedEmail).toBe('in****@dubaiholding.ae');

    const sanitizedObj = masker.sanitize({
      phone: '+971509998877',
      email: 'client@gmail.com',
      propertyRef: 'CREEK-101'
    });
    expect(sanitizedObj.phone).toContain('****');
    expect(sanitizedObj.propertyRef).toBe('CREEK-101');
  });

  // Upgrade 125
  test('Upgrade 125: UaePdplComplianceManager records consent and processes Right to Erasure', () => {
    const pdpl = new UaePdplComplianceManager();
    const phone = '+971501234567';

    pdpl.recordConsent(phone, 'whatsapp_inbound');
    expect(pdpl.hasActiveConsent(phone)).toBe(true);

    const erasure = pdpl.processRightToErasure(phone, 'user_requested_deletion');
    expect(erasure.erased).toBe(true);
    expect(erasure.auditId).toContain('pdpl_del_');
    expect(pdpl.hasActiveConsent(phone)).toBe(false);

    const pkg = pdpl.generateDataPortabilityPackage(phone, { notes: 'Inquired on Palm' });
    expect(pkg.legalFramework).toContain('UAE Federal Decree-Law No. 45/2021');
  });
});
