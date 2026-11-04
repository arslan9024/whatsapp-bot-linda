/**
 * @file DynamicQrPayloadGenerator.js
 * @description Generates formatted QR code data structures and WebSocket payloads
 * for the Web UI session linking modal, enabling rapid multi-device account pairing.
 * Category: Domain / Feature (Connection)
 */

export class DynamicQrPayloadGenerator {
  /**
   * Packages a raw WhatsApp QR string into a dashboard-ready presentation payload
   * @param {string} rawQrString
   * @param {string} sessionName
   * @param {number} [ttlSeconds]
   * @returns {Object} Structured QR modal payload
   */
  packageQrPayload(rawQrString, sessionName = 'linda_primary', ttlSeconds = 60) {
    if (!rawQrString) {
      throw new Error('rawQrString is required');
    }

    const issuedAt = Date.now();
    const expiresAt = issuedAt + (ttlSeconds * 1000);

    return {
      sessionName,
      rawQr: rawQrString,
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      ttlSeconds,
      instructions: [
        'Open WhatsApp on your phone',
        'Tap Menu (Android) or Settings (iPhone) > Linked Devices',
        'Tap Link a Device',
        'Point your phone at this screen to scan the QR code'
      ]
    };
  }
}

export default new DynamicQrPayloadGenerator();

