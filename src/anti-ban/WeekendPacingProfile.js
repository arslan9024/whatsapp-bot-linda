/**
 * WeekendPacingProfile.js
 * 
 * Single responsibility: Scale weekend outreach volume down by 65% to match UAE commercial expectations.
 * Category: 2️⃣ Domain / Feature (src/anti-ban/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class WeekendPacingProfile {
  constructor({ timezone = 'Asia/Dubai', weekendReductionRatio = 0.65 } = {}) {
    this.timezone = timezone;
    this.weekendReductionRatio = weekendReductionRatio;
  }

  isWeekend(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      weekday: 'short',
    });
    const day = formatter.format(date);
    return day === 'Sat' || day === 'Sun';
  }

  getAdjustedQuota(weekdayQuota, date = new Date()) {
    if (!this.isWeekend(date)) return weekdayQuota;
    return Math.max(1, Math.round(weekdayQuota * (1 - this.weekendReductionRatio)));
  }
}

export default new WeekendPacingProfile();
