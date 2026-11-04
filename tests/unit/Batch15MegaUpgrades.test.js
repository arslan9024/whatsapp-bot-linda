/**
 * @file Batch15MegaUpgrades.test.js
 * @description Unit tests for Mega Batch 15 (Upgrades 201-215: Voice AI & Dynamic Telephony).
 */

import { FullDuplexVoiceStreamer } from '../../src/intelligence/FullDuplexVoiceStreamer.js';
import { RegionalAccentVoiceCloner } from '../../src/intelligence/RegionalAccentVoiceCloner.js';
import { AudioEmotionHesitationAnalyzer } from '../../src/intelligence/AudioEmotionHesitationAnalyzer.js';
import { WhatsAppAudioIvrMenu } from '../../src/outreach/WhatsAppAudioIvrMenu.js';
import { VoicemailGreetingDetector } from '../../src/intelligence/VoicemailGreetingDetector.js';
import { DubaiAmbientNoiseSimulator } from '../../src/intelligence/DubaiAmbientNoiseSimulator.js';
import { AudioWatermarkVerifier } from '../../src/security/AudioWatermarkVerifier.js';
import { SpeechToIntentFastMatcher } from '../../src/intelligence/SpeechToIntentFastMatcher.js';
import { PstnTelephonyBridge } from '../../src/integrations/PstnTelephonyBridge.js';
import { KhaleejiDialectNormalizer } from '../../src/intelligence/KhaleejiDialectNormalizer.js';
import { VoicePacingHarmonizer } from '../../src/intelligence/VoicePacingHarmonizer.js';
import { InCallBrokerLiveAssist } from '../../src/intelligence/InCallBrokerLiveAssist.js';
import { DailyAudioPodcastGenerator } from '../../src/intelligence/DailyAudioPodcastGenerator.js';
import { AudioQualityBooster } from '../../src/intelligence/AudioQualityBooster.js';
import { CallRecordingConsentAuditor } from '../../src/core/CallRecordingConsentAuditor.js';

