/**
 * @file PropertySpecialistSkillMatcher.js
 * @description Matches qualified leads to the most specialized human agent based on
 * asset class (villa/apartment), market tier (luxury vs mid-market), and community focus.
 * Category: Accounts
 */

export class PropertySpecialistSkillMatcher {
  constructor() {
    this.agentSpecialties = new Map();
  }

  /**
   * Registers a human specialist's capabilities
   * @param {string} agentId
   * @param {Object} profile
   * @param {Array<string>} profile.communities - e.g. ['Downtown', 'Dubai Hills']
   * @param {Array<string>} profile.propertyTypes - e.g. ['Villa', 'Penthouse']
   * @param {number} [profile.minBudgetAed]
   * @param {number} [profile.maxBudgetAed]
   * @param {boolean} [profile.isOffPlanSpecialist]
   */
  registerSpecialist(agentId, profile) {
    this.agentSpecialties.set(agentId, {
      agentId,
      communities: (profile.communities || []).map(c => c.toLowerCase()),
      propertyTypes: (profile.propertyTypes || []).map(p => p.toLowerCase()),
      minBudgetAed: profile.minBudgetAed || 0,
      maxBudgetAed: profile.maxBudgetAed || Infinity,
      isOffPlanSpecialist: Boolean(profile.isOffPlanSpecialist)
    });
  }

  /**
   * Computes match score between a lead and a specialist
   * @param {Object} lead
   * @param {Object} specialist
   * @returns {number} Score from 0 to 100
   */
  calculateScore(lead, specialist) {
    let score = 0;

    // Community match (35 pts)
    const leadComm = (lead.community || '').toLowerCase();
    if (leadComm && specialist.communities.some(c => leadComm.includes(c) || c.includes(leadComm))) {
      score += 35;
    }

    // Property Type match (25 pts)
    const leadType = (lead.propertyType || '').toLowerCase();
    if (leadType && specialist.propertyTypes.some(t => leadType.includes(t) || t.includes(leadType))) {
      score += 25;
    }

    // Budget range check (25 pts)
    const budget = Number(lead.budgetAed || 0);
    if (budget > 0) {
      if (budget >= specialist.minBudgetAed && budget <= specialist.maxBudgetAed) {
        score += 25;
      }
    } else {
      score += 10; // neutral
    }

    // Off-plan / Secondary match (15 pts)
    if (lead.isOffPlan !== undefined) {
      if (lead.isOffPlan === specialist.isOffPlanSpecialist) {
        score += 15;
      }
    } else {
      score += 5;
    }

    return score;
  }

  /**
   * Finds the best matching specialist for a given lead
   * @param {Object} lead
   * @param {Array<string>} [candidateAgentIds] - Optional pool of currently available agents
   * @returns {{ agentId: string, score: number } | null}
   */
  findBestSpecialist(lead, candidateAgentIds = null) {
    let bestMatch = null;
    let highestScore = -1;

    for (const [id, spec] of this.agentSpecialties.entries()) {
      if (candidateAgentIds && !candidateAgentIds.includes(id)) {
        continue;
      }

      const score = this.calculateScore(lead, spec);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = { agentId: id, score };
      }
    }

    return bestMatch;
  }
}

export default new PropertySpecialistSkillMatcher();
