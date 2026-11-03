import { MultiDeviceSyncVerifier } from '../../src/connection/MultiDeviceSyncVerifier.js';
import { ChatPresenceHeartbeat } from '../../src/connection/ChatPresenceHeartbeat.js';
import { EphemeralMediaSpooler } from '../../src/intelligence/EphemeralMediaSpooler.js';
import { TypingStateGuard } from '../../src/anti-ban/TypingStateGuard.js';
import { NetworkCircuitBreaker } from '../../src/connection/NetworkCircuitBreaker.js';
import { WebVersionPinner } from '../../src/connection/WebVersionPinner.js';
import { ContactAvatarCache } from '../../src/accounts/ContactAvatarCache.js';
import { WhatsAppLabelSynchronizer } from '../../src/outreach/WhatsAppLabelSynchronizer.js';
import { BroadcastListManager } from '../../src/outreach/BroadcastListManager.js';
import { GroupMessageQuarantine } from '../../src/intelligence/GroupMessageQuarantine.js';
import { MissedCallAutoResponder } from '../../src/outreach/MissedCallAutoResponder.js';
import { ReadReceiptScheduler } from '../../src/anti-ban/ReadReceiptScheduler.js';
import { MessageReactionTelemetry } from '../../src/intelligence/MessageReactionTelemetry.js';
import { InteractiveListMessageBuilder } from '../../src/outreach/InteractiveListMessageBuilder.js';
import { MicroTypoSimulator } from '../../src/anti-ban/MicroTypoSimulator.js';

