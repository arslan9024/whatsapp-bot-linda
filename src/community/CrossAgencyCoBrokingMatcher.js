/**
 * @file CrossAgencyCoBrokingMatcher.js
 * @description Automatically matches internal buyer mandates with vetted external broker inventory under standard RERA 50/50 Form I co-broking commission rules.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class CrossAgencyCoBrokingMatcher {
  /**
   * Evaluates co-broking fit between an internal buyer brief and external broker listing.
   * @param {Object} buyerBrief
   * @param {string} buyerBrief.bedrooms
   * @param {string} buyerBrief.community
   * @param {number} buyerBrief.maxBudgetAed
   * @param {Object} externalListing
   * @param {string} externalListing.bedrooms
   * @param {string} externalListing.community
   * @param {number} externalListing.priceAed
   * @param {string} externalListing.brokerAgencyName
   * @param {boolean} [externalListing.hasFormA=true] (RERA exclusive seller mandate)
   * @returns {Object}
   */
  evaluateCoBrokingMatch(buyerBrief, externalListing) {
    const isCommunityMatch = buyerBrief.community.toLowerCase() === externalListing.community.toLowerCase();
    const isBedroomMatch = buyerBrief.bedrooms.toLowerCase() === externalListing.bedrooms.toLowerCase();
    const isWithinBudget = externalListing.priceAed <= buyerBrief.maxBudgetAed;
    const isVettedMandate = Boolean(externalListing.hasFormA);

    const isMatch = isCommunityMatch && isBedroomMatch && isWithinBudget && isVettedMandate;
    const estimatedTotalCommissionAed = externalListing.priceAed * 0.02; // Standard 2% RERA fee
    const internalSplitAed = estimatedTotalCommissionAed * 0.5; // 50% split

    return {
      isMatch,
      partnerAgency: externalListing.brokerAgencyName,
      coBrokingProtocol: 'RERA Form I (Agent-to-Agent Agreement) Mandatory',
      splitPercentage: '50/50',
      totalCommissionAed: Math.round(estimatedTotalCommissionAed),
      projectedAgencyEarningsAed: Math.round(internalSplitAed),
      matchScorePct: isMatch ? 100 : (isCommunityMatch && isBedroomMatch ? 75 : 30),
      dispatchAction: isMatch
        ? `Execute Form I: Present external listing from ${externalListing.brokerAgencyName} to registered buyer. 50/50 fee locked.`
        : 'Ineligible: Missing Form A exclusivity or exceeds client budget ceiling.'
    };
  }
}

export default new CrossAgencyCoBrokingMatcher();
