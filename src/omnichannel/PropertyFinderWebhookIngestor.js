/**
 * @file PropertyFinderWebhookIngestor.js
 * @description Ingests real-time lead webhooks from Property Finder, normalizing listing references, client contact parameters, and inquiry timestamps.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class PropertyFinderWebhookIngestor {
  /**
   * Parses incoming Property Finder lead payload.
   * @param {Object} payload
   * @param {string} payload.lead_id
   * @param {string} payload.name
   * @param {string} payload.phone
   * @param {string} payload.email
   * @param {string} payload.reference (Listing reference, e.g. 'PF-12345')
   * @param {string} payload.listing_title
   * @returns {Object}
   */
  ingestPropertyFinderLead(payload) {
    const rawPhone = (payload.phone || '').replace(/[^0-9+]/g, '');
    let cleanPhone = rawPhone;
    if (cleanPhone.startsWith('05')) cleanPhone = '+971' + cleanPhone.slice(1);
    if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

    return {
      portalSource: 'PROPERTY_FINDER',
      portalLeadId: payload.lead_id,
      leadName: payload.name || 'Property Finder Lead',
      phoneNumber: cleanPhone,
      email: payload.email || '',
      listingReference: payload.reference || 'GENERAL_INQUIRY',
      listingTitle: payload.listing_title || 'Dubai Property Listing',
      ingestedAt: new Date().toISOString(),
      speedToLeadTargetSeconds: 15,
      firstTouchWhatsAppPayload: {
        toPhone: cleanPhone,
        text: `Hello ${payload.name || 'there'}! Thank you for inquiring about *${payload.listing_title}* on Property Finder (Ref: ${payload.reference}). I am Linda, your AI property advisor. Are you available for a brief viewing this week?`
      }
    };
  }
}

export default new PropertyFinderWebhookIngestor();
