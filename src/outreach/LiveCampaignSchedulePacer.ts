// @ts-nocheck
/**
 * LiveCampaignSchedulePacer.ts
 * 
 * Single responsibility: Enforce humanized UAE business-hour schedules (09:00 - 20:00 GST),
 * randomized send gaps (35-55 mins), and daily safety quotas (12 owners/day) under Dubai Cadence.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class LiveCampaignSchedulePacer {
  constructor({
    minGapMinutes = 35,
    maxGapMinutes = 55,
    dailyLimit = 12,
    timezone = 'Asia/Dubai',
    workingHoursStart = 9,  // 09:00 GST
    workingHoursEnd = 20,   // 20:00 GST
  } = {}) {
    this.minGapMinutes = minGapMinutes;
    this.maxGapMinutes = maxGapMinutes;
    this.dailyLimit = dailyLimit;
    this.timezone = timezone;
    this.workingHoursStart = workingHoursStart;
    this.workingHoursEnd = workingHoursEnd;
  }

  /**
   * Calculate a randomized jitter delay between sends in milliseconds
   * @returns {number} Delay in milliseconds
   */
  calculateNextDispatchIntervalMs() {
    const minMs = this.minGapMinutes * 60 * 1000;
    const maxMs = this.maxGapMinutes * 60 * 1000;
    const randomFraction = Math.random();
    return Math.floor(minMs + randomFraction * (maxMs - minMs));
  }

  /**
   * Check if current time falls within compliant Dubai outreach hours
   * @param {Date} [now]
   * @returns {{ isAllowed: boolean, currentHourGST: number, reason?: string }}
   */
  isWithinCompliantHours(now = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      hour: 'numeric',
      hour12: false,
    });
    const currentHourGST = parseInt(formatter.format(now), 10);

    if (currentHourGST < this.workingHoursStart || currentHourGST >= this.workingHoursEnd) {
      return {
        isAllowed: false,
        currentHourGST,
        reason: `Outside compliant Dubai outreach hours (${this.workingHoursStart}:00 - ${this.workingHoursEnd}:00 GST). Current GST: ${currentHourGST}:00`,
      };
    }

    return {
      isAllowed: true,
      currentHourGST,
    };
  }

  /**
   * Generate an automated schedule plan for a list of target prospects
   * @param {Array<{ phone: string, name: string }>} prospects
   * @param {Date} [startTime]
   * @returns {{ scheduledDispatches: Array, totalScheduled: number, dailyCapEnforced: boolean }}
   */
  generateDispatchSchedule(prospects = [], startTime = new Date()) {
    const allowedProspects = prospects.slice(0, this.dailyLimit);
    let cumulativeDelayMs = 0;
    const scheduledDispatches = [];

    for (let i = 0; i < allowedProspects.length; i++) {
      const prospect = allowedProspects[i];
      if (i > 0) {
        cumulativeDelayMs += this.calculateNextDispatchIntervalMs();
      }

      const scheduledTime = new Date(startTime.getTime() + cumulativeDelayMs);
      scheduledDispatches.push({
        slotNumber: i + 1,
        recipientPhone: prospect.phone,
        recipientName: prospect.name,
        scheduledTimeISO: scheduledTime.toISOString(),
        delayMinutesFromStart: Math.round(cumulativeDelayMs / (60 * 1000)),
      });
    }

    return {
      scheduledDispatches,
      totalScheduled: scheduledDispatches.length,
      dailyCapEnforced: prospects.length > this.dailyLimit,
    };
  }
}

export default new LiveCampaignSchedulePacer();
