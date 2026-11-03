/**
 * MasterPlanInfrastructureMapper.js
 * 
 * Single responsibility: Map community impact and capital appreciation vectors from major Dubai infrastructure.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const DUBAI_INFRASTRUCTURE_CATALYSTS = Object.freeze({
  METRO_BLUE_LINE: {
    completionYear: 2029,
    beneficiaryCommunities: ['DUBAI_CREEK_HARBOUR', 'ACADEMIC_CITY', 'MIRDIF', 'RAS_AL_KHOR'],
    projectedAppreciationPercent: 18,
  },
  AL_MAKTOUM_AIRPORT_EXPANSION: {
    completionYear: 2032,
    beneficiaryCommunities: ['DUBAI_SOUTH', 'DAMAC_HILLS_2', 'EXPO_CITY', 'EMAAR_SOUTH'],
    projectedAppreciationPercent: 25,
  },
  PALM_JEBEL_ALI: {
    completionYear: 2030,
    beneficiaryCommunities: ['PALM_JEBEL_ALI', 'GHANTOOT', 'JEBEL_ALI_VILLAGE'],
    projectedAppreciationPercent: 22,
  },
});

export class MasterPlanInfrastructureMapper {
  getCatalystsForCommunity(communityKey = '') {
    const cleanKey = communityKey.toUpperCase().replace(/[^A-Z0-9]/g, '_').trim();
    const matches = [];

    for (const [projectKey, details] of Object.entries(DUBAI_INFRASTRUCTURE_CATALYSTS)) {
      if (details.beneficiaryCommunities.includes(cleanKey)) {
        matches.push({ project: projectKey, ...details });
      }
    }
    return matches;
  }
}

export default new MasterPlanInfrastructureMapper();

