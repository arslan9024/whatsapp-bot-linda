/**
 * @file DynamicMediaPersonalizer.js
 * @description Generates customized media caption overlays and personalized welcome
 * cover parameters for property investment presentations.
 * Category: Outreach
 */

export class DynamicMediaPersonalizer {
  /**
   * Generates bespoke image caption with client branding
   * @param {Object} params
   * @param {string} params.clientName
   * @param {string} params.propertyRef
   * @param {number} [params.budgetAed]
   * @returns {string} Personalized WhatsApp caption
   */
  generatePersonalizedCaption(params) {
    const { clientName = 'Valued Investor', propertyRef, budgetAed } = params;
    const formattedBudget = budgetAed ? `AED ${Number(budgetAed).toLocaleString()}` : 'Exclusive Pricing';

    return [
      `🌟 *Prepared Specially for ${clientName}*`,
      `🏛️ Property Portfolio: *${propertyRef || 'Dubai Luxury Collection'}*`,
      `💰 Budget Guide: *${formattedBudget}*`,
      `✨ Curated by Linda Real Estate Operations`
    ].join('\n');
  }
}

export default new DynamicMediaPersonalizer();

