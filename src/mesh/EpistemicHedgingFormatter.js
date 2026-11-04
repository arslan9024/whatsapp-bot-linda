/**
 * @file EpistemicHedgingFormatter.js
 * @description Injects calibrated epistemic markers (e.g. "Based on current Q4 developer releases...") when predictive or future regulatory claims carry model uncertainty.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class EpistemicHedgingFormatter {
  /**
   * Applies epistemic hedging to statements when uncertainty is elevated.
   * @param {string} rawStatement
   * @param {number} confidenceScore (0.0 to 1.0)
   * @returns {Object}
   */
  calibrateStatement(rawStatement = '', confidenceScore = 0.9) {
    if (confidenceScore >= 0.85) {
      return {
        calibratedStatement: rawStatement,
        confidenceScore,
        hedgingApplied: false,
        epistemicTier: 'HIGH_CERTAINTY_ASSERTION'
      };
    }

    let prefix = 'According to prevailing market data, ';
    let epistemicTier = 'MODERATE_HEDGE';

    if (confidenceScore < 0.6) {
      prefix = 'While subject to developer revisions and final DLD approvals, current indications suggest that ';
      epistemicTier = 'HIGH_HEDGE_CAUTION';
    } else {
      prefix = 'Based on current developer guidance and recent transaction records, ';
    }

    // Lowercase first letter of original statement if prefix is prepended
    const cleanOriginal = rawStatement.charAt(0).toLowerCase() + rawStatement.slice(1);
    const hedgedText = `${prefix}${cleanOriginal}`;

    return {
      calibratedStatement: hedgedText,
      confidenceScore,
      hedgingApplied: true,
      epistemicTier,
      regulatoryProtection: 'Safeguards brokerage against promissory liability on future projections.'
    };
  }
}

export default new EpistemicHedgingFormatter();
