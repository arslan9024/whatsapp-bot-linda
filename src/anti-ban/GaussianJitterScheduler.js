/**
 * GaussianJitterScheduler.js
 * 
 * Single responsibility: Generate Gaussian (normal distribution) delay intervals between outbound messages.
 * Category: 2️⃣ Domain / Feature (src/anti-ban/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class GaussianJitterScheduler {
  constructor({ meanMs = 45000, stdDevMs = 15000, minMs = 15000, maxMs = 90000 } = {}) {
    this.meanMs = meanMs;
    this.stdDevMs = stdDevMs;
    this.minMs = minMs;
    this.maxMs = maxMs;
  }

  // Box-Muller transform for standard normal distribution
  _randomGaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  getNextInterval() {
    const raw = this.meanMs + this._randomGaussian() * this.stdDevMs;
    const clamped = Math.max(this.minMs, Math.min(this.maxMs, Math.round(raw)));
    return clamped;
  }
}

export default new GaussianJitterScheduler();