describe('Mega Batch 15 (Upgrades 201–215: Voice AI & Telephony) Test Suite', () => {
  // Upgrade 201
  test('Upgrade 201: FullDuplexVoiceStreamer opens streams and handles client barge-in', () => {
    const streamer = new FullDuplexVoiceStreamer({ interruptionThresholdDb: -20 });
    const session = streamer.openStream('stream_101');
    expect(session.isListening).toBe(true);

    session.isSpeaking = true;
    const interruption = streamer.processAudioChunk('stream_101', -15); // Louder than -20dB
    expect(interruption.interrupted).toBe(true);
    expect(session.isSpeaking).toBe(false);

    expect(streamer.closeStream('stream_101')).toBe(true);
  });

  // Upgrade 202
  test('Upgrade 202: RegionalAccentVoiceCloner resolves acoustic profiles by regional code', () => {
    const cloner = new RegionalAccentVoiceCloner();
    const ukProfile = cloner.resolveVoiceProfile('+44');
    expect(ukProfile.voiceId).toContain('Neural-Linda-Posh');

    const uaeProfile = cloner.resolveVoiceProfile('+971');
    expect(uaeProfile.voiceId).toContain('Neural-Fatima-Warm');

    const fallback = cloner.resolveVoiceProfile('+1');
    expect(fallback.voiceId).toContain('Neural-Linda-Standard');
  });

  // Upgrade 203
  test('Upgrade 203: AudioEmotionHesitationAnalyzer detects hesitation and excitement', () => {
    const analyzer = new AudioEmotionHesitationAnalyzer();

    const hesitant = analyzer.analyzeEmotion({ silenceRatio: 0.50, wordsPerMinute: 80 });
    expect(hesitant.emotion).toBe('HESITANT');
    expect(hesitant.closingTip).toContain('payment plan');

    const excited = analyzer.analyzeEmotion({ pitchVarianceHz: 50, wordsPerMinute: 160 });
    expect(excited.emotion).toBe('EXCITED');
  });

  // Upgrade 204
  test('Upgrade 204: WhatsAppAudioIvrMenu builds interactive audio options structure', () => {
    const ivr = new WhatsAppAudioIvrMenu();
    const menu = ivr.buildAudioMenu({ clientName: 'Sultan' });

    expect(menu.type).toBe('interactive_audio_menu');
    expect(menu.caption).toContain('Sultan');
    expect(menu.interactiveOptions.length).toBe(4);
  });

  // Upgrade 205
  test('Upgrade 205: VoicemailGreetingDetector identifies carrier automated messages', () => {
    const detector = new VoicemailGreetingDetector();

    const human = detector.detectVoicemail('Hello this is Tariq, how can I help you?');
    expect(human.isVoicemail).toBe(false);

    const voicemail = detector.detectVoicemail('Please leave a message after the beep');
    expect(voicemail.isVoicemail).toBe(true);
    expect(voicemail.confidence).toBe(95);
  });

  // Upgrade 206
  test('Upgrade 206: DubaiAmbientNoiseSimulator produces audio mixing filter parameters', () => {
    const simulator = new DubaiAmbientNoiseSimulator();
    const recipe = simulator.getMixingRecipe('MARINA_TERRACE_BREEZE', 15);

    expect(recipe.profileName).toContain('Marina');
    expect(recipe.ffmpegFilterSpec).toContain('volume=-30dB');
    expect(recipe.targetDuration).toBe(15);
  });

  // Upgrade 207
  test('Upgrade 207: AudioWatermarkVerifier signs and verifies audio buffers', () => {
    const verifier = new AudioWatermarkVerifier('secret_key_123');
    const audioBuf = Buffer.from('FAKE_AUDIO_SAMPLE_DATA_BYTES_12345');

    const sig = verifier.signAudioBuffer(audioBuf, 'linda');
    expect(sig).toBeDefined();

    expect(verifier.verifySignature(audioBuf, sig, 'linda')).toBe(true);
    expect(verifier.verifySignature(audioBuf, 'invalid_sig', 'linda')).toBe(false);
  });

  // Upgrade 208
  test('Upgrade 208: SpeechToIntentFastMatcher matches primary real estate intents', () => {
    const matcher = new SpeechToIntentFastMatcher();

    const viewing = matcher.matchIntent('Can we schedule a viewing tomorrow at 4pm?');
    expect(viewing.intent).toBe('BOOK_VIEWING');
    expect(viewing.matched).toBe(true);

    const brochure = matcher.matchIntent('Please send the floor plan layout pdf');
    expect(brochure.intent).toBe('REQUEST_BROCHURE');
  });

  // Upgrade 209
  test('Upgrade 209: PstnTelephonyBridge generates call bridge initiation payload', () => {
    const bridge = new PstnTelephonyBridge({ outboundCallerId: '+97143332211' });
    const call = bridge.createBridgeCall({
      buyerPhone: '+971501112233',
      brokerPhone: '+971559998877',
      propertyRef: 'EMAAR-BEACH-401'
    });

    expect(call.callId).toContain('call_');
    expect(call.legA_broker).toBe('+971559998877');
    expect(call.legB_buyer).toBe('+971501112233');
    expect(call.whisperGreeting).toContain('EMAAR-BEACH-401');
  });

  // Upgrade 210
  test('Upgrade 210: KhaleejiDialectNormalizer identifies Emirati terms and maps to MSA/English', () => {
    const normalizer = new KhaleejiDialectNormalizer();
    const result = normalizer.normalizeDialect('هذا العقار وايد زين كم سعره طال عمرك؟');

    expect(result.hasDialect).toBe(true);
    expect(result.dialectMatches.length).toBeGreaterThanOrEqual(2);
    expect(result.dialectMatches.some(m => m.slang === 'وايد زين')).toBe(true);
  });

  // Upgrade 211
  test('Upgrade 211: VoicePacingHarmonizer computes pacing multipliers from client WPM', () => {
    const harmonizer = new VoicePacingHarmonizer();

    const slow = harmonizer.calculateMirroringPace(90);
    expect(slow.targetSpeedMultiplier).toBe(0.90);
    expect(slow.profile).toBe('DELIBERATE_REASSURING');

    const fast = harmonizer.calculateMirroringPace(170);
    expect(fast.targetSpeedMultiplier).toBe(1.15);
    expect(fast.profile).toBe('CONCISE_DYNAMIC');
  });

  // Upgrade 212
  test('Upgrade 212: InCallBrokerLiveAssist generates teleprompter assistance cards', () => {
    const assist = new InCallBrokerLiveAssist();
    const cue = assist.generateLiveCue('How much are the service charges here?', 'BURJ-CROWN');

    expect(cue.cueType).toBe('FACT_CHECK');
    expect(cue.headline).toContain('17.5 AED/sqft');
    expect(cue.coachingAdvice).toBeDefined();
  });

  // Upgrade 213
  test('Upgrade 213: DailyAudioPodcastGenerator creates 60-second morning briefing script', () => {
    const pod = new DailyAudioPodcastGenerator();
    const res = pod.generatePodcastScript({
      clientName: 'Rashid',
      targetCommunity: 'Palm Jumeirah',
      newProperties: [{ id: 'p1' }, { id: 'p2' }]
    });

    expect(res.title).toContain('Palm Jumeirah');
    expect(res.spokenScript).toContain('Good morning, Rashid');
    expect(res.spokenScript).toContain('2 exclusive units');
  });

  // Upgrade 214
  test('Upgrade 214: AudioQualityBooster builds filter graph and inspects bitrate health', () => {
    const booster = new AudioQualityBooster();
    const filter = booster.buildEnhancementFilter({ deNoise: true, normalizeVolume: true });

    expect(filter).toContain('highpass');
    expect(filter).toContain('loudnorm');

    const health = booster.inspectAudioHealth(40000, 10);
    expect(health.bitrateKbps).toBe(32);
    expect(health.isOptimalForWhatsApp).toBe(true);
  });

  // Upgrade 215
  test('Upgrade 215: CallRecordingConsentAuditor registers consent and verifies compliance', () => {
    const auditor = new CallRecordingConsentAuditor();
    const phone = '+971501234567';

    expect(auditor.isRecordingPermitted(phone)).toBe(false);
    auditor.registerConsent(phone, 'verbal_announcement');
    expect(auditor.isRecordingPermitted(phone)).toBe(true);

    const announcement = auditor.getConsentAnnouncement();
    expect(announcement).toContain('UAE');
    expect(announcement).toContain('المكالمة');
  });
});
