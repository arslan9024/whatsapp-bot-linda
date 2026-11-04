import { describe, it, expect } from '@jest/globals';

import khdaMatcher from '../../src/spatial/KhdaSchoolCatchmentMatcher.js';
import mosqueCalculator from '../../src/spatial/MosqueProximityCalculator.js';
import beachVerifier from '../../src/spatial/BeachLagoonAccessVerifier.js';
import marinaChecker from '../../src/spatial/MarinaBerthAvailabilityChecker.js';
import evIndexer from '../../src/spatial/EvChargingDensityIndex.js';
import floodMapper from '../../src/spatial/FloodDrainageElevationMapper.js';
import petScorer from '../../src/spatial/PetFriendlyParkScorer.js';
import hospitalScorer from '../../src/spatial/HospitalProximityScorer.js';
import diningIndex from '../../src/spatial/DiningWalkabilityIndex.js';
import highTensionGuard from '../../src/spatial/HighTensionPowerBufferGuard.js';
import golfClassifier from '../../src/spatial/GolfCourseViewClassifier.js';
import gateEstimator from '../../src/spatial/GatedSecurityIngressEstimator.js';
import freezoneMapper from '../../src/spatial/FreezoneBoundaryMapper.js';
import sectorNormalizer from '../../src/spatial/DldSectorCodeNormalizer.js';
import microclimateIndex from '../../src/spatial/MicroclimateHumidityIndex.js';

