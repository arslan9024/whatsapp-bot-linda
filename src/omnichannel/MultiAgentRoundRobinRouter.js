/**
 * @file MultiAgentRoundRobinRouter.js
 * @description Routes incoming leads across human broker rosters using weighted round-robin distribution filtered by language fluency and territory specialty.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class MultiAgentRoundRobinRouter {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.agents = options.agents || [
      { id: 'AG-01', name: 'Zaid Al-Harbi', languages: ['ar', 'en'], territory: 'Downtown Dubai', activeLeads: 4, isOnline: true },
      { id: 'AG-02', name: 'Sophie Laurent', languages: ['fr', 'en'], territory: 'Palm Jumeirah', activeLeads: 2, isOnline: true },
      { id: 'AG-03', name: 'Dmitri Volkov', languages: ['ru', 'en'], territory: 'Dubai Marina', activeLeads: 3, isOnline: true }
    ];
  }

  /**
   * Assigns lead to best matching online broker.
   * @param {Object} leadRequirements
   * @param {string} [leadRequirements.language='en']
   * @param {string} [leadRequirements.targetCommunity='Downtown Dubai']
   * @returns {Object}
   */
  routeLead(leadRequirements = {}) {
    const lang = (leadRequirements.language || 'en').toLowerCase();
    const comm = (leadRequirements.targetCommunity || '').toLowerCase();

    // Filter available online agents
    let candidates = this.agents.filter(a => a.isOnline);

    // Prefer language match
    const langMatches = candidates.filter(a => a.languages.includes(lang));
    if (langMatches.length > 0) candidates = langMatches;

    // Prefer territory match
    const territoryMatches = candidates.filter(a => a.territory.toLowerCase().includes(comm));
    if (territoryMatches.length > 0) candidates = territoryMatches;

    // Pick agent with lowest active workload
    candidates.sort((a, b) => a.activeLeads - b.activeLeads);
    const assigned = candidates[0] || this.agents[0];
    assigned.activeLeads++;

    return {
      assignedAgentId: assigned.id,
      assignedAgentName: assigned.name,
      assignedAgentTerritory: assigned.territory,
      languagesSpoken: assigned.languages,
      activeWorkload: assigned.activeLeads,
      dispatchAlert: `New hot lead routed to ${assigned.name} (${assigned.territory} specialist).`
    };
  }
}

export default new MultiAgentRoundRobinRouter();
