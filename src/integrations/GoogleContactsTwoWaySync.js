/**
 * @file GoogleContactsTwoWaySync.js
 * @description Generates Google People API formatted contact payloads and manages
 * custom contact group label tags (e.g. 'Linda_VIP_Buyer', 'OffPlan_Prospect').
 * Category: Integrations
 */

export class GoogleContactsTwoWaySync {
  /**
   * Generates a Google People API contact creation resource payload
   * @param {Object} lead
   * @param {Array<string>} [customLabels]
   * @returns {Object} Google People API resource
   */
  formatGoogleContactResource(lead, customLabels = ['BotLinda_Lead']) {
    const { name = 'Buyer', phone = '', email = '', community, budgetAed } = lead;
    const nameParts = name.trim().split(/\s+/);
    const givenName = nameParts[0] || 'Buyer';
    const familyName = nameParts.slice(1).join(' ') || '';

    const bioNote = `Acquired via Bot Linda. Target: ${community || 'Dubai'} | Budget: AED ${budgetAed || 'Undisclosed'}`;

    return {
      names: [{ givenName, familyName }],
      phoneNumbers: [{ value: phone, type: 'mobile' }],
      emailAddresses: email ? [{ value: email, type: 'work' }] : [],
      biographies: [{ value: bioNote, contentType: 'TEXT_PLAIN' }],
      userDefined: customLabels.map(label => ({ key: 'label', value: label }))
    };
  }
}

export default new GoogleContactsTwoWaySync();
