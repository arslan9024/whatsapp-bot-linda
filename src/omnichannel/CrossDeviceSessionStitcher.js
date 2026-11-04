/**
 * @file CrossDeviceSessionStitcher.js
 * @description Links anonymous website cookie browsing paths with verified WhatsApp phone identities upon first inbound text.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class CrossDeviceSessionStitcher {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.sessionStore = new Map(); // handoffToken -> { pagesViewed, device, ip }
  }

  /**
   * Registers web activity before handoff.
   * @param {string} token
   * @param {Object} webMetadata
   */
  registerWebSession(token, webMetadata) {
    this.sessionStore.set(token, {
      ...webMetadata,
      registeredAt: Date.now()
    });
  }

  /**
   * Stitches web session into WhatsApp lead profile.
   * @param {string} phone
   * @param {string} textWithToken
   * @returns {Object}
   */
  stitchSession(phone, textWithToken = '') {
    const tokenMatch = textWithToken.match(/WEB-[A-Z0-9]+-[A-Z0-9]+/i);
    const token = tokenMatch ? tokenMatch[0].toUpperCase() : null;

    const webData = token ? this.sessionStore.get(token) : null;

    return {
      phone,
      handoffToken: token,
      isSuccessfullyStitched: Boolean(webData),
      webBrowsingHistory: webData ? webData.pagesViewed || [] : [],
      inferredInterest: webData && webData.pagesViewed ? webData.pagesViewed[webData.pagesViewed.length - 1] : 'Direct WhatsApp Inbound',
      enrichmentNote: webData
        ? `Cross-Device Match: Client browsed ${webData.pagesViewed ? webData.pagesViewed.length : 0} web pages prior to WhatsApp conversation initiation.`
        : 'Pure Mobile Inbound: No prior web cookie session linked.'
    };
  }
}

export default new CrossDeviceSessionStitcher();
