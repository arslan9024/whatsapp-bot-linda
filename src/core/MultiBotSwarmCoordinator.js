/**
 * @file MultiBotSwarmCoordinator.js
 * @description Coordinates bot swarm role delegation between Linda (Concierge),
 * Rachel (Campaign Outreach), and specialized departmental sub-bots.
 * Category: Core
 */

export class MultiBotSwarmCoordinator {
  constructor() {
    this.activeLocks = new Map(); // chatJid -> { botId, role, lockedAt }
    this.lockTtlMs = 10 * 60 * 1000; // 10 minutes lock
  }

  /**
   * Attempts to acquire exclusive conversation ownership for a bot instance
   * @param {string} chatJid
   * @param {string} botId - e.g. 'linda_main', 'rachel_campaign', 'dubaivillas_bot'
   * @param {string} role - 'inbound_concierge' | 'campaign_outreach' | 'support'
   * @returns {{ success: boolean, holder: string|null, reason?: string }}
   */
  acquireLock(chatJid, botId, role) {
    const existing = this.activeLocks.get(chatJid);
    const now = Date.now();

    if (existing) {
      if (now - existing.lockedAt > this.lockTtlMs) {
        // Expired lock, release and allow takeover
        this.activeLocks.delete(chatJid);
      } else if (existing.botId === botId) {
        // Re-entrant renewal
        existing.lockedAt = now;
        return { success: true, holder: botId };
      } else {
        // Priority check: Linda (Inbound Concierge) preempts automated campaign bot
        if (role === 'inbound_concierge' && existing.role === 'campaign_outreach') {
          this.activeLocks.set(chatJid, { botId, role, lockedAt: now });
          return { success: true, holder: botId, reason: 'preempted_lower_priority_bot' };
        }
        return { success: false, holder: existing.botId, reason: 'chat_held_by_other_bot' };
      }
    }

    this.activeLocks.set(chatJid, { botId, role, lockedAt: now });
    return { success: true, holder: botId };
  }

  /**
   * Releases conversation lock
   * @param {string} chatJid
   * @param {string} botId
   * @returns {boolean}
   */
  releaseLock(chatJid, botId) {
    const existing = this.activeLocks.get(chatJid);
    if (existing && existing.botId === botId) {
      this.activeLocks.delete(chatJid);
      return true;
    }
    return false;
  }

  /**
   * Returns current lock state for a chat
   * @param {string} chatJid
   * @returns {Object|null}
   */
  getLockStatus(chatJid) {
    const lock = this.activeLocks.get(chatJid);
    if (!lock) return null;
    if (Date.now() - lock.lockedAt > this.lockTtlMs) {
      this.activeLocks.delete(chatJid);
      return null;
    }
    return lock;
  }
}

export default new MultiBotSwarmCoordinator();

