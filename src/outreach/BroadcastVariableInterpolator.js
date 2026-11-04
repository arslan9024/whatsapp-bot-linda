/**
 * @file BroadcastVariableInterpolator.js
 * @description Interpolates dynamic variable pills ({firstName}, {community}, {budget})
 * with fallback support ({firstName|Valued Investor}) for outbound campaign messages.
 * Category: Outreach
 */

export class BroadcastVariableInterpolator {
  /**
   * Interpolates template text with lead attributes
   * @param {string} templateText
   * @param {Object} lead
   * @returns {string} Interpolated message copy
   */
  interpolate(templateText = '', lead = {}) {
    if (!templateText) return '';

    return templateText.replace(/\{([a-zA-Z0-9_]+)(?:\|([^}]+))?\}/g, (match, key, fallback) => {
      const val = lead[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
      return fallback !== undefined ? fallback.trim() : match;
    });
  }

  /**
   * Identifies all template variables contained within a message string
   * @param {string} templateText
   * @returns {Array<string>} Variable names
   */
  extractVariables(templateText = '') {
    const matches = templateText.match(/\{([a-zA-Z0-9_]+)(?:\|[^}]+)?\}/g) || [];
    return Array.from(new Set(matches.map(m => m.replace(/\{|\|.*|\}/g, ''))));
  }
}

export default new BroadcastVariableInterpolator();

