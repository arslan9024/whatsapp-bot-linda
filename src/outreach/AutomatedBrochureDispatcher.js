/**
 * @file AutomatedBrochureDispatcher.js
 * @description Automatically matches property inquiries with verified developer PDF brochures
 * and packages client-facing WhatsApp download links and file references.
 * Category: Outreach
 */

export class AutomatedBrochureDispatcher {
  constructor() {
    this.brochureCatalog = new Map([
      ['DOWNTOWN-BURJ', { title: 'Burj Crown Luxury Suites', url: 'https://brochures.agency.ae/downtown-burj.pdf', sizeMb: 4.2 }],
      ['PALM-VILLA', { title: 'Palm Jumeirah Signature Villas', url: 'https://brochures.agency.ae/palm-villas.pdf', sizeMb: 8.5 }],
      ['DUBAI-HILLS', { title: 'Dubai Hills Estate Master Community', url: 'https://brochures.agency.ae/dubai-hills.pdf', sizeMb: 6.1 }]
    ]);
  }

  /**
   * Resolves brochure for a property reference
   * @param {string} propertyRef
   * @returns {Object|null}
   */
  resolveBrochure(propertyRef = '') {
    const key = propertyRef.toUpperCase().trim();
    return this.brochureCatalog.get(key) || null;
  }

  /**
   * Formats the WhatsApp message sending the brochure to the client
   * @param {Object} brochure
   * @param {string} clientName
   * @returns {string}
   */
  formatBrochureMessage(brochure, clientName = 'Valued Client') {
    return [
      `📁 *Exclusive Brochure: ${brochure.title}*`,
      `Hi ${clientName}, here is the official architectural brochure and floor plan guide you requested:`,
      `🔗 ${brochure.url}`,
      `📦 *File Size:* ${brochure.sizeMb} MB`,
      ``,
      `Would you like me to reserve a private viewing slot with the developer for this unit? 🏛️`
    ].join('\n');
  }
}

export default new AutomatedBrochureDispatcher();

