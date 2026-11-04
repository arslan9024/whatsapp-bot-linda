/**
 * @file ConversationQualityAutoScorer.js
 * @description Automatically evaluates completed conversational sessions across multi-criteria rubrics (empathy, statutory precision, closing efficiency).
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class ConversationQualityAutoScorer {
  /**
   * Scores completed conversation transcript.
   * @param {Object} session
   * @param {Array<{ speaker: string, text: string }>} session.turns
   * @param {boolean} [session.leadQualified=true]
   * @param {boolean} [session.viewingBooked=false]
   * @returns {Object}
   */
  scoreSession(session) {
    let score = 50; // Base score

    if (session.turns && session.turns.length >= 4) score += 15;
    if (session.leadQualified) score += 20;
    if (session.viewingBooked) score += 15;

    // Check for empathetic tokens
    const textAll = (session.turns || []).map(t => t.text).join(' ').toLowerCase();
    if (textAll.includes('happy to assist') || textAll.includes('my pleasure') || textAll.includes('understand your needs')) {
      score += 5;
    }

    const clampedScore = Math.max(10, Math.min(100, score));

    return {
      sessionQualityScore: clampedScore,
      ratingTier: clampedScore >= 85 ? 'EXCELLENT_HIGH_CONVERTING' : clampedScore >= 65 ? 'PROFESSIONAL_STANDARD' : 'NEEDS_REFINEMENT',
      leadQualified: Boolean(session.leadQualified),
      viewingBooked: Boolean(session.viewingBooked),
      coachingFeedback: session.viewingBooked
        ? 'Optimal closing trajectory: Client smoothly guided from discovery to viewing booking.'
        : 'Opportunity: Nudge client towards in-person sales pavilion or private viewing in earlier turns.'
    };
  }
}

export default new ConversationQualityAutoScorer();
