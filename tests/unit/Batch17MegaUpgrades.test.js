/**
 * @file Batch17MegaUpgrades.test.js
 * @description Unit tests for Mega Batch 17 (Upgrades 231-245: Vision & Dubai Spatial Intelligence).
 */

import { VirtualStagingPreviewGenerator } from '../../src/intelligence/VirtualStagingPreviewGenerator.js';
import { ReverseImageListingFinder } from '../../src/intelligence/ReverseImageListingFinder.js';
import { BalconySafetyAuditor } from '../../src/intelligence/BalconySafetyAuditor.js';
import { SmartImageWebpOptimizer } from '../../src/intelligence/SmartImageWebpOptimizer.js';
import { CarouselCardSynthesizer } from '../../src/outreach/CarouselCardSynthesizer.js';
import { VideoSubtitleCaptionBurner } from '../../src/intelligence/VideoSubtitleCaptionBurner.js';
import { DefectSnaggingClassifier } from '../../src/intelligence/DefectSnaggingClassifier.js';
import { VirtualOpenHouseLivestreamHost } from '../../src/outreach/VirtualOpenHouseLivestreamHost.js';
import { MasterPlanRenderComparator } from '../../src/intelligence/MasterPlanRenderComparator.js';
import { FacialPrivacyMasker } from '../../src/security/FacialPrivacyMasker.js';
import { MetroTransitRadiusScorer } from '../../src/spatial/MetroTransitRadiusScorer.js';
import { DubaiMasterPlan2040Zoning } from '../../src/spatial/DubaiMasterPlan2040Zoning.js';
import { TrafficCommutePredictor } from '../../src/spatial/TrafficCommutePredictor.js';
import { SunExposureHeatSimulator } from '../../src/spatial/SunExposureHeatSimulator.js';
import { AirportFlightNoiseProfiler } from '../../src/spatial/AirportFlightNoiseProfiler.js';

