/**
 * @file PortalLeadWebhookIngestion.js
 * @description Ingestion adapter for property portals (Property Finder, Bayut, Dubizzle).
 * Normalizes disparate webhook payloads into unified lead objects for WhatsApp triage.
 * Category: Integrations
 */

export class PortalLeadWebhookIngestion {
  /**
   * Identifies portal origin from request headers or body structure
   * @param {Object} payload
   * @param {Object} headers
   * @returns {string} 'property_finder' | 'bayut' | 'dubizzle' | 'generic'
   */
  detectPortal(payload = {}, headers = {}) {
    const userAgent = (headers['user-agent'] || '').toLowerCase();
    if (headers['x-pf-signature'] || payload.property_finder_ref || userAgent.includes('propertyfinder')) {
      return 'property_finder';
    }
    if (headers['x-bayut-token'] || payload.bayut_reference || userAgent.includes('bayut')) {
      return 'bayut';
    }
    if (payload.dubizzle_id || userAgent.includes('dubizzle')) {
      return 'dubizzle';
    }
    return 'generic';
  }

  /**
   * Normalizes an incoming portal payload into standard lead format
   * @param {Object} payload
   * @param {Object} headers
   * @returns {Object} Normalized Lead
   */
  normalizePortalLead(payload = {}, headers = {}) {
    const portal = this.detectPortal(payload, headers);

    let clientName = 'Interested Buyer';
    let clientPhone = '';
    let clientEmail = '';
    let listingRef = '';
    let inquiryMessage = '';
    let budgetAed = null;

    if (portal === 'property_finder') {
      clientName = payload.lead_name || payload.contact_name || clientName;
      clientPhone = payload.lead_phone || payload.phone_number || '';
      clientEmail = payload.lead_email || payload.email || '';
      listingRef = payload.reference || payload.listing_id || '';
      inquiryMessage = payload.message || payload.comments || '';
      budgetAed = payload.price || null;
    } else if (portal === 'bayut') {
      clientName = payload.inquirer_name || payload.name || clientName;
      clientPhone = payload.phone || payload.mobile || '';
      clientEmail = payload.email_address || payload.email || '';
      listingRef = payload.property_id || payload.bayut_reference || '';
      inquiryMessage = payload.enquiry_notes || payload.inquiry_text || '';
      budgetAed = payload.listing_price || null;
    } else {
      // Generic / Dubizzle
      clientName = payload.name || payload.sender || clientName;
      clientPhone = payload.phone || payload.mobile_number || '';
      clientEmail = payload.email || '';
      listingRef = payload.property_ref || payload.listing_ref || '';
      inquiryMessage = payload.message || payload.body || '';
      budgetAed = payload.budget || payload.price || null;
    }

    return {
      portalSource: portal,
      timestamp: new Date().toISOString(),
      lead: {
        name: clientName.trim(),
        phone: clientPhone.replace(/\s+/g, ''),
        email: clientEmail.trim().toLowerCase(),
        propertyRef: listingRef.trim(),
        message: inquiryMessage.trim(),
        budgetAed: budgetAed ? Number(budgetAed) : null
      },
      readyForOutreach: Boolean(clientPhone && clientPhone.length >= 7)
    };
  }
}

export default new PortalLeadWebhookIngestion();

