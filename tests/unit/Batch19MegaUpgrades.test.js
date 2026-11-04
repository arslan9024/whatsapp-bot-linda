import { describe, it, expect } from '@jest/globals';

import flippingScanner from '../../src/economics/OffPlanFlippingArbitrageScanner.js';
import yieldGapOptimizer from '../../src/economics/YieldGapArbitrageOptimizer.js';
import npvModeler from '../../src/economics/PaymentPlanNpvModeler.js';
import auctionScraper from '../../src/economics/DldAuctionPriceScraper.js';
import airbnbPredictor from '../../src/economics/ShortTermAirbnbRevenuePredictor.js';
import serviceChargeForecaster from '../../src/economics/ServiceChargeEscalationForecaster.js';
import velocityScorer from '../../src/economics/CapitalAppreciationVelocityScorer.js';
import supplyWaveAnalyzer from '../../src/economics/SupplyWaveImpactAnalyzer.js';
import reraRentalCalculator from '../../src/economics/ReraRentalIndexCalculator.js';
import bulkPortfolioModeler from '../../src/economics/BulkMultiUnitPortfolioModeler.js';
import returnTracker from '../../src/economics/InflationAdjustedReturnTracker.js';
import defaultRiskProfiler from '../../src/economics/RentalDefaultEvictionRiskProfiler.js';
import exitLiquidityScorer from '../../src/economics/ExitLiquidityDaysOnMarketScorer.js';
import cancellationScorer from '../../src/economics/OffPlanCancellationRiskScorer.js';
import feeWaiverMonitor from '../../src/economics/DldFeeWaiverMonitor.js';

