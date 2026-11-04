/**
 * @file BulkVcfContactCardSynthesizer.js
 * @description Generates standards-compliant vCard 3.0 (.vcf) formatted strings from broker community rosters for seamless single-click contact syncing into phone address books.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class BulkVcfContactCardSynthesizer {
  /**
   * Synthesizes single or bulk vCard strings.
   * @param {Array<{ name: string, phone: string, agency: string, brn: string }>} contacts
   * @returns {string} Raw VCF payload
   */
  synthesizeVcf(contacts = []) {
    const cards = [];

    for (const c of contacts) {
      const cleanPhone = (c.phone || '').replace(/[^0-9+]/g, '');
      const cleanName = (c.name || 'Dubai Broker').trim();
      const org = (c.agency || 'RERA Real Estate Brokerage').trim();
      const note = c.brn ? `BRN: ${c.brn} | Sourced via Linda AI` : 'Sourced via Linda AI';

      cards.push([
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${cleanName}`,
        `ORG:${org}`,
        `TEL;TYPE=CELL:${cleanPhone}`,
        `NOTE:${note}`,
        'END:VCARD'
      ].join('\r\n'));
    }

    return cards.join('\r\n');
  }
}

export default new BulkVcfContactCardSynthesizer();
