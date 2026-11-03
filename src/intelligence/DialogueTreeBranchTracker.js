/**
 * DialogueTreeBranchTracker.js
 * 
 * Single responsibility: Maintain current position and answered questions in a multi-step qualification funnel.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const QUALIFICATION_STEPS = Object.freeze([
  'INTENT_CONFIRMED',
  'COMMUNITY_SELECTED',
  'BEDROOMS_SPECIFIED',
  'BUDGET_ESTABLISHED',
  'VIEWING_BOOKED',
]);

export class DialogueTreeBranchTracker {
  constructor() {
    /** @type {Map<string, { currentStepIndex: number, facts: Object }>} */
    this.leadTrees = new Map();
  }

  advanceStep(leadJid, stepName, fact = {}) {
    if (!leadJid) throw new Error('leadJid is required');
    const existing = this.leadTrees.get(leadJid) || { currentStepIndex: 0, facts: {} };
    const stepIdx = QUALIFICATION_STEPS.indexOf(stepName);

    const updated = {
      currentStepIndex: stepIdx !== -1 ? Math.max(existing.currentStepIndex, stepIdx + 1) : existing.currentStepIndex,
      facts: { ...existing.facts, ...fact },
      lastAdvancedAt: Date.now(),
    };

    this.leadTrees.set(leadJid, updated);
    return this.getStatus(leadJid);
  }

  getStatus(leadJid) {
    const data = this.leadTrees.get(leadJid) || { currentStepIndex: 0, facts: {} };
    const nextStep = QUALIFICATION_STEPS[data.currentStepIndex] || 'FULLY_QUALIFIED';
    return {
      currentStepIndex: data.currentStepIndex,
      totalSteps: QUALIFICATION_STEPS.length,
      nextStep,
      isFullyQualified: data.currentStepIndex >= QUALIFICATION_STEPS.length,
      collectedFacts: data.facts,
    };
  }
}

export default new DialogueTreeBranchTracker();