describe('Mega Batch 17 (Upgrades 231–245: Vision & Spatial Intelligence) Test Suite', () => {
  // Upgrade 231
  test('Upgrade 231: VirtualStagingPreviewGenerator creates staging recipes and furniture elements', () => {
    const generator = new VirtualStagingPreviewGenerator();
    const recipe = generator.generateStagingRecipe('LIVING_ROOM');

    expect(recipe.roomType).toBe('LIVING_ROOM');
    expect(recipe.furnitureElements.length).toBeGreaterThan(2);
    expect(recipe.renderResolution).toBe('2048x1536');
  });

  // Upgrade 232
  test('Upgrade 232: ReverseImageListingFinder registers exclusive images and detects duplicates', () => {
    const finder = new ReverseImageListingFinder();
    const imageBuf = Buffer.alloc(100, 'exclusive_villa_pixel_bytes');

    const hash = finder.registerExclusiveImage('PALM-VILLA-101', imageBuf);
    expect(hash).toBeDefined();

    const check = finder.findMatch(imageBuf);
    expect(check.matchFound).toBe(true);
    expect(check.details.propertyRef).toBe('PALM-VILLA-101');

    const differentBuf = Buffer.alloc(100, 'unrelated_other_pixels');
    expect(finder.findMatch(differentBuf).matchFound).toBe(false);
  });

  // Upgrade 233
  test('Upgrade 233: BalconySafetyAuditor checks Dubai Municipality railing height and toddler safety', () => {
    const auditor = new BalconySafetyAuditor();

    const safe = auditor.auditBalconySafety({
      railingHeightMeters: 1.25,
      railingType: 'TEMPERED_LAMINATED_GLASS',
      depthMeters: 2.2
    });
    expect(safe.compliant).toBe(true);
    expect(safe.childSafe).toBe(true);

    const unsafe = auditor.auditBalconySafety({
      railingHeightMeters: 0.9, // below 1.2m
      railingType: 'HORIZONTAL_LADDER_RAIL',
      floorLevel: 15
    });
    expect(unsafe.compliant).toBe(false);
    expect(unsafe.childSafe).toBe(false);
  });

  // Upgrade 234
  test('Upgrade 234: SmartImageWebpOptimizer calculates optimal downscaling dimensions', () => {
    const optimizer = new SmartImageWebpOptimizer({ maxDimensionPx: 1600 });
    const dims = optimizer.calculateOptimalDimensions(4000, 3000);

    expect(dims.targetWidth).toBe(1600);
    expect(dims.targetHeight).toBe(1200);

    const recipe = optimizer.getOptimizationRecipe(10 * 1024 * 1024, 4000, 3000);
    expect(recipe.outputFormat).toBe('webp');
    expect(recipe.webpQuality).toBe(80);
  });

  // Upgrade 235
  test('Upgrade 235: CarouselCardSynthesizer synthesizes interactive multi-property carousel cards', () => {
    const synth = new CarouselCardSynthesizer();
    const carousel = synth.synthesizeCarousel([
      { ref: 'P1', title: 'Burj Crown 2BR', priceAed: 2800000, community: 'Downtown' },
      { ref: 'P2', title: 'Palm Villa', priceAed: 18500000, community: 'Palm Jumeirah' }
    ]);

    expect(carousel.type).toBe('interactive_carousel');
    expect(carousel.totalCards).toBe(2);
    expect(carousel.cards[0].caption).toContain('2,800,000');
    expect(carousel.cards[1].primaryButton.label).toBe('Book Viewing');
  });

  // Upgrade 236
  test('Upgrade 236: VideoSubtitleCaptionBurner formats SubRip SRT subtitle files', () => {
    const burner = new VideoSubtitleCaptionBurner();
    const srt = burner.generateSrtContent([
      { startMs: 0, endMs: 3000, textEn: 'Welcome to this luxury penthouse.', textAr: 'مرحباً بكم في هذا البنتهاوس الفاخر.' },
      { startMs: 3500, endMs: 6000, textEn: 'Featuring panoramic Burj Khalifa views.' }
    ]);

    expect(srt).toContain('1\r\n00:00:00,000 --> 00:00:03,000');
    expect(srt).toContain('Welcome to this luxury penthouse.');
    expect(srt).toContain('مرحباً بكم في هذا البنتهاوس الفاخر.');
  });

  // Upgrade 237
  test('Upgrade 237: DefectSnaggingClassifier identifies plumbing leaks and electrical issues', () => {
    const classifier = new DefectSnaggingClassifier();

    const leak = classifier.classifyDefect('Water stain and leakage under master bathroom vanity.');
    expect(leak.category).toBe('PLUMBING_WATER_LEAK');
    expect(leak.requiresImmediateDispatch).toBe(true);

    const paint = classifier.classifyDefect('Minor hairline paint crack on balcony wall.');
    expect(paint.category).toBe('CIVIL_PAINT_FINISH');
    expect(paint.requiresImmediateDispatch).toBe(false);
  });

  // Upgrade 238
  test('Upgrade 238: VirtualOpenHouseLivestreamHost creates digital attendee VIP passes', () => {
    const host = new VirtualOpenHouseLivestreamHost();
    const pass = host.createAttendeePass({
      eventId: 'evt_openhouse_1',
      propertyTitle: 'Emirates Hills Mansion',
      streamDateTime: 'Saturday 4:00 PM GST',
      livestreamUrl: 'https://live.agency.ae/stream'
    }, 'Sheikh Mansoor');

    expect(pass.passCode).toContain('VIP-');
    expect(pass.clientName).toBe('Sheikh Mansoor');
    expect(pass.livestreamUrl).toContain('pass=VIP-');
    expect(pass.whatsappConfirmationCopy).toContain('Emirates Hills Mansion');
  });

  // Upgrade 239
  test('Upgrade 239: MasterPlanRenderComparator evaluates delivery fidelity against concept renders', () => {
    const comparator = new MasterPlanRenderComparator();

    const highFidelity = comparator.scoreRenderFidelity({
      facadeAccuracyPercent: 95,
      amenityMatchPercent: 90,
      landscapingDensityPercent: 88
    });
    expect(highFidelity.compositeFidelityScore).toBeGreaterThan(90);
    expect(highFidelity.grade).toBe('EXCELLENT');

    const lowFidelity = comparator.scoreRenderFidelity({
      facadeAccuracyPercent: 60,
      amenityMatchPercent: 65,
      landscapingDensityPercent: 50
    });
    expect(lowFidelity.grade).toBe('DIVERGENT');
  });

  // Upgrade 240
  test('Upgrade 240: FacialPrivacyMasker plans pixelation blur bounding boxes', () => {
    const masker = new FacialPrivacyMasker();
    const plan = masker.planFaceMasking([
      { x: 100, y: 150, width: 80, height: 80 }
    ]);

    expect(plan.requiresMasking).toBe(true);
    expect(plan.blurFilterCount).toBe(1);
    expect(plan.ffmpegBoxFilter).toContain('boxblur=15');

    const empty = masker.planFaceMasking([]);
    expect(empty.requiresMasking).toBe(false);
  });

  // Upgrade 241
  test('Upgrade 241: MetroTransitRadiusScorer calculates walking distance to nearest station', () => {
    const scorer = new MetroTransitRadiusScorer();
    // Test point near Downtown / Burj Khalifa station (lat: 25.1972, lng: 55.2744)
    const result = scorer.evaluateTransitProximity(25.1980, 55.2750);

    expect(result.nearestStation).toContain('Burj Khalifa');
    expect(result.distanceMeters).toBeLessThan(300);
    expect(result.isPedestrianWalkable).toBe(true);
    expect(result.transitScore).toBeGreaterThan(80);
  });

  // Upgrade 242
  test('Upgrade 242: DubaiMasterPlan2040Zoning resolves strategic urban center outlooks', () => {
    const zoning = new DubaiMasterPlan2040Zoning();

    const downtown = zoning.getZoningOutlook('Downtown Dubai');
    expect(downtown.centerName).toContain('Downtown & Business Bay');
    expect(downtown.longTermAppreciationPotential).toBe('VERY_HIGH');

    const expo = zoning.getZoningOutlook('Dubai South Expo');
    expect(expo.centerName).toContain('Expo City');
  });

  // Upgrade 243
  test('Upgrade 243: TrafficCommutePredictor estimates peak rush hour commute minutes', () => {
    const predictor = new TrafficCommutePredictor();

    const peak = predictor.estimateCommute('Dubai Hills', 'DIFC', true);
    expect(peak.estimatedMinutes).toBe(22);
    expect(peak.congestionLevel).toBe('MODERATE_HEAVY');
    expect(peak.arterialRoute).toContain('Al Khail Road');

    const offPeak = predictor.estimateCommute('Dubai Hills', 'DIFC', false);
    expect(offPeak.estimatedMinutes).toBe(14);
  });

  // Upgrade 244
  test('Upgrade 244: SunExposureHeatSimulator analyzes solar orientation and cooling loads', () => {
    const simulator = new SunExposureHeatSimulator();

    const west = simulator.evaluateSunExposure('WEST', 20);
    expect(west.afternoonHeatIndex).toBe('HIGH');
    expect(west.advice).toContain('UV heat-reflective');

    const north = simulator.evaluateSunExposure('NORTH', 10);
    expect(north.afternoonHeatIndex).toBe('LOW');
    expect(north.coolingImpact).toContain('Lowest energy consumption');
  });

  // Upgrade 245
  test('Upgrade 245: AirportFlightNoiseProfiler benchmarks acoustic decibels across sub-markets', () => {
    const profiler = new AirportFlightNoiseProfiler();

    const mirdif = profiler.assessAcousticExposure('Mirdif');
    expect(mirdif.exposureLevel).toBe('MODERATE_HIGH');
    expect(mirdif.doubleGlazingRequired).toBe(true);

    const palm = profiler.assessAcousticExposure('Palm Jumeirah');
    expect(palm.exposureLevel).toBe('WHISPER_QUIET');
    expect(palm.doubleGlazingRequired).toBe(false);
  });
});

