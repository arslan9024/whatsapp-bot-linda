/**
 * @file AntiSpamGroupPostingCadenceController.js
 * @description Governs automated WhatsApp group postings, enforcing rate-limit intervals, group-specific cool-downs, and anti-spam heuristics to safeguard bot phone numbers from meta bans.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class AntiSpamGroupPostingCadenceController {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.minIntervalMinutes = options.minIntervalMinutes || 35; // At least 35 mins between posts in same group
    this.maxDailyPostsPerGroup = options.maxDailyPostsPerGroup || 3;
    this.postingHistory = new Map(); // groupId -> Array<timestamps>
  }

  /**
   * Checks whether posting is permitted in target group at this time.
   * @param {string} groupId
   * @param {number} [currentTimeMs]
   * @returns {Object}
   */
  canPostToGroup(groupId, currentTimeMs = Date.now()) {
    const history = this.postingHistory.get(groupId) || [];
    const oneDayAgo = currentTimeMs - (24 * 60 * 60 * 1000);
    const recentHistory = history.filter(ts => ts > oneDayAgo);

    if (recentHistory.length >= this.maxDailyPostsPerGroup) {
      return {
        groupId,
        allowed: false,
        reason: 'DAILY_QUOTA_EXCEEDED',
        cooldownRemainingSeconds: Math.round((recentHistory[0] + (24 * 60 * 60 * 1000) - currentTimeMs) / 1000)
      };
    }

    if (recentHistory.length > 0) {
      const lastPostTime = recentHistory[recentHistory.length - 1];
      const elapsedMinutes = (currentTimeMs - lastPostTime) / (60 * 1000);
      if (elapsedMinutes < this.minIntervalMinutes) {
        return {
          groupId,
          allowed: false,
          reason: 'MIN_CADENCE_INTERVAL_ACTIVE',
          cooldownRemainingSeconds: Math.round((this.minIntervalMinutes - elapsedMinutes) * 60)
        };
      }
    }

    return {
      groupId,
      allowed: true,
      reason: 'READY_TO_DISPATCH',
      recommendedJitterSeconds: Math.floor(Math.random() * 45) + 15
    };
  }

  /**
   * Records a successful post execution.
   * @param {string} groupId
   * @param {number} [timestamp]
   */
  recordPost(groupId, timestamp = Date.now()) {
    const history = this.postingHistory.get(groupId) || [];
    history.push(timestamp);
    this.postingHistory.set(groupId, history);
  }
}

export default new AntiSpamGroupPostingCadenceController();
