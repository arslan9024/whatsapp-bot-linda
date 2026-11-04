/**
 * @file MultiTurnCoherenceGuard.js
 * @description Audits current candidate replies against past conversation commitments (quoted prices, promised discounts, fee waiver terms) to prevent contradictory statements.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class MultiTurnCoherenceGuard {
  /**
   * Evaluates candidate reply against historical commitments.
   * @param {string} candidateReply
   * @param {Array<{ turn: number, speaker: string, commitmentType: string, claimedValue: string|number }>} historicalCommitments
   * @returns {Object}
   */
  auditCoherence(candidateReply = '', historicalCommitments = []) {
    const conflicts = [];
    const lowerReply = candidateReply.toLowerCase();

    for (const comm of historicalCommitments) {
      if (comm.commitmentType === 'PRICE_QUOTE') {
        // If prior quote was 2.5M and current quote mentions 2.9M for same unit
        if (typeof comm.claimedValue === 'number') {
          const numbersInReply = candidateReply.match(/\b\d+(?:\.\d+)?\s*(?:m|million|aed)\b/gi) || [];
          for (const match of numbersInReply) {
            const val = parseFloat(match);
            if (match.toLowerCase().includes('m') && Math.abs(val * 1000000 - comm.claimedValue) > 200000) {
              conflicts.push({
                type: 'PRICE_DISCREPANCY',
                priorClaim: `AED ${comm.claimedValue.toLocaleString()}`,
                candidateSnippet: match,
                advisory: 'Do not increase asking price mid-conversation without explaining secondary market justification.'
              });
            }
          }
        }
      } else if (comm.commitmentType === 'DLD_WAIVER') {
        if (comm.claimedValue === '100%_WAIVED' && lowerReply.includes('buyer pays 4% dld')) {
          conflicts.push({
            type: 'PROMISSORY_CONTRADICTION',
            priorClaim: 'Promised 100% DLD Waiver in earlier turn',
            candidateSnippet: 'buyer pays 4% dld'
          });
        }
      }
    }

    const isCoherent = conflicts.length === 0;

    return {
      isCoherent,
      conflictsFound: conflicts,
      status: isCoherent ? 'COHERENCE_VERIFIED' : 'CONTRADICTION_BLOCKED'
    };
  }
}

export default new MultiTurnCoherenceGuard();
