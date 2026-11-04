/**
 * @file WhatsAppGroupMembershipManager.js
 * @description Manages bot group memberships, tracking activity velocity, auto-muting low-value groups, and enforcing total active group limits to prevent client memory bloat.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class WhatsAppGroupMembershipManager {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.maxActiveGroups = options.maxActiveGroups || 40;
    this.groups = new Map(); // groupId -> { name, joinedAt, messageCount, lastActivityAt, isMuted }
  }

  /**
   * Registers group activity.
   * @param {string} groupId
   * @param {string} groupName
   * @param {number} [timestamp]
   */
  trackActivity(groupId, groupName, timestamp = Date.now()) {
    const existing = this.groups.get(groupId) || {
      groupId,
      name: groupName,
      joinedAt: timestamp,
      messageCount: 0,
      lastActivityAt: timestamp,
      isMuted: false
    };

    existing.messageCount++;
    existing.lastActivityAt = timestamp;
    this.groups.set(groupId, existing);
  }

  /**
   * Audits health and recommends groups to prune or mute.
   * @param {number} [currentTimeMs]
   * @returns {Object}
   */
  auditGroupMemberships(currentTimeMs = Date.now()) {
    const list = Array.from(this.groups.values());
    const sevenDaysAgo = currentTimeMs - (7 * 24 * 60 * 60 * 1000);

    const inactiveGroups = list.filter(g => g.lastActivityAt < sevenDaysAgo);
    const hyperActiveSpamGroups = list.filter(g => g.messageCount > 500 && !g.isMuted);

    return {
      totalGroupsTracked: list.length,
      maxCapacity: this.maxActiveGroups,
      isNearCapacity: list.length >= (this.maxActiveGroups * 0.9),
      inactiveGroupsToLeave: inactiveGroups.map(g => ({ groupId: g.groupId, name: g.name })),
      spamGroupsToMute: hyperActiveSpamGroups.map(g => ({ groupId: g.groupId, name: g.name })),
      healthyActiveCount: list.length - inactiveGroups.length
    };
  }
}

export default new WhatsAppGroupMembershipManager();
