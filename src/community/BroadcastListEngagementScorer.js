/**
 * @file BroadcastListEngagementScorer.js
 * @description Tracks engagement velocity (read receipts, quick replies, link clicks) across WhatsApp broadcast lists, auto-pruning unresponsive contacts to protect delivery reputation.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class BroadcastListEngagementScorer {
  /**
   * Evaluates contact engagement history.
   * @param {Object} contactMetrics
   * @param {string} contactMetrics.phone
   * @param {number} contactMetrics.broadcastsSentCount
   * @param {number} contactMetrics.repliesCount
   * @param {number} contactMetrics.linkClicksCount
   * @returns {Object}
   */
  scoreContactEngagement({ phone, broadcastsSentCount, repliesCount, linkClicksCount }) {
    if (broadcastsSentCount === 0) {
      return { phone, engagementScore: 100, tier: 'NEW_UNTESTED', shouldPrune: false };
    }

    const replyRate = (repliesCount / broadcastsSentCount) * 100;
    const clickRate = (linkClicksCount / broadcastsSentCount) * 100;
    const engagementScore = Math.min(100, Math.round((replyRate * 1.5) + (clickRate * 1.0)));

    const isDeadContact = broadcastsSentCount >= 5 && repliesCount === 0 && linkClicksCount === 0;

    let tier = 'ENGAGED_VIP';
    if (isDeadContact) tier = 'DEAD_WEIGHT';
    else if (engagementScore < 20) tier = 'LOW_RESPONSE';
    else if (engagementScore < 60) tier = 'OCCASIONAL_READER';

    return {
      phone,
      broadcastsSentCount,
      repliesCount,
      linkClicksCount,
      engagementScore,
      tier,
      shouldPrune: isDeadContact,
      hygieneAdvice: isDeadContact
        ? 'Prune Contact: Zero engagement across 5+ broadcasts; remove from bulk lists to avoid spam scoring.'
        : 'Retain Contact: Active engagement observed.'
    };
  }
}

export default new BroadcastListEngagementScorer();
