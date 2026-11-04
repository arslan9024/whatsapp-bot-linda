/**
 * @file GroupSentimentBuzzAnalyzer.js
 * @description Analyzes message volume frequency and keyword sentiment across broker groups to detect early launch buzz and sentiment shifts.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class GroupSentimentBuzzAnalyzer {
  /**
   * Analyzes buzz metrics from group message samples.
   * @param {Array<{ text: string, timestamp: number }>} messages
   * @param {string} projectKeyword (e.g. 'Palm Jebel Ali', 'Oasis')
   * @returns {Object}
   */
  analyzeProjectBuzz(messages = [], projectKeyword = '') {
    const kw = (projectKeyword || '').toLowerCase().trim();
    let mentions = 0;
    let positiveSentimentCount = 0;
    let skepticismCount = 0;

    const positiveSignals = ['sold out', 'hot', 'gem', 'underpriced', 'premium', 'invest', 'demanded'];
    const skepticalSignals = ['overpriced', 'delayed', 'too expensive', 'slow', 'bad layout', 'flop'];

    for (const msg of messages) {
      const lower = (msg.text || '').toLowerCase();
      if (lower.includes(kw)) {
        mentions++;
        if (positiveSignals.some(s => lower.includes(s))) positiveSentimentCount++;
        if (skepticalSignals.some(s => lower.includes(s))) skepticismCount++;
      }
    }

    const netSentimentScore = mentions > 0
      ? Math.round(((positiveSentimentCount - skepticismCount) / mentions) * 100)
      : 0;

    let buzzRating = 'COLD';
    if (mentions >= 15 && netSentimentScore > 30) buzzRating = 'VIRAL_HOT_LAUNCH';
    else if (mentions >= 8) buzzRating = 'MODERATE_INTEREST';
    else if (mentions > 0) buzzRating = 'NICHE_DISCUSSION';

    return {
      projectKeyword,
      totalMessagesSampled: messages.length,
      mentionsCount: mentions,
      positiveSentimentCount,
      skepticismCount,
      netSentimentScore,
      buzzRating,
      isFomoUnderway: buzzRating === 'VIRAL_HOT_LAUNCH'
    };
  }
}

export default new GroupSentimentBuzzAnalyzer();
