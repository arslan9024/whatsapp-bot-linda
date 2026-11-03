/**
 * BlockedContactQuarantine.js
 * 
 * Single responsibility: Maintain a cross-account quarantine blacklist preventing re-outreach to blocking numbers.
 * Category: 2️⃣ Domain / Feature (src/accounts/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class BlockedContactQuarantine {
  constructor() {
    /** @type {Map<string, { reason: string, blockedAt: number }>} */
    this.quarantined = new Map();
  }

  recordBlock(phone, reason = 'USER_BLOCKED_BOT') {
    if (!phone) throw new Error('phone is required');
    this.quarantined.set(phone, {
      reason,
      blockedAt: Date.now(),
    });
  }

  isQuarantined(phone) {
    return this.quarantined.has(phone);
  }

  getBlockDetails(phone) {
    return this.quarantined.get(phone) || null;
  }

  size() {
    return this.quarantined.size;
  }
}

export default new BlockedContactQuarantine();

