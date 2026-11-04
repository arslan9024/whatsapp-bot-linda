/**
 * @file MatterportTourFrameExtractor.js
 * @description Parses Matterport 3D virtual tour URLs and extracts model identifiers,
 * deep-link room coordinates, and dollhouse preview image URLs.
 * Category: Intelligence
 */

export class MatterportTourFrameExtractor {
  /**
   * Extracts model ID and parameters from a Matterport URL
   * @param {string} urlString
   * @returns {Object} Structured Matterport tour descriptor
   */
  parseMatterportUrl(urlString = '') {
    try {
      const parsed = new URL(urlString);
      const isMatterport = parsed.hostname.includes('matterport.com');

      if (!isMatterport) {
        return { valid: false, error: 'Not a recognized Matterport URL' };
      }

      const modelId = parsed.searchParams.get('m') || parsed.pathname.split('/').filter(Boolean).pop();
      if (!modelId || modelId.length < 8) {
        return { valid: false, error: 'Missing or malformed Matterport model ID' };
      }

      return {
        valid: true,
        modelId,
        embedUrl: `https://my.matterport.com/show/?m=${modelId}&play=1&qs=1`,
        dollhouseThumbnailUrl: `https://media.matterport.com/models/${modelId}/thumb.jpg`,
        deepLinkRoom: parsed.searchParams.get('sr') || null
      };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }
}

export default new MatterportTourFrameExtractor();

