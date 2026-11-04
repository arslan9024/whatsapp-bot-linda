/**
 * @file BayutDubizzleLeadResponder.js
 * @description Ingests leads from Bayut and Dubizzle portals, applying immediate phone number normalization and preparing an instant WhatsApp conversational dispatch.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class BayutDubizzleLeadResponder {
  /**
   * Processes Bayut/Dubizzle portal inquiry.
   * @param {Object} lead
   * @param {string} lead.id
   * @param {string} lead.portalName ('Bayut', 'Dubizzle')
   * @param {string} lead.userName
   * @param {string} lead.userPhone
   * @param {string} lead.propertyTitle
   * @param {number} lead.priceAed
   * @returns {Object}
   */
  processPortalLead(lead) {
    const portal = (lead.portalName || 'Bayut').toUpperCase();
    const cleanPhone = (lead.userPhone || '').replace(/[^0-9+]/g, '');

    return {
      portalSource: portal,
      leadId: lead.id,
      buyerName: lead.userName,
      normalizedPhone: cleanPhone,
      propertyTitle: lead.propertyTitle,
      priceAed: lead.priceAed,
      whatsAppDispatchQueue: {
        to: cleanPhone,
        message: `Hi ${lead.userName}! Saw your inquiry on ${portal} regarding *${lead.propertyTitle}* (AED ${lead.priceAed ? lead.priceAed.toLocaleString() : 'N/A'}). Linda here from the listing agency. Is this unit for your personal residence or investment?`,
        delayMs: 3500 // 3.5s delay to feel completely organic rather than robotic
      }
    };
  }
}

export default new BayutDubizzleLeadResponder();
