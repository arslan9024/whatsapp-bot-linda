import { ReadingPauseSimulator } from '../../src/anti-ban/ReadingPauseSimulator.js';
import { DubaiCadenceCurves } from '../../src/anti-ban/DubaiCadenceCurves.js';
import { SpintaxSyntaxEngine } from '../../src/outreach/SpintaxSyntaxEngine.js';
import { InboundOutboundRatioGuard } from '../../src/anti-ban/InboundOutboundRatioGuard.js';
import { SpamKeywordSanitizer } from '../../src/anti-ban/SpamKeywordSanitizer.js';
import { GaussianJitterScheduler } from '../../src/anti-ban/GaussianJitterScheduler.js';
import { MultiSimAccountRotator } from '../../src/accounts/MultiSimAccountRotator.js';
import { MobileDeviceTelemetryEmulator } from '../../src/connection/MobileDeviceTelemetryEmulator.js';
import { ChromiumIdleGhostEmulation } from '../../src/connection/ChromiumIdleGhostEmulation.js';
import { WeekendPacingProfile } from '../../src/anti-ban/WeekendPacingProfile.js';
import { BlockedContactQuarantine } from '../../src/accounts/BlockedContactQuarantine.js';
import { AntiVelocityBurstGate } from '../../src/anti-ban/AntiVelocityBurstGate.js';
import { MobileTouchViewportSimulator } from '../../src/connection/MobileTouchViewportSimulator.js';
import { UnreadCatchUpPacer } from '../../src/anti-ban/UnreadCatchUpPacer.js';
import { ContactVCardGenerator } from '../../src/outreach/ContactVCardGenerator.js';

describe('Mega Batch 3 Upgrades 21–35 (Anti-Ban Armor, Cadence & Outreach)', () => {
  it('Upgrade 21: ReadingPauseSimulator computes reading delay from word count', () => {
    const sim = new ReadingPauseSimulator();
    const delay = sim.calculateReadingPause('This is an important luxury villa listing in Dubai');
    expect(delay).toBeGreaterThanOrEqual(600);
  });

  it('Upgrade 22: DubaiCadenceCurves modulates rates by Dubai business hours', () => {
    const cadence = new DubaiCadenceCurves();
    expect(cadence.getMultiplierForHour(10)).toBe(1.0); // Peak morning
    expect(cadence.getMultiplierForHour(23)).toBe(0.0); // Quiet night
  });

  it('Upgrade 23: SpintaxSyntaxEngine resolves spintax variations and counts combos', () => {
    const spintax = new SpintaxSyntaxEngine();
    const template = '{Hi|Hello} {there|friend}, welcome to Dubai!';
    const spun = spintax.spin(template);
    expect(spun).toMatch(/(Hi|Hello) (there|friend), welcome to Dubai!/);
    expect(spintax.getCombinationsCount(template)).toBe(4);
  });

  it('Upgrade 24: InboundOutboundRatioGuard safeguards conversation health ratio', () => {
    const guard = new InboundOutboundRatioGuard({ minSamples: 3, maxOutboundRatio: 2.0 });
    guard.recordOutbound('sess_1');
    guard.recordOutbound('sess_1');
    guard.recordOutbound('sess_1');
    expect(guard.canSendOutbound('sess_1')).toBe(false); // 3 out, 0 in
    guard.recordInbound('sess_1');
    guard.recordInbound('sess_1');
    expect(guard.canSendOutbound('sess_1')).toBe(true); // 3 out, 2 in = 1.5 ratio <= 2.0
  });

  it('Upgrade 25: SpamKeywordSanitizer detects and neutralizes high-risk triggers', () => {
    const sanitizer = new SpamKeywordSanitizer();
    const result = sanitizer.scan('Get 100% guarantee on crypto investment guaranteed returns!');
    expect(result.safe).toBe(false);
    expect(result.detected.length).toBeGreaterThan(0);
  });

  it('Upgrade 26: GaussianJitterScheduler produces bounded Gaussian delays', () => {
    const jitter = new GaussianJitterScheduler({ meanMs: 30000, minMs: 10000, maxMs: 60000 });
    const interval = jitter.getNextInterval();
    expect(interval).toBeGreaterThanOrEqual(10000);
    expect(interval).toBeLessThanOrEqual(60000);
  });

  it('Upgrade 27: MultiSimAccountRotator chooses least-utilized phone SIM', () => {
    const rotator = new MultiSimAccountRotator({ maxHourlySends: 5 });
    rotator.recordSend('+971501111111');
    rotator.recordSend('+971501111111');
    const best = rotator.selectBestAccount(['+971501111111', '+971502222222']);
    expect(best).toBe('+971502222222');
  });

  it('Upgrade 28: MobileDeviceTelemetryEmulator simulates dynamic battery & wifi', () => {
    const telem = new MobileDeviceTelemetryEmulator();
    const state = telem.getSimulatedState();
    expect(state.battery).toBeGreaterThanOrEqual(18);
    expect(state.network).toBe('WIFI');
  });

  it('Upgrade 29: ChromiumIdleGhostEmulation generates random human interactions', () => {
    const ghost = new ChromiumIdleGhostEmulation();
    const action = ghost.generateGhostAction();
    expect(action.action).toBeDefined();
    expect(action.nextDelayMs).toBeGreaterThan(0);
  });

  it('Upgrade 30: WeekendPacingProfile reduces weekend quotas by 65%', () => {
    const weekend = new WeekendPacingProfile();
    // Sunday in Dubai
    const sunDate = new Date('2026-11-08T10:00:00Z');
    const quota = weekend.getAdjustedQuota(100, sunDate);
    expect(quota).toBe(35); // 65% reduction
  });

  it('Upgrade 31: BlockedContactQuarantine maintains blocking records', () => {
    const quarantine = new BlockedContactQuarantine();
    quarantine.recordBlock('+971509998888');
    expect(quarantine.isQuarantined('+971509998888')).toBe(true);
    expect(quarantine.isQuarantined('+971500000000')).toBe(false);
  });

  it('Upgrade 32: AntiVelocityBurstGate limits sends to <= 4 per rolling minute', () => {
    const gate = new AntiVelocityBurstGate({ maxPerMinute: 2 });
    expect(gate.canDispatch('sess_gate')).toBe(true);
    gate.recordDispatch('sess_gate');
    gate.recordDispatch('sess_gate');
    expect(gate.canDispatch('sess_gate')).toBe(false);
  });

  it('Upgrade 33: MobileTouchViewportSimulator provides tablet viewport specs', () => {
    const sim = new MobileTouchViewportSimulator();
    const prof = sim.getPuppeteerViewportArgs(0);
    expect(prof.viewport.hasTouch).toBe(true);
    expect(prof.viewport.isMobile).toBe(true);
  });

  it('Upgrade 34: UnreadCatchUpPacer plans phased message delivery batches', () => {
    const pacer = new UnreadCatchUpPacer({ batchSize: 2 });
    const batches = pacer.planCatchUp(['m1', 'm2', 'm3', 'm4', 'm5']);
    expect(batches.length).toBe(3);
    expect(batches[0].items.length).toBe(2);
    expect(batches[2].items.length).toBe(1);
  });

  it('Upgrade 35: ContactVCardGenerator formats standard vCards and detects intent', () => {
    const vcard = new ContactVCardGenerator();
    const cardText = vcard.generateVCard({ fullName: 'Linda Assistant' });
    expect(cardText).toContain('BEGIN:VCARD');
    expect(cardText).toContain('FN:Linda Assistant');
    expect(vcard.isVCardRequest('please send your contact card')).toBe(true);
  });
});

