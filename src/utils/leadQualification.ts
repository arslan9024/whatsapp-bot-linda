/**
 * Automated lead qualification & human broker handoff evaluator (Point 60).
 */
export interface LeadQualificationInput {
  hasBudget: boolean;
  hasPreferredArea: boolean;
  timelineMonths: number;
}

export function evaluateLeadQualification(input: LeadQualificationInput): {
  score: number;
  handoffToBroker: boolean;
} {
  let score = 0;
  if (input.hasBudget) score += 40;
  if (input.hasPreferredArea) score += 30;
  if (input.timelineMonths <= 3) score += 30;
  return { score, handoffToBroker: score >= 70 };
}
