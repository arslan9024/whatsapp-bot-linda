/**
 * AntiVelocityBurstGate.js
 * 
 * Single responsibility: Hard gate enforcing maximum 4 outbound messages per rolling 60-second window.
 * Category: 2️⃣ Domain / Feature (src/anti-ban/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class AntiVelocityBurstGate {
  constructor({ maxPerMinute = 4, windowMs = 60000 } = {}) {
    this.maxPerMinute = maxPerMinute;
    this.windowMs = windowMs;
    /** @type {Map<string, Array<number>>} */
    this.history = new Map();
  }

  canDispatch(sessionId, now = Date.now()) {
    const list = this._clean(sessionId, now);
    return list.length < this.maxPerMinute;
  }

  recordDispatch(sessionId, now = Date.now()) {
    const list = this._clean(sessionId, now);
    list.push(now);
    return {
      sessionId,
      dispatchedInWindow: list.length,
      allowedRemaining: Math.max(0, this.maxPerMinute - list.length),
    };
  }

  _clean(sessionId, now) {
    if (!this.history.has(sessionId)) this.history.set(sessionId, []);
    const list = this.history.get(sessionId);
    const valid = list.filter(t => (now - t) < this.windowMs);
    this.history.set(sessionId, valid);
    return valid;
  }
}

export default new AntiVelocityBurstGate();