describe('Mega Batch Upgrades 6–20 (Network, Outreach & Anti-Ban)', () => {
  it('Upgrade 6: MultiDeviceSyncVerifier monitors companion device health', () => {
    const verifier = new MultiDeviceSyncVerifier({ maxSyncLagMs: 1000 });
    verifier.recordSyncPulse('session_1');
    expect(verifier.getSyncHealth('session_1').healthy).toBe(true);
  });

  it('Upgrade 7: ChatPresenceHeartbeat gates presence intervals', () => {
    const presence = new ChatPresenceHeartbeat({ pulseIntervalMs: 5000 });
    expect(presence.shouldSendPresence('chat_1')).toBe(true);
    presence.recordPresence('chat_1');
    expect(presence.shouldSendPresence('chat_1')).toBe(false);
  });

  it('Upgrade 8: EphemeralMediaSpooler spools buffer to local disk', () => {
    const spooler = new EphemeralMediaSpooler({ spoolDir: 'scratch/test-spool' });
    const res = spooler.spoolMedia('msg_voice_1', Buffer.from('test voice audio'), 'audio/ogg');
    expect(res.bytes).toBeGreaterThan(0);
    expect(res.filePath).toContain('.ogg');
  });

  it('Upgrade 9: TypingStateGuard calculates heartbeat durations', () => {
    const guard = new TypingStateGuard();
    const duration = guard.calculateTypingDuration('Hello this is a test response from Linda');
    expect(duration).toBeGreaterThanOrEqual(1200);
    const slices = guard.getHeartbeatIntervals(duration);
    expect(slices.length).toBeGreaterThanOrEqual(1);
  });

  it('Upgrade 10: NetworkCircuitBreaker trips on consecutive failures', () => {
    const breaker = new NetworkCircuitBreaker({ failureThreshold: 2 });
    expect(breaker.canExecute()).toBe(true);
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canExecute()).toBe(false);
    breaker.recordSuccess();
    expect(breaker.canExecute()).toBe(true);
  });

  it('Upgrade 11: WebVersionPinner falls back between versions', () => {
    const pinner = new WebVersionPinner();
    const v1 = pinner.getCurrentVersion();
    const v2 = pinner.rotateToFallback();
    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
  });

  it('Upgrade 12: ContactAvatarCache manages avatar TTL', () => {
    const cache = new ContactAvatarCache({ ttlMs: 1000 });
    cache.setAvatar('971501234567@c.us', 'https://img.test/avatar.jpg');
    expect(cache.getAvatar('971501234567@c.us')).toBe('https://img.test/avatar.jpg');
  });

  it('Upgrade 13: WhatsAppLabelSynchronizer assigns and queries pipeline labels', () => {
    const labels = new WhatsAppLabelSynchronizer();
    labels.assignLabel('chat_101', 2);
    expect(labels.hasLabel('chat_101', 2)).toBe(true);
    expect(labels.getLabels('chat_101')[0].name).toBe('Prospect Qualified');
  });

  it('Upgrade 14: BroadcastListManager chunks recipients to <= 256', () => {
    const mgr = new BroadcastListManager();
    const recipients = Array.from({ length: 300 }, (_, i) => `+971500000${i}`);
    const chunks = mgr.chunkForBroadcast(recipients);
    expect(chunks.length).toBe(2);
    expect(chunks[0].length).toBe(256);
    expect(chunks[1].length).toBe(44);
  });

  it('Upgrade 15: GroupMessageQuarantine filters unmentioned group chatter', () => {
    const quarantine = new GroupMessageQuarantine({ botJid: 'bot@c.us' });
    const direct = quarantine.shouldProcessGroupMessage({ from: 'user@c.us' });
    expect(direct.process).toBe(true);

    const groupNoise = quarantine.shouldProcessGroupMessage({ from: 'group@g.us', body: 'random chatter' });
    expect(groupNoise.process).toBe(false);

    const groupMention = quarantine.shouldProcessGroupMessage({ from: 'group@g.us', mentionedIds: ['bot@c.us'] });
    expect(groupMention.process).toBe(true);
  });

  it('Upgrade 16: MissedCallAutoResponder generates contextual response', () => {
    const responder = new MissedCallAutoResponder();
    expect(responder.shouldRespondToCall('caller_1')).toBe(true);
    const reply = responder.generateMissedCallReply('caller_1', { leadName: 'Rashid' });
    expect(reply).toContain('Rashid');
    expect(responder.shouldRespondToCall('caller_1')).toBe(false); // Cooldown active
  });

  it('Upgrade 17: ReadReceiptScheduler calculates natural human read delay', () => {
    const scheduler = new ReadReceiptScheduler();
    const delay = scheduler.calculateReadDelay(100);
    expect(delay).toBeGreaterThanOrEqual(2500);
  });

  it('Upgrade 18: MessageReactionTelemetry maps reaction emojis to sentiment weights', () => {
    const telemetry = new MessageReactionTelemetry();
    const positive = telemetry.recordReactionEvent('msg_1', '👍');
    expect(positive.sentiment).toBe('POSITIVE');
    expect(positive.weight).toBe(1.0);

    const negative = telemetry.recordReactionEvent('msg_2', '😡');
    expect(negative.sentiment).toBe('VERY_NEGATIVE');
    expect(negative.weight).toBe(-3.0);
  });

  it('Upgrade 19: InteractiveListMessageBuilder builds structured list menus and buttons', () => {
    const builder = new InteractiveListMessageBuilder();
    const list = builder.buildListMessage({
      title: 'Dubai Communities',
      description: 'Choose your desired area',
      sections: [{ title: 'Luxury', rows: [{ title: 'Palm Jumeirah' }] }],
    });
    expect(list.type).toBe('interactive_list');

    const buttons = builder.buildQuickReplyButtons('Interested in viewing?', [
      { text: 'Yes, Tomorrow' },
      { text: 'Send Brochure' },
    ]);
    expect(buttons.buttons.length).toBe(2);
  });

  it('Upgrade 20: MicroTypoSimulator models natural typing errors and pause durations', () => {
    const sim = new MicroTypoSimulator({ typoProbability: 1.0 }); // 100% for test determinism
    const typo = sim.generateTypoSequence('luxury');
    expect(typo).not.toBeNull();
    expect(typo.pauseBeforeFixMs).toBeGreaterThanOrEqual(200);
    expect(typo.correctedWord).toBe('luxury');
  });
});

