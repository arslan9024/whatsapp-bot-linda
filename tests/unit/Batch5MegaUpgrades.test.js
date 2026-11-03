import { DldTransactionIndexParser } from '../../src/intelligence/DldTransactionIndexParser.js';
import { OffPlanHandoverTracker } from '../../src/intelligence/OffPlanHandoverTracker.js';
import { RentalRoiCalculator } from '../../src/intelligence/RentalRoiCalculator.js';
import { DubaiGoldenVisaQualifier } from '../../src/intelligence/DubaiGoldenVisaQualifier.js';
import { ServiceChargeIndexCalculator } from '../../src/intelligence/ServiceChargeIndexCalculator.js';
import { DeveloperReputationMatrix } from '../../src/intelligence/DeveloperReputationMatrix.js';
import { HolidayHomeVsEjariComparator } from '../../src/intelligence/HolidayHomeVsEjariComparator.js';
import { ExpatMortgageEstimator } from '../../src/intelligence/ExpatMortgageEstimator.js';
import { MetroSchoolProximityScorer } from '../../src/intelligence/MetroSchoolProximityScorer.js';
import { DistressDealDetector } from '../../src/intelligence/DistressDealDetector.js';
import { LandlordEjariRenewalAlert } from '../../src/intelligence/LandlordEjariRenewalAlert.js';
import { DldTitleDeedValidator } from '../../src/intelligence/DldTitleDeedValidator.js';
import { OffPlanPaymentPlanParser } from '../../src/intelligence/OffPlanPaymentPlanParser.js';
import { DubaiPropertyFeeItemizer } from '../../src/intelligence/DubaiPropertyFeeItemizer.js';
import { CommunityAmenitiesIndex } from '../../src/intelligence/CommunityAmenitiesIndex.js';

