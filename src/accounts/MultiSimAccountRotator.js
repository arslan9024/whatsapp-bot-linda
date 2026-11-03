/**
 * MultiSimAccountRotator.js
 * 
 * Single responsibility: Rotate outbound messaging across registered SIM numbers when hourly limits approach.
 * Category: 2️⃣ Domain / Feature (src/accounts/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class MultiSimAccountRotator {
  constructor({ maxHourlySends = 20 } = {}) {
    this.maxHourlySends = maxHourlySends;
    /** @type {Map<string, Array<number>>} */
    this.history = new Map();
  }

  recordSend(phone, now = Date.now()) {
    if (!this.history.has(phone)) this.history.set(phone, []);
    const timestamps = this.history.get(phone);
    timestamps.push(now);
  }

  getHourlyCount(phone, now = Date.now()) {
    const timestamps = this.history.get(phone) || [];
    const oneHourAgo = now - 3600000;
    const active = timestamps.filter(t => t > oneHourAgo);
    this.history.set(phone, active);
    return active.length;
  }

  selectBestAccount(availablePhones = [], now = Date.now()) {
    if (!availablePhones.length) return null;

    let bestPhone = null;
    let lowestCount = Infinity;

    for (const phone of availablePhones) {
      const count = this.getHourlyCount(phone, now);
      if (count < this.maxHourlySends && count < lowestCount) {
        lowestCount = count;
        bestPhone = phone;
      }
    }
    return bestPhone;
  }
}

export default new MultiSimAccountRotator();
