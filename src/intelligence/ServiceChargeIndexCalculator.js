/**
 * ServiceChargeIndexCalculator.js
 * 
 * Single responsibility: Calculate annual maintenance and service charges based on community rates per sqft.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const SERVICE_CHARGE_RATES = Object.freeze({
  'DAMAC_HILLS_2': 3.5, // AED per sqft (master community + villa)
  'JUMEIRAH_VILLAGE_CIRCLE': 14.0, // AED per sqft (apartments)
  'DUBAI_MARINA': 18.5,
  'DOWNTOWN_DUBAI': 24.0,
  'BUSINESS_BAY': 17.0,
  'PALM_JUMEIRAH': 22.0,
  'DUBAI_HILLS_ESTATE': 4.5, // Villa communities
});

export class ServiceChargeIndexCalculator {
  getRatePerSqft(communityName = '') {
    const key = communityName.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').trim();
    return SERVICE_CHARGE_RATES[key] || 12.0; // Standard Dubai apartment average
  }

  calculateAnnualCharge(communityName, buaSqft = 0) {
    if (!buaSqft || buaSqft <= 0) return { annualChargeAed: 0, ratePerSqft: 0 };
    const rate = this.getRatePerSqft(communityName);
    const annualCharge = Math.round(buaSqft * rate);

    return {
      community: communityName,
      buaSqft,
      ratePerSqft: rate,
      annualChargeAed: annualCharge,
      monthlyChargeAed: Math.round(annualCharge / 12),
    };
  }
}

export default new ServiceChargeIndexCalculator();