describe('Mega Batch 5 Upgrades 51–65 (UAE & Dubai Real Estate Domain Intelligence)', () => {
  it('Upgrade 51: DldTransactionIndexParser evaluates price/sqft valuation ratings', () => {
    const parser = new DldTransactionIndexParser();
    const evalResult = parser.evaluateValuation('DAMAC_HILLS_2', 1200000, 2000);
    expect(evalResult.pricePerSqft).toBe(600);
    expect(evalResult.rating).toBe('BELOW_MARKET_DISTRESS');
  });

  it('Upgrade 52: OffPlanHandoverTracker tracks project completion progress', () => {
    const tracker = new OffPlanHandoverTracker();
    tracker.registerProject('Verona', { developer: 'DAMAC', completionQuarter: 'Q4 2026', constructionPercent: 45 });
    const proj = tracker.getProject('Verona');
    expect(proj.developer).toBe('DAMAC');
    expect(proj.isUnderConstruction).toBe(true);
  });

  it('Upgrade 53: RentalRoiCalculator computes gross and net yields with service fees', () => {
    const calc = new RentalRoiCalculator();
    const res = calc.calculateYield({
      purchasePriceAed: 1000000,
      annualRentAed: 85000,
      serviceChargeAnnualAed: 5000,
      managementFeePercent: 5,
    });
    expect(res.grossYieldPercent).toBe(8.5);
    expect(res.netYieldPercent).toBeLessThan(8.5);
    expect(res.annualNetIncomeAed).toBeGreaterThan(70000);
  });

  it('Upgrade 54: DubaiGoldenVisaQualifier validates 2,000,000 AED threshold', () => {
    const qualifier = new DubaiGoldenVisaQualifier();
    const yes = qualifier.evaluateEligibility(2500000);
    expect(yes.qualifies).toBe(true);
    expect(yes.visaType).toContain('GOLDEN_VISA');

    const no = qualifier.evaluateEligibility(1500000);
    expect(no.qualifies).toBe(false);
    expect(no.remainingRequiredAed).toBe(500000);
  });

  it('Upgrade 55: ServiceChargeIndexCalculator computes annual and monthly charges', () => {
    const calc = new ServiceChargeIndexCalculator();
    const charge = calc.calculateAnnualCharge('DAMAC_HILLS_2', 2000);
    expect(charge.annualChargeAed).toBe(7000);
    expect(charge.monthlyChargeAed).toBe(Math.round(7000 / 12));
  });

  it('Upgrade 56: DeveloperReputationMatrix retrieves master developer factsheets', () => {
    const matrix = new DeveloperReputationMatrix();
    const emaar = matrix.getDeveloperFactsheet('Emaar Properties');
    expect(emaar.developer).toBe('EMAAR');
    expect(emaar.tier).toBe('TIER_1');
  });

  it('Upgrade 57: HolidayHomeVsEjariComparator models Airbnb vs Ejari yields', () => {
    const comp = new HolidayHomeVsEjariComparator();
    const res = comp.compare({
      purchasePriceAed: 1500000,
      estimatedDailyRateAed: 650,
      occupancyRatePercent: 80,
      annualEjariRentAed: 105000,
    });
    expect(res.shortTerm.netYieldPercent).toBeGreaterThan(0);
    expect(res.recommendation).toBeDefined();
  });

  it('Upgrade 58: ExpatMortgageEstimator applies UAE 20% expat downpayment and DBR caps', () => {
    const est = new ExpatMortgageEstimator();
    const res = est.calculateMortgage({ propertyPriceAed: 2000000 });
    expect(res.minDownpaymentAed).toBe(400000);
    expect(res.loanAmountAed).toBe(1600000);
    expect(res.monthlyInstallmentAed).toBeGreaterThan(5000);
  });

  it('Upgrade 59: MetroSchoolProximityScorer evaluates walking distance to transit', () => {
    const scorer = new MetroSchoolProximityScorer();
    const score = scorer.getProximityScore('Downtown Dubai');
    expect(score.hasDirectMetro).toBe(true);
    expect(score.transitConvenienceScore).toBeGreaterThan(70);
  });

  it('Upgrade 60: DistressDealDetector flags listings 15%+ under benchmark', () => {
    const detector = new DistressDealDetector({ distressThresholdPercent: 15 });
    const check = detector.evaluateListing({
      community: 'Damac Hills 2',
      askingPriceAed: 1000000,
      buaSqft: 2000,
      benchmarkAvgPricePerSqft: 750, // Asking is 500/sqft vs 750 (33% discount)
    });
    expect(check.isDistressDeal).toBe(true);
    expect(check.discountPercent).toBeGreaterThan(15);
  });

  it('Upgrade 61: LandlordEjariRenewalAlert triggers notice inside 90-day window', () => {
    const alert = new LandlordEjariRenewalAlert();
    const sixtyDaysLater = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const notice = alert.evaluateContract(sixtyDaysLater);
    expect(notice.needsNotice).toBe(true);
    expect(notice.daysRemaining).toBeLessThanOrEqual(90);
  });

  it('Upgrade 62: DldTitleDeedValidator verifies DLD electronic deed numbers', () => {
    const val = new DldTitleDeedValidator();
    expect(val.validateTitleDeedNumber('2024/104928')).toBe(true);
    expect(val.validateTitleDeedNumber('10492849')).toBe(true);
    expect(val.validateTitleDeedNumber('invalid_string')).toBe(false);
  });

  it('Upgrade 63: OffPlanPaymentPlanParser parses 60/40 and 1% monthly structures', () => {
    const parser = new OffPlanPaymentPlanParser();
    const plan = parser.parsePlan('60/40 payment plan with 1% monthly post handover');
    expect(plan.constructionRatio).toBe(60);
    expect(plan.handoverRatio).toBe(40);
    expect(plan.hasPostHandover).toBe(true);
  });

  it('Upgrade 64: DubaiPropertyFeeItemizer calculates DLD 4%, trustee and agency costs', () => {
    const itemizer = new DubaiPropertyFeeItemizer();
    const costs = itemizer.calculateTotalClosingCosts(1000000, false);
    expect(costs.fees.dldTransferFeeAed).toBe(40580);
    expect(costs.fees.registrationTrusteeAed).toBe(4200);
    expect(costs.totalClosingCostsAed).toBeGreaterThan(60000);
  });

  it('Upgrade 65: CommunityAmenitiesIndex matches luxury lagoons and golf courses', () => {
    const index = new CommunityAmenitiesIndex();
    expect(index.findCommunitiesForAmenity('LAGOON')).toContain('DAMAC_LAGOONS');
    expect(index.getAmenitiesForCommunity('DAMAC_HILLS')).toContain('GOLF_COURSE');
  });
});
