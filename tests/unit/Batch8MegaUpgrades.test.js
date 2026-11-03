/**
 * @file Batch8MegaUpgrades.test.js
 * @description Unit tests for Mega Batch 8 (Upgrades 96-110).
 */

import { StripeDepositLinkGenerator } from '../../src/integrations/StripeDepositLinkGenerator.js';
import { UaeCentralBankFxSync } from '../../src/integrations/UaeCentralBankFxSync.js';
import { DldOpenDataIngestionParser } from '../../src/integrations/DldOpenDataIngestionParser.js';
import { PortalLeadWebhookIngestion } from '../../src/integrations/PortalLeadWebhookIngestion.js';
import { MetaLeadAdsWebhookReceiver } from '../../src/integrations/MetaLeadAdsWebhookReceiver.js';
import { CloudStorageTranscriptArchiver } from '../../src/integrations/CloudStorageTranscriptArchiver.js';
import { AgentShiftRosterEngine } from '../../src/accounts/AgentShiftRosterEngine.js';
import { PropertySpecialistSkillMatcher } from '../../src/accounts/PropertySpecialistSkillMatcher.js';
import { AgentLanguageAffinityMatcher } from '../../src/accounts/AgentLanguageAffinityMatcher.js';
import { BrokerIntroductionHandoff } from '../../src/outreach/BrokerIntroductionHandoff.js';
import { AgentPerformanceScorecard } from '../../src/accounts/AgentPerformanceScorecard.js';
import { BrokerWhisperCoachGenerator } from '../../src/intelligence/BrokerWhisperCoachGenerator.js';
import { MultiBotSwarmCoordinator } from '../../src/core/MultiBotSwarmCoordinator.js';
import { LeadSlaEscalationEngine } from '../../src/outreach/LeadSlaEscalationEngine.js';
import { VipDealTeamChannelFormatter } from '../../src/outreach/VipDealTeamChannelFormatter.js';

