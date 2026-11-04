/**
 * @file Batch16MegaUpgrades.test.js
 * @description Unit tests for Mega Batch 16 (Upgrades 216-230: Voice Edge & Computer Vision / 3D).
 */

import { VoiceNoteAdaptiveTruncator } from '../../src/intelligence/VoiceNoteAdaptiveTruncator.js';
import { DynamicVoicePersonaSwitcher } from '../../src/intelligence/DynamicVoicePersonaSwitcher.js';
import { MultiSpeakerDiarizationParser } from '../../src/intelligence/MultiSpeakerDiarizationParser.js';
import { PhoneticKeywordTrigger } from '../../src/intelligence/PhoneticKeywordTrigger.js';
import { AudioCacheEdgeManager } from '../../src/intelligence/AudioCacheEdgeManager.js';
import { MatterportTourFrameExtractor } from '../../src/intelligence/MatterportTourFrameExtractor.js';
import { AiVideoWalkthroughGenerator } from '../../src/intelligence/AiVideoWalkthroughGenerator.js';
import { LuxuryMaterialFinishDetector } from '../../src/intelligence/LuxuryMaterialFinishDetector.js';
import { ViewAuthenticityVerifier } from '../../src/intelligence/ViewAuthenticityVerifier.js';
import { SatelliteConstructionTracker } from '../../src/intelligence/SatelliteConstructionTracker.js';
import { MediaBrandingWatermarker } from '../../src/intelligence/MediaBrandingWatermarker.js';
import { InteriorDesignClassifier } from '../../src/intelligence/InteriorDesignClassifier.js';
import { PhotoLightingScorer } from '../../src/intelligence/PhotoLightingScorer.js';
import { FloorPlanDollhouseConverter } from '../../src/intelligence/FloorPlanDollhouseConverter.js';
import { PoolGardenDimensionEstimator } from '../../src/intelligence/PoolGardenDimensionEstimator.js';

