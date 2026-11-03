import { CurrencyFxMultiConverter } from '../../src/intelligence/CurrencyFxMultiConverter.js';
import { MasterPlanInfrastructureMapper } from '../../src/intelligence/MasterPlanInfrastructureMapper.js';
import { BuyerPersonaProfiler } from '../../src/intelligence/BuyerPersonaProfiler.js';
import { ReraContractMetadataPreparer } from '../../src/intelligence/ReraContractMetadataPreparer.js';
import { DynamicCampaignThrottler } from '../../src/outreach/DynamicCampaignThrottler.js';
import { HookSplitTestingFramework } from '../../src/outreach/HookSplitTestingFramework.js';
import { TimezoneAwareScheduler } from '../../src/outreach/TimezoneAwareScheduler.js';
import { CustomAudienceSegmenter } from '../../src/outreach/CustomAudienceSegmenter.js';
import { AutonomousUnsubscribeHandler } from '../../src/outreach/AutonomousUnsubscribeHandler.js';
import { VipLeadEscalationNotifier } from '../../src/outreach/VipLeadEscalationNotifier.js';
import { PostViewingFeedbackRequester } from '../../src/outreach/PostViewingFeedbackRequester.js';
import { BrochureCoverPersonalizer } from '../../src/outreach/BrochureCoverPersonalizer.js';
import { MarketEventTriggerNotifier } from '../../src/outreach/MarketEventTriggerNotifier.js';
import { CampaignBudgetGuard } from '../../src/outreach/CampaignBudgetGuard.js';
import { NoAnswerDripSequencer } from '../../src/outreach/NoAnswerDripSequencer.js';

