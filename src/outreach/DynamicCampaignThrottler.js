/**
 * DynamicCampaignThrottler.js
 * 
 * Single responsibility: Dynamically calculate optimal send delays based on daily quota and time remaining in shift.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class DynamicCampaignThrottler {
  calculatePacingDelay({ remainingQueueCount, shiftRemainingMinutes, minDelaySeconds = 30, maxDelaySeconds = 180 }) {
    if (!remainingQueueCount || remainingQueueCount <= 0) return minDelaySeconds;
    if (!shiftRemainingMinutes || shiftRemainingMinutes <= 0) return maxDelaySeconds;

    const availableSeconds = shiftRemainingMinutes * 60;
    const computedDelay = Math.floor(availableSeconds / remainingQueueCount);

    return Math.max(minDelaySeconds, Math.min(maxDelaySeconds, computedDelay));
  }
}

export default new DynamicCampaignThrottler();
