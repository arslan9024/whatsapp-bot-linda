/**
 * @file OffPlanCancellationRiskScorer.js
 * @description Audits RERA project escrow accounts, construction audit milestones, and developer track record to quantify project cancellation risk.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class OffPlanCancellationRiskScorer {
  /**
   * Assesses project escrow health and cancellation risk.
   * @param {Object} projectData
   * @param {number} projectData.constructionProgressPct
   * @param {number} projectData.elapsedTimePct (time passed vs planned duration)
   * @param {number} projectData.escrowBalanceAed
   * @param {number} projectData.totalEstimatedConstructionCostAed
   * @param {number} [projectData.developerPriorProjectsDelivered=5]
   * @returns {Object}
   */
  assessProjectRisk({
    constructionProgressPct,
    elapsedTimePct,
    escrowBalanceAed,
    totalEstimatedConstructionCostAed,
    developerPriorProjectsDelivered = 5
  }) {
    const timeVsWorkLagPct = elapsedTimePct - constructionProgressPct;
    const escrowCoverageRatio = totalEstimatedConstructionCostAed > 0
      ? (escrowBalanceAed / totalEstimatedConstructionCostAed)
      : 0;

    let riskScore = 15; // Baseline low risk
    if (timeVsWorkLagPct > 30) riskScore += 40;
    else if (timeVsWorkLagPct > 15) riskScore += 20;

    if (escrowCoverageRatio < 0.2 && constructionProgressPct < 50) riskScore += 25;
    if (developerPriorProjectsDelivered < 2) riskScore += 20;
    else if (developerPriorProjectsDelivered > 15) riskScore -= 10;

    const clampedRisk = Math.max(5, Math.min(95, riskScore));
    let rating = 'MINIMAL_RISK';
    if (clampedRisk >= 60) rating = 'HIGH_CANCELLATION_HAZARD';
    else if (clampedRisk >= 35) rating = 'ELEVATED_DELAY_RISK';

    return {
      constructionProgressPct,
      elapsedTimePct,
      timeVsWorkLagPct: Math.max(0, timeVsWorkLagPct),
      escrowCoverageRatio: Number(escrowCoverageRatio.toFixed(2)),
      cancellationRiskScore: clampedRisk,
      riskRating: rating,
      isReraSpecialCommitteeWatchlistCandidate: clampedRisk >= 60,
      buyerSafeguardAdvisory: clampedRisk >= 60
        ? 'High Alert: Project milestones severely lagging schedule. Request official RERA inspection report before disbursing stage payments.'
        : 'Project On Schedule: Developer execution and escrow liquidity within acceptable RERA parameters.'
    };
  }
}

export default new OffPlanCancellationRiskScorer();