describe('Mega Batch 16 (Upgrades 216–230: Voice Edge & Computer Vision) Test Suite', () => {
  // Upgrade 216
  test('Upgrade 216: VoiceNoteAdaptiveTruncator adapts audio duration and trims scripts', () => {
    const truncator = new VoiceNoteAdaptiveTruncator();
    const execTarget = truncator.resolveTargetDuration({ buyerType: 'executive' });
    expect(execTarget.maxDurationSeconds).toBe(30);

    const longScript = 'word '.repeat(100);
    const fitted = truncator.fitScriptToDuration(longScript, 30, 130);
    expect(fitted.split(/\s+/).length).toBeLessThan(80);
    expect(fitted).toContain('elaborate');
  });

  // Upgrade 217
  test('Upgrade 217: DynamicVoicePersonaSwitcher switches between Concierge, Analyst, and Director', () => {
    const switcher = new DynamicVoicePersonaSwitcher();

    const director = switcher.resolvePersona({ leadTier: 'UHNW_VIP' });
    expect(director.id).toBe('PRIVATE_OFFICE_DIRECTOR');
    expect(director.formalityScore).toBe(95);

    const analyst = switcher.resolvePersona({ intent: 'FINANCIAL_ROI' });
    expect(analyst.id).toBe('INVESTMENT_ANALYST');

    const concierge = switcher.resolvePersona();
    expect(concierge.id).toBe('WARM_CONCIERGE');
  });

  // Upgrade 218
  test('Upgrade 218: MultiSpeakerDiarizationParser attributes utterances and signals to speakers', () => {
    const parser = new MultiSpeakerDiarizationParser();
    const diarized = [
      { speaker: 'HUSBAND', text: 'What is the net rental yield and cash flow?', startMs: 0, endMs: 4000 },
      { speaker: 'WIFE', text: 'Are there good schools and a private garden for the kids?', startMs: 4500, endMs: 8000 }
    ];

    const parsed = parser.parseDiarization(diarized);
    expect(parsed.speakerCount).toBe(2);
    expect(parsed.speakers.HUSBAND.keywords).toContain('financial_focus');
    expect(parsed.speakers.WIFE.keywords).toContain('family_focus');
  });

  // Upgrade 219
  test('Upgrade 219: PhoneticKeywordTrigger fires alerts on deposit and cancellation triggers', () => {
    const trigger = new PhoneticKeywordTrigger();

    const depositAlert = trigger.scanTranscript('I have the manager cheque and am ready to put deposit today.');
    expect(depositAlert.triggered).toBe(true);
    expect(depositAlert.matches[0].triggerId).toBe('DEPOSIT_READY');
    expect(depositAlert.matches[0].priority).toBe('CRITICAL');

    const clean = trigger.scanTranscript('Just looking around at general listings.');
    expect(clean.triggered).toBe(false);
  });

  // Upgrade 220
  test('Upgrade 220: AudioCacheEdgeManager caches buffers with TTL and tracks hits', () => {
    const cache = new AudioCacheEdgeManager({ ttlMs: 5000 });
    const buffer = Buffer.from('FAKE_AUDIO_SAMPLE');

    const key = cache.put('Welcome to Dubai', 'voice_linda', buffer);
    expect(key).toBeDefined();

    const hit = cache.get('Welcome to Dubai', 'voice_linda');
    expect(hit).not.toBeNull();
    expect(hit.hits).toBe(1);

    expect(cache.get('Unknown text', 'voice_linda')).toBeNull();
  });

  // Upgrade 221
  test('Upgrade 221: MatterportTourFrameExtractor parses 3D showcase links and model IDs', () => {
    const extractor = new MatterportTourFrameExtractor();
    const res = extractor.parseMatterportUrl('https://my.matterport.com/show/?m=AbCdEfGh123&play=1');

    expect(res.valid).toBe(true);
    expect(res.modelId).toBe('AbCdEfGh123');
    expect(res.embedUrl).toContain('play=1');
    expect(res.dollhouseThumbnailUrl).toContain('AbCdEfGh123');
  });

  // Upgrade 222
  test('Upgrade 222: AiVideoWalkthroughGenerator builds vertical video storyboard scenes', () => {
    const gen = new AiVideoWalkthroughGenerator();
    const board = gen.generateStoryboard({
      title: 'Palm Signature Villa',
      priceAed: 35000000,
      imageUrls: ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg']
    });

    expect(board.targetAspect).toBe('9:16');
    expect(board.scenes.length).toBe(4);
    expect(board.closingOverlay.priceText).toContain('35,000,000');
  });

  // Upgrade 223
  test('Upgrade 223: LuxuryMaterialFinishDetector identifies Calacatta marble and Gaggenau appliances', () => {
    const detector = new LuxuryMaterialFinishDetector();
    const res = detector.evaluateFinishes('Fitted with Calacatta marble counters and Gaggenau induction cooktop.');

    expect(res.isUltraLuxury).toBe(true);
    expect(res.identifiedFinishes.length).toBe(2);
    expect(res.score).toBeGreaterThanOrEqual(50);
  });

  // Upgrade 224
  test('Upgrade 224: ViewAuthenticityVerifier verifies Burj Khalifa and sea view plausibility', () => {
    const verifier = new ViewAuthenticityVerifier();

    const plausibleBurj = verifier.verifyViewPlausibility({
      community: 'Downtown Dubai',
      floorLevel: 25,
      claimedView: 'Full Burj Khalifa View'
    });
    expect(plausibleBurj.verified).toBe(true);

    const fakeSeaView = verifier.verifyViewPlausibility({
      community: 'Dubailand (Desert)',
      floorLevel: 10,
      claimedView: 'Panoramic Sea View'
    });
    expect(fakeSeaView.verified).toBe(false);
  });

  // Upgrade 225
  test('Upgrade 225: SatelliteConstructionTracker benchmarks project completion stages', () => {
    const tracker = new SatelliteConstructionTracker();
    const analysis = tracker.evaluateMilestoneHealth({
      projectName: 'Creek Waters',
      completionPercent: 72,
      scheduledHandover: '2027-Q2'
    });

    expect(analysis.currentStage).toBe('FAÇADE_MEP_INTERIORS');
    expect(analysis.status).toBe('ON_SCHEDULE');
    expect(analysis.recommendation).toContain('secondary off-plan assignment');
  });

  // Upgrade 226
  test('Upgrade 226: MediaBrandingWatermarker creates compliant SVG watermarks with RERA ORN', () => {
    const watermarker = new MediaBrandingWatermarker({ agencyName: 'Premier Real Estate', reraOrn: 'ORN-9988' });
    const spec = watermarker.generateWatermarkSpec({ width: 1920, height: 1080 }, 'Broker Zayd');

    expect(spec.canvasDimensions.width).toBe(1920);
    expect(spec.svgBadgeMarkup).toContain('Premier Real Estate');
    expect(spec.svgBadgeMarkup).toContain('ORN-9988');
    expect(spec.svgBadgeMarkup).toContain('Broker Zayd');
  });

  // Upgrade 227
  test('Upgrade 227: InteriorDesignClassifier classifies decor styles from listings', () => {
    const classifier = new InteriorDesignClassifier();

    const minimal = classifier.classifyStyle('Features clean lines, monochrome tones, and open concept living.');
    expect(minimal.primaryStyle).toBe('MODERN_MINIMALIST');

    const arabesque = classifier.classifyStyle('Grand majlis with crystal chandeliers and intricate mashrabiya panels.');
    expect(arabesque.primaryStyle).toBe('ARABESQUE_PALATIAL');
  });

  // Upgrade 228
  test('Upgrade 228: PhotoLightingScorer scores image luminance and golden hour exposure', () => {
    const scorer = new PhotoLightingScorer();

    const hero = scorer.scorePhotoLighting({ averageLuminance: 140, contrastRatio: 8, colorTempKelvin: 3800 });
    expect(hero.isHeroWorthy).toBe(true);
    expect(hero.tags).toContain('GOLDEN_HOUR_WARMTH');
    expect(hero.tags).toContain('WELL_EXPOSED');

    const dark = scorer.scorePhotoLighting({ averageLuminance: 50 });
    expect(dark.isHeroWorthy).toBe(false);
    expect(dark.tags).toContain('UNDEREXPOSED');
  });

  // Upgrade 229
  test('Upgrade 229: FloorPlanDollhouseConverter generates 3D room scenes and calculates sqft', () => {
    const converter = new FloorPlanDollhouseConverter();
    const scene = converter.generateDollhouseScene([
      { name: 'Master Bedroom', widthMeters: 5, lengthMeters: 6 },
      { name: 'Living Room', widthMeters: 8, lengthMeters: 6 }
    ]);

    expect(scene.rooms.length).toBe(2);
    expect(scene.totalAreaSqFt).toBeGreaterThan(800);
    expect(scene.cameraAngle).toBe('isometric_45_deg');
  });

  // Upgrade 230
  test('Upgrade 230: PoolGardenDimensionEstimator estimates pool volume and outdoor areas', () => {
    const estimator = new PoolGardenDimensionEstimator();
    const outdoor = estimator.estimateOutdoorDimensions({
      plotSizeSqFt: 8000,
      builtUpAreaSqFt: 5000,
      hasPrivatePool: true
    });

    expect(outdoor.outdoorGardenSpaceSqFt).toBeGreaterThan(4000);
    expect(outdoor.hasPrivatePool).toBe(true);
    expect(outdoor.poolDimensions.estimatedVolumeLiters).toBe(54000);
    expect(outdoor.landscapingPotential).toBe('EXPANSIVE_ESTATE');
  });
});
