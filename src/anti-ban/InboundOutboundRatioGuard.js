/**
 * InboundOutboundRatioGuard.js
 * 
 * Single responsibility: Enforce healthy dialogue ratios (1:1.5) to protect account reputation.
 * Category: 2️⃣ Domain / Feature (src/anti-ban/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class InboundOutboundRatioGuard {
  constructor({ maxOutboundRatio = 2.5, minSamples = 10 } = {}) {
    this.maxOutboundRatio = maxOutboundRatio;
    this.minSamples = minSamples;
    /** @type {Map<string, { in: number, out: number }>} */
    this.counts = new Map();
  }

  recordInbound(sessionId) {
    const stat = this._get(sessionId);
    stat.in++;
  }

  recordOutbound(sessionId) {
    const stat = this._get(sessionId);
    stat.out++;
  }

  canSendOutbound(sessionId) {
    const stat = this._get(sessionId);
    const total = stat.in + stat.out;
    if (total < this.minSamples) return true; // Grace period during warmup

    const ratio = stat.out / Math.max(1, stat.in);
    return ratio <= this.maxOutboundRatio;
  }

  getRatio(sessionId) {
    const stat = this._get(sessionId);
    return {
      inbound: stat.in,
      outbound: stat.out,
      ratio: Number((stat.out / Math.max(1, stat.in)).toFixed(2)),
      allowed: this.canSendOutbound(sessionId),
    };
  }

  _get(sessionId) {
    if (!this.counts.has(sessionId)) {
      this.counts.set(sessionId, { in: 0, out: 0 });
    }
    return this.counts.get(sessionId);
  }
}

export default new InboundOutboundRatioGuard();