describe('Mega Batch 19 Upgrades (261-275) - Predictive Market Economics & Investor Algorithmic Alpha', () => {
  // Upgrade 261
  it('Upgrade 261: OffPlanFlippingArbitrageScanner evaluates flipping spread eligibility and ROI on equity', () => {
    const res = flippingScanner.evaluateFlippingArbitrage({
      originalPriceAed: 1500000,
      percentPaid: 35,
      currentMarketPriceAed: 1900000,
      holdingPeriodMonths: 10
    });
    expect(res.isEligibleForResale).toBe(true);
    expect(res.isHighArbitrageCandidate).toBe(true);
    expect(res.annualizedRoiPct).toBeGreaterThan(15);
  });

  // Upgrade 262
  it('Upgrade 262: YieldGapArbitrageOptimizer analyzes spread between high yield vs capital appreciation assets', () => {
    const res = yieldGapOptimizer.compareYieldGap(
      { name: 'JVC 1BR', purchasePriceAed: 850000, annualRentAed: 72000, annualServiceChargeAed: 11000, expectedAnnualAppreciationPct: 4 },
      { name: 'Downtown 1BR', purchasePriceAed: 2200000, annualRentAed: 125000, annualServiceChargeAed: 28000, expectedAnnualAppreciationPct: 7 }
    );
    expect(res.netYieldSpreadPct).toBeGreaterThan(0);
    expect(res.dominantCashFlowAsset).toBe('JVC 1BR');
  });

  // Upgrade 263
  it('Upgrade 263: PaymentPlanNpvModeler calculates NPV of post-handover installment plans', () => {
    const res = npvModeler.evaluatePlanNpv({
      listPriceAed: 2000000,
      cashFlows: [
        { month: 0, amountAed: 400000 },
        { month: 12, amountAed: 400000 },
        { month: 24, amountAed: 400000 },
        { month: 36, amountAed: 400000 },
        { month: 48, amountAed: 400000 }
      ],
      discountRatePct: 6.5,
      cashDiscountOfferAed: 100000
    });
    expect(res.npvAed).toBeLessThan(res.listPriceAed);
    expect(res.effectiveDiscountPct).toBeGreaterThan(0);
  });

  // Upgrade 264
  it('Upgrade 264: DldAuctionPriceScraper benchmarks court liquidation discounts against fair market value', () => {
    const res = auctionScraper.benchmarkAuctionResult({
      hammerPriceAed: 1200000,
      estimatedFairMarketValueAed: 1800000,
      caseId: 'AUC-2026-99',
      community: 'Business Bay'
    });
    expect(res.isDistressedArbitrageWin).toBe(true);
    expect(res.rating).toBe('EXCEPTIONAL_DEEP_DISCOUNT');
  });

  // Upgrade 265
  it('Upgrade 265: ShortTermAirbnbRevenuePredictor forecasts high and low season holiday home revenue', () => {
    const res = airbnbPredictor.predictAnnualHolidayRevenue({
      highSeasonDailyRateAed: 1200,
      lowSeasonDailyRateAed: 450,
      highSeasonOccupancyPct: 85,
      lowSeasonOccupancyPct: 55
    });
    expect(res.totalGrossRevenueAed).toBeGreaterThan(200000);
    expect(res.holidayRentalFeasibility).toBe('HIGHLY_VIABLE');
  });

  // Upgrade 266
  it('Upgrade 266: ServiceChargeEscalationForecaster projects 5-year Mollak maintenance inflation curves', () => {
    const res = serviceChargeForecaster.forecastEscalation({
      currentSqFtRateAed: 18.5,
      unitSqFt: 1200,
      annualInflationPct: 4.0
    });
    expect(res.fiveYearProjection.length).toBe(5);
    expect(res.fiveYearCumulativeCostAed).toBeGreaterThan(100000);
  });

  // Upgrade 267
  it('Upgrade 267: CapitalAppreciationVelocityScorer calculates YoY and 3M price surge momentum', () => {
    const res = velocityScorer.scoreVelocity({
      community: 'Dubai Islands',
      currentAvgSqFtAed: 2400,
      priorYearAvgSqFtAed: 1800,
      threeMonthRollingChangePct: 4.5
    });
    expect(res.velocityScore).toBeGreaterThanOrEqual(80);
    expect(res.velocityStage).toBe('HYPER_GROWTH');
  });

  // Upgrade 268
  it('Upgrade 268: SupplyWaveImpactAnalyzer assesses rent drag when large handover volumes occur', () => {
    const res = supplyWaveAnalyzer.assessSupplyWave({
      submarket: 'Dubai South',
      existingStockUnits: 10000,
      upcomingHandoverUnits: 7500,
      currentAverageRentAed: 65000,
      annualAbsorptionCapacityUnits: 3000
    });
    expect(res.projectedRentDragPct).toBeGreaterThan(10);
    expect(res.absorptionRiskTier).toBe('HIGH_SUPPLY_OVERHANG');
  });

  // Upgrade 269
  it('Upgrade 269: ReraRentalIndexCalculator applies Dubai Decree 43 of 2013 allowable rent increase tiers', () => {
    const res = reraRentalCalculator.calculateAllowableIncrease({
      currentContractRentAed: 70000,
      reraBenchmarkAverageRentAed: 110000
    });
    expect(res.allowableIncreasePct).toBe(15);
    expect(res.isIncreasePermitted).toBe(true);
    expect(res.maxNewRentAed).toBe(80500);
  });

  // Upgrade 270
  it('Upgrade 270: BulkMultiUnitPortfolioModeler models volume discount and yield expansion for full floors', () => {
    const res = bulkPortfolioModeler.modelBulkPortfolio({
      units: [
        { unitType: '1BR', count: 8, retailPriceAed: 1100000, projectedRentAed: 85000, serviceChargeAed: 12000 },
        { unitType: '2BR', count: 4, retailPriceAed: 1800000, projectedRentAed: 135000, serviceChargeAed: 19000 }
      ],
      developerBulkDiscountPct: 8
    });
    expect(res.totalUnits).toBe(12);
    expect(res.totalSavingsAed).toBeGreaterThan(1000000);
    expect(res.yieldExpansionBasisPoints).toBeGreaterThan(0);
  });

  // Upgrade 271
  it('Upgrade 271: InflationAdjustedReturnTracker compares property returns against US Treasuries and inflation', () => {
    const res = returnTracker.compareRealReturns({
      netRentalYieldPct: 7.2,
      expectedCapitalGrowthPct: 5.0
    });
    expect(res.spreadOverUsTreasuriesPct).toBeGreaterThan(2.0);
    expect(res.isRealYieldPositive).toBe(true);
  });

  // Upgrade 272
  it('Upgrade 272: RentalDefaultEvictionRiskProfiler evaluates tenant credit resilience and cheque count exposure', () => {
    const lowRisk = defaultRiskProfiler.profileDefaultRisk({
      community: 'Dubai Hills Estate',
      annualRentAed: 180000,
      chequeCount: 1,
      employmentSector: 'multinational-corporate'
    });
    expect(lowRisk.riskRating).toBe('MINIMAL_RISK');

    const highRisk = defaultRiskProfiler.profileDefaultRisk({
      community: 'Deira',
      annualRentAed: 45000,
      chequeCount: 6,
      employmentSector: 'freelance'
    });
    expect(highRisk.defaultProbabilityScore).toBeGreaterThan(50);
  });

  // Upgrade 273
  it('Upgrade 273: ExitLiquidityDaysOnMarketScorer estimates Days on Market and liquidation speed', () => {
    const fast = exitLiquidityScorer.scoreExitLiquidity({
      community: 'jvc',
      propertyType: '1br',
      priceCompetitivenessPct: 95
    });
    expect(fast.liquidityTier).toBe('ULTRA_LIQUID');
    expect(fast.estimatedDaysOnMarket).toBeLessThan(25);
  });

  // Upgrade 274
  it('Upgrade 274: OffPlanCancellationRiskScorer audits RERA project escrow and construction milestone lag', () => {
    const safe = cancellationScorer.assessProjectRisk({
      constructionProgressPct: 65,
      elapsedTimePct: 70,
      escrowBalanceAed: 45000000,
      totalEstimatedConstructionCostAed: 90000000,
      developerPriorProjectsDelivered: 12
    });
    expect(safe.cancellationRiskScore).toBeLessThan(30);

    const risky = cancellationScorer.assessProjectRisk({
      constructionProgressPct: 15,
      elapsedTimePct: 65,
      escrowBalanceAed: 5000000,
      totalEstimatedConstructionCostAed: 80000000,
      developerPriorProjectsDelivered: 1
    });
    expect(risky.riskRating).toBe('HIGH_CANCELLATION_HAZARD');
  });

  // Upgrade 275
  it('Upgrade 275: DldFeeWaiverMonitor tracks promotional 4% DLD fee absorption', () => {
    const res = feeWaiverMonitor.evaluateWaiverSavings({
      developer: 'EMAAR',
      purchasePriceAed: 2500000
    });
    expect(res.waivedDldPct).toBe(4);
    expect(res.waivedAmountAed).toBe(100000);
    expect(res.buyerPayableDldFeeAed).toBe(0);
  });
});
