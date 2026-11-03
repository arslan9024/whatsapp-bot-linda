/**
 * NoAnswerDripSequencer.js
 * 
 * Single responsibility: Schedule 3-step value-driven follow-up messages (Day 1, Day 3, Day 7) for silent leads.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const DRIP_INTERVALS_MS = Object.freeze([
  1 * 24 * 60 * 60 * 1000, // Step 1: 24h later
  3 * 24 * 60 * 60 * 1000, // Step 2: 72h later
  7 * 24 * 60 * 60 * 1000, // Step 3: 7 days later
]);

export class NoAnswerDripSequencer {
  getNextStepSchedule(currentStepIndex = 0, lastDispatchedAt = Date.now()) {
    if (currentStepIndex >= DRIP_INTERVALS_MS.length) {
      return { hasNextStep: false, scheduleAt: null, stepName: 'CAMPAIGN_RETIRED' };
    }

    const interval = DRIP_INTERVALS_MS[currentStepIndex];
    return {
      hasNextStep: true,
      stepIndex: currentStepIndex + 1,
      scheduleAt: lastDispatchedAt + interval,
      stepName: `FOLLOW_UP_STAGE_${currentStepIndex + 1}`,
    };
  }

  getTemplateForStage(stageNumber, { leadName = 'there', community = 'Dubai' } = {}) {
    switch (stageNumber) {
      case 1:
        return `Hi ${leadName}, just following up on our previous note regarding new releases in ${community}. Would you like a 1-page summary of current pricing?`;
      case 2:
        return `Hello ${leadName}, three townhouses in ${community} were just reserved this week. I can send you the remaining available layouts if still interested.`;
      case 3:
        return `Hi ${leadName}, I don't want to crowd your inbox. Should I keep you updated on ${community} or pause messages for now?`;
      default:
        return `Hello ${leadName}, checking in regarding your property inquiry.`;
    }
  }
}

export default new NoAnswerDripSequencer();