describe('Mega Batch 18 Upgrades (246-260) - Spatial Intelligence & Environmental Precision', () => {
  // Upgrade 246
  it('Upgrade 246: KhdaSchoolCatchmentMatcher matches top KHDA rated schools by coordinates', () => {
    const results = khdaMatcher.findNearbySchools(25.105, 55.245, 10.0);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('name');
    expect(results[0]).toHaveProperty('rating');
    expect(results[0].rating).toBe('Outstanding');
  });

  // Upgrade 247
  it('Upgrade 247: MosqueProximityCalculator calculates walk time and prayer call acoustics', () => {
    const close = mosqueCalculator.assessProximity(250);
    expect(close.proximityTier).toBe('IMMEDIATE_WALKABLE');
    expect(close.acousticAdhanNotice).toContain('Clear Adhan');

    const far = mosqueCalculator.assessProximity(1200);
    expect(far.proximityTier).toBe('DRIVING_DISTANCE');
  });

  // Upgrade 248
  it('Upgrade 248: BeachLagoonAccessVerifier verifies private, crystal lagoon or open beachfront', () => {
    const palm = beachVerifier.verifyWaterAccess('PALM_JUMEIRAH_FROND');
    expect(palm.accessType).toBe('PRIVATE_DEEDED_BEACH');
    expect(palm.hasWaterAccess).toBe(true);

    const lagoon = beachVerifier.verifyWaterAccess('DISTRICT_ONE_LAGOON');
    expect(lagoon.accessType).toBe('CRYSTAL_LAGOON_PRIVATE');
  });

  // Upgrade 249
  it('Upgrade 249: MarinaBerthAvailabilityChecker evaluates vessel berth dimensions and waiting times', () => {
    const res = marinaChecker.evaluateBerth('DUBAI_MARINA_YACHT_CLUB', 45);
    expect(res.marina).toBe('DUBAI_MARINA_YACHT_CLUB');
    expect(res.canAccommodate).toBe(true);
    expect(res.estimatedAnnualBerthCostAed).toBeGreaterThan(0);
  });

  // Upgrade 250
  it('Upgrade 250: EvChargingDensityIndex scores residential community EV readiness', () => {
    const res = evIndexer.evaluateEvInfrastructure('Downtown Dubai');
    expect(res.tier).toBe('HIGH_DENSITY_READY');
    expect(res.evReadinessScore).toBe(100);
    expect(res.totalPorts).toBeGreaterThan(20);
  });

  // Upgrade 251
  it('Upgrade 251: FloodDrainageElevationMapper verifies storm elevation and drainage pumps', () => {
    const res = floodMapper.evaluateResilience('Jumeirah Golf Estates');
    expect(res.elevationAboveSeaLevelMeters).toBe(25);
    expect(res.drainageSystem).toBe('STANDARD_MUNICIPAL');
  });

  // Upgrade 252
  it('Upgrade 252: PetFriendlyParkScorer audits off-leash zones and green community pet friendliness', () => {
    const res = petScorer.evaluatePetFriendliness('The Greens');
    expect(res.isPetFriendly).toBe(true);
    expect(res.score).toBeGreaterThanOrEqual(90);
  });

  // Upgrade 253
  it('Upgrade 253: HospitalProximityScorer profiles trauma center and tertiary hospital ETA', () => {
    const res = hospitalScorer.evaluateMedicalProximity('Dubai Hills Estate', 4);
    expect(res.healthcareSecurityTier).toBe('OPTIMAL_PEACE_OF_MIND');
    expect(res.nearestPremierHospital).toBe("King's College Hospital London");
  });

  // Upgrade 254
  it('Upgrade 254: DiningWalkabilityIndex evaluates Michelin/licensed restaurants within 5-10m walk', () => {
    const res = diningIndex.scoreWalkability({ licensedVenues: 12, cafes: 25, grocerySupermarkets: 4 });
    expect(res.walkScore).toBe(100);
    expect(res.classification).toBe('WALKERS_PARADISE');
  });

  // Upgrade 255
  it('Upgrade 255: HighTensionPowerBufferGuard checks electromagnetic line safety clearance', () => {
    const safe = highTensionGuard.evaluateBufferSetback(250);
    expect(safe.safeSetback).toBe(true);

    const dangerous = highTensionGuard.evaluateBufferSetback(40);
    expect(dangerous.safeSetback).toBe(false);
  });

  // Upgrade 256
  it('Upgrade 256: GolfCourseViewClassifier classifies fairway, green, and lake horizons', () => {
    const res = golfClassifier.classifyGolfView('Direct panoramic unobstructed view over the 18th hole fairway and signature green');
    expect(res.pricePremiumPercent).toBe(25);
    expect(res.rarity).toBe('ULTRA_RARE');
  });

  // Upgrade 257
  it('Upgrade 257: GatedSecurityIngressEstimator estimates RFID vs visitor gate congestion', () => {
    const resident = gateEstimator.estimateGateIngress('Emirates Hills', true);
    expect(resident.residentFastPassEnabled).toBe(true);
    expect(resident.securityTier).toBe('24/7_PATROLLED_GUARDED_PERIMETER');

    const visitor = gateEstimator.estimateGateIngress('Emirates Hills', false);
    expect(visitor.estimatedWaitTime).toContain('Visitor ID Verification');
  });

  // Upgrade 258
  it('Upgrade 258: FreezoneBoundaryMapper distinguishes DED mainland from DIFC/ADGM legal zones', () => {
    const difc = freezoneMapper.resolveCorporateOwnershipRules('DIFC');
    expect(difc.legalJurisdiction).toBe('Common Law (DIFC Courts)');
    expect(difc.allowsDirectOffshoreOwnership).toBe(true);

    const mainland = freezoneMapper.resolveCorporateOwnershipRules('DED_MAINLAND');
    expect(mainland.legalJurisdiction).toBe('UAE Civil Law');
  });

  // Upgrade 259
  it('Upgrade 259: DldSectorCodeNormalizer standardizes marketing names into official DLD cadastral sector codes', () => {
    const res = sectorNormalizer.normalizeArea('Downtown Dubai');
    expect(res.dldAreaId).toBe(392);
    expect(res.sectorNameAr).toBe('برج خليفة');
    expect(res.verifiedDldArea).toBe(true);
  });

  // Upgrade 260
  it('Upgrade 260: MicroclimateHumidityIndex assesses coastal vs desert humidity and comfort index', () => {
    const marina = microclimateIndex.assessMicroclimate('dubai-marina', 'summer');
    expect(marina.zoneType).toBe('coastal');
    expect(marina.avgHumidityPct).toBe(78);
    expect(marina.airConditioningBurden).toBe('HIGH');

    const ranches = microclimateIndex.assessMicroclimate('arabian-ranches', 'winter');
    expect(ranches.outdoorComfortScore).toBeGreaterThan(60);
  });
});