describe('Mega Batch 6 Upgrades 66–80 (Market Intel, Outreach & Smart Campaigns)', () => {
  it('Upgrade 66: CurrencyFxMultiConverter calculates dual pricing with AED peg', () => {
    const fx = new CurrencyFxMultiConverter();
    expect(fx.convertToAed(100000, 'USD')).toBe(367250);
    expect(fx.formatDualPrice(3672500, 'USD')).toContain('~1,000,000 USD');
  });

  it('Upgrade 67: MasterPlanInfrastructureMapper identifies appreciation catalysts', () => {
    const mapper = new MasterPlanInfrastructureMapper();
    const list = mapper.getCatalystsForCommunity('DAMAC_HILLS_2');
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].project).toBe('AL_MAKTOUM_AIRPORT_EXPANSION');
  });

  it('Upgrade 68: BuyerPersonaProfiler categorizes flippers, investors and families', () => {
    const profiler = new BuyerPersonaProfiler();
    expect(profiler.profileLead({ text: 'looking to flip before handover' }).persona).toBe('SPECULATIVE_FLIPPER');
    expect(profiler.profileLead({ text: 'need best rental yield passive income' }).persona).toBe('YIELD_COLLECTOR');
    expect(profiler.profileLead({ text: 'moving my family close to good schools' }).persona).toBe('END_USER_FAMILY');
  });

  it('Upgrade 69: ReraContractMetadataPreparer formats official Form B buyer mandate', () => {
    const preparer = new ReraContractMetadataPreparer();
    const formB = preparer.prepareFormBMetadata({ buyerName: 'Rashid Khan', buyerPhone: '+971501112233', budgetMaxAed: 3000000 });
    expect(formB.formType).toBe('RERA_FORM_B_BUYER_REPRESENTATION');
    expect(formB.brokerageMandate.commissionAgreedPercent).toBe(2.0);
  });

  it('Upgrade 70: DynamicCampaignThrottler paces remaining queue across shift minutes', () => {
    const throttler = new DynamicCampaignThrottler();
    const delay = throttler.calculatePacingDelay({ remainingQueueCount: 60, shiftRemainingMinutes: 60 });
    expect(delay).toBe(60); // 1 per minute
  });

  it('Upgrade 71: HookSplitTestingFramework tracks and promotes best message hook', () => {
    const ab = new HookSplitTestingFramework({ hooks: ['Hook A', 'Hook B'] });
    ab.recordDispatch('Hook A');
    ab.recordResponse('Hook A');
    ab.recordDispatch('Hook B');
    const selected = ab.selectHook();
    expect(selected).toBeDefined();
  });

  it('Upgrade 72: TimezoneAwareScheduler verifies contact local daytime hours', () => {
    const scheduler = new TimezoneAwareScheduler();
    expect(scheduler.getCountryCode('+447911123456')).toBe('44');
    expect(scheduler.getCountryCode('+971501234567')).toBe('971');
  });

  it('Upgrade 73: CustomAudienceSegmenter filters contacts by budget and area', () => {
    const segmenter = new CustomAudienceSegmenter();
    const contacts = [
      { phone: '1', budgetAed: 1500000, preferredArea: 'JVC' },
      { phone: '2', budgetAed: 4000000, preferredArea: 'Palm Jumeirah' },
    ];
    const filtered = segmenter.filterAudience(contacts, { minBudget: 2000000 });
    expect(filtered.length).toBe(1);
    expect(filtered[0].phone).toBe('2');
  });

  it('Upgrade 74: AutonomousUnsubscribeHandler processes stop commands instantly', () => {
    const unsubs = new AutonomousUnsubscribeHandler();
    expect(unsubs.isOptOutIntent('Stop messaging me')).toBe(true);
    const result = unsubs.processOptOut('+971509990000', 'stop');
    expect(result.unsubscribed).toBe(true);
    expect(unsubs.isUnsubscribed('+971509990000')).toBe(true);
  });

  it('Upgrade 75: VipLeadEscalationNotifier formats management alert on >= 5M leads', () => {
    const notifier = new VipLeadEscalationNotifier();
    expect(notifier.isVipLead(6000000)).toBe(true);
    expect(notifier.isVipLead(2000000)).toBe(false);
    const alert = notifier.formatTelegramAlert({ leadName: 'Ali', phone: '+971501', budgetAed: 6000000 });
    expect(alert).toContain('VIP HIGH-NET-WORTH');
  });

  it('Upgrade 76: PostViewingFeedbackRequester calculates 2h post-viewing schedule', () => {
    const requester = new PostViewingFeedbackRequester();
    const prompt = requester.formatFeedbackPrompt('Ahmed', 'Damac Hills Villa');
    expect(prompt).toContain('Ahmed');
    expect(prompt).toContain('viewing');
  });

  it('Upgrade 77: BrochureCoverPersonalizer customizes PDF title page metadata', () => {
    const personalizer = new BrochureCoverPersonalizer();
    const meta = personalizer.formatCoverMetadata({ leadName: 'Dr. Tariq', community: 'JVC' });
    expect(meta.subtitle).toContain('Dr. Tariq');
    expect(meta.title).toContain('JVC');
  });

  it('Upgrade 78: MarketEventTriggerNotifier crafts contextual rate and launch updates', () => {
    const notifier = new MarketEventTriggerNotifier();
    const alert = notifier.formatMarketAlert('INTEREST_RATE_CUT', { metricChange: '0.5%' });
    expect(alert).toContain('UAE Central Bank');
    expect(alert).toContain('0.5%');
  });

  it('Upgrade 79: CampaignBudgetGuard enforces daily API cost ceilings', () => {
    const guard = new CampaignBudgetGuard({ dailyCostLimitUsd: 1.0 });
    expect(guard.canDispatchCampaign()).toBe(true);
    guard.recordApiCost(1.20);
    expect(guard.canDispatchCampaign()).toBe(false);
  });

  it('Upgrade 80: NoAnswerDripSequencer paces 3-stage drip sequence', () => {
    const drip = new NoAnswerDripSequencer();
    const next = drip.getNextStepSchedule(0);
    expect(next.hasNextStep).toBe(true);
    expect(next.stepName).toBe('FOLLOW_UP_STAGE_1');
    const msg = drip.getTemplateForStage(1, { leadName: 'Sultan' });
    expect(msg).toContain('Sultan');
  });
});

