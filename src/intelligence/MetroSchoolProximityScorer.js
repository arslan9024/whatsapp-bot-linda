/**
 * MetroSchoolProximityScorer.js
 * 
 * Single responsibility: Evaluate transit convenience and proximity to metro lines and British/IB schools.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const COMMUNITY_TRANSIT_PROFILES = Object.freeze({
  'DOWNTOWN_DUBAI': { metroWalkingMinutes: 5, metroStation: 'Burj Khalifa / Dubai Mall', topSchoolMins: 12 },
  'DUBAI_MARINA': { metroWalkingMinutes: 7, metroStation: 'DMCC / Sobha Realty', topSchoolMins: 15 },
  'JUMEIRAH_VILLAGE_CIRCLE': { metroWalkingMinutes: 0, metroStation: 'None (Bus feeder only)', topSchoolMins: 8 },
  'DAMAC_HILLS_2': { metroWalkingMinutes: 0, metroStation: 'None (Drive to Expo 2020)', topSchoolMins: 18 },
  'BUSINESS_BAY': { metroWalkingMinutes: 8, metroStation: 'Business Bay Station', topSchoolMins: 14 },
});

export class MetroSchoolProximityScorer {
  getProximityScore(communityName = '') {
    const key = communityName.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').trim();
    const profile = COMMUNITY_TRANSIT_PROFILES[key];

    if (!profile) {
      return { community: communityName, hasDirectMetro: false, transitConvenienceScore: 50 };
    }

    const hasDirectMetro = profile.metroWalkingMinutes > 0 && profile.metroWalkingMinutes <= 15;
    let score = 50;
    if (hasDirectMetro) score += 35;
    if (profile.topSchoolMins <= 10) score += 15;

    return {
      community: communityName,
      hasDirectMetro,
      metroStation: profile.metroStation,
      metroWalkingMinutes: profile.metroWalkingMinutes,
      topSchoolMinutes: profile.topSchoolMins,
      transitConvenienceScore: score,
    };
  }
}

export default new MetroSchoolProximityScorer();