describe('Mega Batch 8 (Upgrades 96–110) Test Suite', () => {
  // Upgrade 96
  test('Upgrade 96: StripeDepositLinkGenerator creates deposit sessions and invitation copy', () => {
    const generator = new StripeDepositLinkGenerator();
    const session = generator.generateDepositSession({
      leadId: 'lead_101',
      propertyRef: 'EMAAR-BEACH-204',
      depositAmount: 50000
    });

    expect(session.checkoutUrl).toContain('checkout.stripe.com');
    expect(session.amount).toBe(50000);
    const invite = generator.formatPaymentInvitation(session);
    expect(invite).toContain('50,000');
    expect(invite).toContain('EMAAR-BEACH-204');
  });

  // Upgrade 97
  test('Upgrade 97: UaeCentralBankFxSync converts AED and ingests rate feeds', () => {
    const fx = new UaeCentralBankFxSync();
    const usdConv = fx.convertAedTo(36725, 'USD');
    expect(usdConv.convertedAmount).toBeGreaterThan(9900);
    expect(usdConv.convertedAmount).toBeLessThan(10100);

    fx.ingestCbRates([{ currency: 'EUR', aedPerUnit: 4.0 }]);
    const eurConv = fx.convertAedTo(4000, 'EUR');
    expect(eurConv.convertedAmount).toBe(1000);
  });

  // Upgrade 98
  test('Upgrade 98: DldOpenDataIngestionParser aggregates sales and off-plan statistics', () => {
    const parser = new DldOpenDataIngestionParser({ minValidAmount: 500000 });
    const rawBatch = [
      { area_name_en: 'Downtown Dubai', actual_worth: 2500000, procedure_name: 'Sale' },
      { area_name_en: 'Downtown Dubai', actual_worth: 3500000, procedure_name: 'Off-Plan Registration' },
      { area_name_en: 'Dubai Marina', actual_worth: 150000, procedure_name: 'Sale' } // Below 500k threshold
    ];
    const stats = parser.aggregateBatch(rawBatch);
    expect(stats.validRecords).toBe(2);
    expect(stats.areas['Downtown Dubai'].txCount).toBe(2);
    expect(stats.areas['Downtown Dubai'].offPlanCount).toBe(1);
    expect(stats.areas['Downtown Dubai'].avgPriceAed).toBe(3000000);
  });

  // Upgrade 99
  test('Upgrade 99: PortalLeadWebhookIngestion detects portals and extracts standard leads', () => {
    const adapter = new PortalLeadWebhookIngestion();
    const pfLead = adapter.normalizePortalLead(
      { lead_name: 'Tariq', lead_phone: '+971501112233', reference: 'DXB-101' },
      { 'x-pf-signature': 'sig123' }
    );
    expect(pfLead.portalSource).toBe('property_finder');
    expect(pfLead.lead.name).toBe('Tariq');
    expect(pfLead.readyForOutreach).toBe(true);
  });

  // Upgrade 100
  test('Upgrade 100: MetaLeadAdsWebhookReceiver verifies handshake and extracts field data', () => {
    const receiver = new MetaLeadAdsWebhookReceiver({ verifyToken: 'test_token' });
    const check = receiver.verifyWebhook({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'test_token',
      'hub.challenge': 'challenge_code_99'
    });
    expect(check.verified).toBe(true);
    expect(check.challenge).toBe('challenge_code_99');

    const fields = receiver.parseFieldData([
      { name: 'full_name', values: ['Alexandre Dumas'] },
      { name: 'phone_number', values: ['+971589998877'] },
      { name: 'community_preference', values: ['Palm Jumeirah'] }
    ]);
    expect(fields.fullName).toBe('Alexandre Dumas');
    expect(fields.preferredCommunity).toBe('Palm Jumeirah');
  });

  // Upgrade 101
  test('Upgrade 101: CloudStorageTranscriptArchiver filters and packages inactive sessions', () => {
    const archiver = new CloudStorageTranscriptArchiver({ retentionDays: 30 });
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date().toISOString();

    const sessions = [
      { sessionId: 'sess_1', lastActiveAt: oldDate, messages: [{ id: 1 }, { id: 2 }] },
      { sessionId: 'sess_2', lastActiveAt: recentDate, messages: [{ id: 3 }] }
    ];

    const eligible = archiver.filterSessionsForArchival(sessions);
    expect(eligible.length).toBe(1);
    expect(eligible[0].sessionId).toBe('sess_1');

    const pkg = archiver.createArchivalPackage(eligible);
    expect(pkg.sessionCount).toBe(1);
    expect(pkg.totalMessages).toBe(2);
    expect(pkg.destinationKey).toContain('archives/');
  });

  // Upgrade 102
  test('Upgrade 102: AgentShiftRosterEngine checks availability and shift schedules', () => {
    const roster = new AgentShiftRosterEngine();
    roster.registerAgent('broker_sam', {
      name: 'Sam',
      startHour: 9,
      endHour: 18,
      workingDays: [1, 2, 3, 4, 5] // Mon-Fri
    });

    // Create a Monday 11:00 AM date
    const monday11Am = new Date('2026-11-09T11:00:00Z');
    monday11Am.setHours(11);
    // Note: getDay() on 2026-11-09 is Monday (1)
    expect(roster.isAgentAvailable('broker_sam', monday11Am)).toBe(true);

    // Override test
    roster.registerAgent('broker_off', { isOnDutyOverride: false });
    expect(roster.isAgentAvailable('broker_off')).toBe(false);
  });

  // Upgrade 103
  test('Upgrade 103: PropertySpecialistSkillMatcher identifies matching specialists', () => {
    const matcher = new PropertySpecialistSkillMatcher();
    matcher.registerSpecialist('luxury_villa_agent', {
      communities: ['Palm Jumeirah', 'Dubai Hills'],
      propertyTypes: ['Villa'],
      minBudgetAed: 10000000,
      maxBudgetAed: 50000000,
      isOffPlanSpecialist: false
    });

    const lead = {
      community: 'Palm Jumeirah',
      propertyType: 'Villa',
      budgetAed: 15000000,
      isOffPlan: false
    };

    const match = matcher.findBestSpecialist(lead);
    expect(match).not.toBeNull();
    expect(match.agentId).toBe('luxury_villa_agent');
    expect(match.score).toBeGreaterThan(80);
  });

  // Upgrade 104
  test('Upgrade 104: AgentLanguageAffinityMatcher scores and ranks agents by language', () => {
    const matcher = new AgentLanguageAffinityMatcher();
    matcher.registerAgentLanguages('agent_rus', [
      { language: 'russian', level: 'native' },
      { language: 'english', level: 'fluent' }
    ]);
    matcher.registerAgentLanguages('agent_eng', ['english']);

    const ranking = matcher.rankAgentsByLanguage('russian');
    expect(ranking[0].agentId).toBe('agent_rus');
    expect(ranking[0].score).toBe(100);
    expect(ranking[1].score).toBe(0);
  });

  // Upgrade 105
  test('Upgrade 105: BrokerIntroductionHandoff generates client handoff and broker briefing', () => {
    const handoff = new BrokerIntroductionHandoff();
    const clientCopy = handoff.formatClientHandoff({
      clientName: 'Elena',
      brokerName: 'Karim',
      brokerPhone: '+971550001122',
      propertyRef: 'BURJ-CROWN-120',
      specialtyArea: 'Downtown Dubai'
    });
    expect(clientCopy).toContain('Meet Your Property Specialist');
    expect(clientCopy).toContain('Karim');

    const brokerBriefing = handoff.formatBrokerBriefing({
      clientName: 'Elena',
      clientPhone: '+971501112233',
      budget: 3500000,
      requirements: '2BR High Floor',
      leadScore: 92
    });
    expect(brokerBriefing).toContain('NEW QUALIFIED LEAD HANDOFF');
    expect(brokerBriefing).toContain('3,500,000');
  });

  // Upgrade 106
  test('Upgrade 106: AgentPerformanceScorecard computes SLA and conversion scorecard', () => {
    const scorecard = new AgentPerformanceScorecard();
    scorecard.recordResponseTime('agent_fast', 8); // under 15m
    scorecard.recordResponseTime('agent_fast', 12); // under 15m
    scorecard.recordConversion('agent_fast', 'viewing');
    scorecard.recordConversion('agent_fast', 'deal');

    const report = scorecard.calculateScorecard('agent_fast');
    expect(report.slaComplianceRate).toBe(100);
    expect(report.avgResponseMinutes).toBe(10);
    expect(report.compositeScore).toBeGreaterThan(60);
  });

  // Upgrade 107
  test('Upgrade 107: BrokerWhisperCoachGenerator produces objection tips and closing advice', () => {
    const coach = new BrokerWhisperCoachGenerator();
    const priceAdvice = coach.generateWhisperAdvice({
      objectionType: 'price',
      community: 'Downtown',
      budgetAed: 20000000
    });

    expect(priceAdvice.coachingPoints.length).toBeGreaterThan(1);
    expect(priceAdvice.recommendedClosing).toContain('payment plan');
    expect(priceAdvice.coachingPoints.some(p => p.includes('Ultra-High-Net-Worth'))).toBe(true);
  });

  // Upgrade 108
  test('Upgrade 108: MultiBotSwarmCoordinator coordinates lock acquisition and precedence', () => {
    const coord = new MultiBotSwarmCoordinator();
    const lock1 = coord.acquireLock('chat_001', 'rachel_campaign', 'campaign_outreach');
    expect(lock1.success).toBe(true);

    // Concierge Linda preempts campaign bot
    const lock2 = coord.acquireLock('chat_001', 'linda_concierge', 'inbound_concierge');
    expect(lock2.success).toBe(true);
    expect(lock2.holder).toBe('linda_concierge');

    coord.releaseLock('chat_001', 'linda_concierge');
    expect(coord.getLockStatus('chat_001')).toBeNull();
  });

  // Upgrade 109
  test('Upgrade 109: LeadSlaEscalationEngine monitors warnings and reassignments', () => {
    const engine = new LeadSlaEscalationEngine({ warningMinutes: 15, reassignMinutes: 30 });
    const now = Date.now();
    engine.trackHandoff('lead_test_1', { agentId: 'agent_slow', clientPhone: '+971501234567' });

    // 20 minutes later -> Warning
    const breach20 = engine.evaluateSlaBreaches(now + 20 * 60 * 1000);
    expect(breach20.warnings.length).toBe(1);
    expect(breach20.reassignments.length).toBe(0);

    // 35 minutes later -> Reassign
    const breach35 = engine.evaluateSlaBreaches(now + 35 * 60 * 1000);
    expect(breach35.reassignments.length).toBe(1);
    expect(breach35.reassignments[0].previousAgentId).toBe('agent_slow');
  });

  // Upgrade 110
  test('Upgrade 110: VipDealTeamChannelFormatter formats war-room alert for UHNW deals', () => {
    const formatter = new VipDealTeamChannelFormatter();
    const alert = formatter.formatWarRoomAlert({
      leadName: 'Sir Arthur Sterling',
      leadPhone: '+447911122233',
      budgetAed: 45000000,
      assetTarget: 'Palm Jumeirah Signature Villa',
      investorOrigin: 'UK Family Office',
      assignedLeadDirector: 'Managing Director Tariq'
    });

    expect(alert).toContain('UHNW VIP DEAL WAR ROOM ALERT');
    expect(alert).toContain('45,000,000');
    expect(alert).toContain('Sir Arthur Sterling');
    expect(alert).toContain('Managing Director Tariq');
  });
});

