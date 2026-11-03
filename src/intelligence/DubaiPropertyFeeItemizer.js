/**
 * DubaiPropertyFeeItemizer.js
 * 
 * Single responsibility: Calculate exact statutory Dubai Land Department, trustee, and brokerage fees on purchase.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class DubaiPropertyFeeItemizer {
  calculateTotalClosingCosts(propertyPriceAed = 0, isOffPlan = false) {
    if (!propertyPriceAed || propertyPriceAed <= 0) throw new Error('propertyPriceAed is required');

    // 1. DLD Transfer Fee: 4% of property price + 580 AED admin fee
    const dldFeeAed = Math.round(propertyPriceAed * 0.04) + 580;

    // 2. Registration Trustee Fee (Secondary market): 4,000 AED (+ 5% VAT = 4,200 AED for properties >= 500k)
    const trusteeFeeAed = isOffPlan ? 0 : 4200;

    // 3. Broker Agency Fee (Standard 2% + 5% VAT)
    const agencyFeeAed = isOffPlan ? 0 : Math.round(propertyPriceAed * 0.02 * 1.05);

    // 4. Oqood Fee (if Off-Plan): 4% DLD + 1,000 AED administration
    const oqoodAdminFee = isOffPlan ? 1050 : 0;

    const totalClosingCostsAed = dldFeeAed + trusteeFeeAed + agencyFeeAed + oqoodAdminFee;
    const totalOutlayAed = propertyPriceAed + totalClosingCostsAed;

    return {
      propertyPriceAed,
      isOffPlan,
      fees: {
        dldTransferFeeAed: dldFeeAed,
        registrationTrusteeAed: trusteeFeeAed,
        brokerAgencyFeeAed: agencyFeeAed,
        oqoodAdminFeeAed: oqoodAdminFee,
      },
      totalClosingCostsAed,
      closingCostsPercent: Number(((totalClosingCostsAed / propertyPriceAed) * 100).toFixed(2)),
      totalOutlayRequiredAed: totalOutlayAed,
    };
  }
}

export default new DubaiPropertyFeeItemizer();

