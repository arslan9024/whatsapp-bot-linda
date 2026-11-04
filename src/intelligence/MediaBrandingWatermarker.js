/**
 * @file MediaBrandingWatermarker.js
 * @description Generates branding watermark layout templates, SVG badge coordinates,
 * and RERA registration compliance stamps for outgoing marketing property collateral.
 * Category: Intelligence
 */

export class MediaBrandingWatermarker {
  constructor(config = {}) {
    this.agencyName = config.agencyName || 'Linda Real Estate LLC';
    this.reraOrn = config.reraOrn || 'ORN-12345';
  }

  /**
   * Generates watermarking overlay descriptor for an image
   * @param {Object} imageMeta
   * @param {number} imageMeta.width
   * @param {number} imageMeta.height
   * @param {string} [brokerName]
   * @returns {Object} Image overlay parameters
   */
  generateWatermarkSpec(imageMeta = {}, brokerName = 'Linda Operations') {
    const width = imageMeta.width || 1200;
    const height = imageMeta.height || 800;

    return {
      canvasDimensions: { width, height },
      badgePosition: {
        x: Math.round(width * 0.04),
        y: Math.round(height * 0.88)
      },
      badgeOpacity: 0.85,
      watermarkText: `${this.agencyName} | ${this.reraOrn}`,
      brokerContactPill: brokerName,
      svgBadgeMarkup: `
        <svg width="350" height="60" xmlns="http://www.w3.org/2000/svg">
          <rect width="350" height="60" rx="8" fill="rgba(15, 23, 42, 0.8)"/>
          <text x="15" y="26" fill="#f8fafc" font-size="14" font-family="sans-serif" font-weight="bold">${this.agencyName}</text>
          <text x="15" y="46" fill="#94a3b8" font-size="11" font-family="sans-serif">RERA ${this.reraOrn} • ${brokerName}</text>
        </svg>
      `.trim()
    };
  }
}

export default new MediaBrandingWatermarker();

