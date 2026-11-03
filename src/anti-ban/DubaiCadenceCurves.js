/**
 * DubaiCadenceCurves.js
 * 
 * Single responsibility: Modulate messaging rates around Dubai business hours and prayer times.
 * Category: 2️⃣ Domain / Feature (src/anti-ban/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class DubaiCadenceCurves {
  constructor({ timezone = 'Asia/Dubai' } = {}) {
    this.timezone = timezone;
  }

  getDubaiHour(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(date), 10);
  }

  isPrayerOrLunchBreak(hour) {
    // 13:00 - 14:00 (Dhuhr & Lunch), 16:30 - 17:00 (Asr)
    return hour === 13;
  }

  getMultiplierForHour(hour) {
    if (hour < 8 || hour >= 21) return 0.0; // Quiet hours
    if (this.isPrayerOrLunchBreak(hour)) return 0.35; // Slowdown
    if (hour >= 9 && hour <= 12) return 1.0; // Peak morning
    if (hour >= 15 && hour <= 19) return 0.9; // Peak late afternoon
    return 0.6; // Transition hours
  }

  canSendNow(date = new Date()) {
    const hour = this.getDubaiHour(date);
    return this.getMultiplierForHour(hour) > 0.0;
  }
}

export default new DubaiCadenceCurves();
