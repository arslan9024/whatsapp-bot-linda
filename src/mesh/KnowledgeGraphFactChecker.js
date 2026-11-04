/**
 * @file KnowledgeGraphFactChecker.js
 * @description Verifies developer relationships, master community boundaries, and landmark proximities against a deterministic property knowledge graph.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class KnowledgeGraphFactChecker {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.entityRegistry = options.entityRegistry || {
      'creek waters': { masterCommunity: 'Dubai Creek Harbour', masterDeveloper: 'Emaar Properties', metroStation: 'Creek Metro Station' },
      'burj crown': { masterCommunity: 'Downtown Dubai', masterDeveloper: 'Emaar Properties', metroStation: 'Burj Khalifa / Dubai Mall Metro' },
      'damac lagoons': { masterCommunity: 'Dubailand', masterDeveloper: 'DAMAC Properties', metroStation: 'None (Direct Hessa St access)' }
    };
  }

  /**
   * Validates project claims against the knowledge graph.
   * @param {Object} claim
   * @param {string} claim.projectName
   * @param {string} claim.assertedDeveloper
   * @param {string} [claim.assertedCommunity]
   * @returns {Object}
   */
  verifyProjectClaim({ projectName, assertedDeveloper, assertedCommunity }) {
    const key = (projectName || '').toLowerCase().trim();
    const groundTruth = this.entityRegistry[key];

    if (!groundTruth) {
      return {
        projectName,
        isVerified: false,
        groundTruthFound: false,
        advisory: 'Project not yet indexed in local knowledge graph; verify via DLD open data registry.'
      };
    }

    const isDeveloperMatch = groundTruth.masterDeveloper.toLowerCase().includes((assertedDeveloper || '').toLowerCase());
    const isCommunityMatch = !assertedCommunity || groundTruth.masterCommunity.toLowerCase().includes(assertedCommunity.toLowerCase());
    const isFactuallyAccurate = isDeveloperMatch && isCommunityMatch;

    return {
      projectName,
      groundTruthFound: true,
      groundTruth,
      isDeveloperMatch,
      isCommunityMatch,
      isFactuallyAccurate,
      correctionRequired: !isFactuallyAccurate
        ? `Fact Correction: ${projectName} is developed by ${groundTruth.masterDeveloper} in ${groundTruth.masterCommunity}.`
        : null
    };
  }
}

export default new KnowledgeGraphFactChecker();
