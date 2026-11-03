/**
 * CommunityAmenitiesIndex.js
 * 
 * Single responsibility: Match buyer lifestyle requirements (Crystal Lagoons, Golf, Pet-friendly) to communities.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const AMENITY_COMMUNITY_MAP = Object.freeze({
  LAGOON: ['DAMAC_LAGOONS', 'SOBHA_HARTLAND', 'TILAL_AL_GHAF', 'DISTRICT_ONE'],
  GOLF_COURSE: ['DAMAC_HILLS', 'DUBAI_HILLS_ESTATE', 'JUMEIRAH_GOLF_ESTATES', 'EMIRATES_HILLS'],
  PET_FRIENDLY: ['DAMAC_HILLS_2', 'JVC', 'THE_SPRINGS', 'ARABIAN_RANCHES'],
  METRO_ACCESSIBLE: ['DOWNTOWN_DUBAI', 'DUBAI_MARINA', 'BUSINESS_BAY', 'JLT'],
  PRIVATE_BEACH: ['PALM_JUMEIRAH', 'DUBAI_ISLANDS', 'LA_MER', 'EMAAR_BEACHFRONT'],
});

export class CommunityAmenitiesIndex {
  findCommunitiesForAmenity(amenityKeyword = '') {
    const key = amenityKeyword.toUpperCase().trim();
    return AMENITY_COMMUNITY_MAP[key] || [];
  }

  getAmenitiesForCommunity(communityKey = '') {
    const cleanKey = communityKey.toUpperCase().replace(/[^A-Z0-9]/g, '_').trim();
    const found = [];

    for (const [amenity, communities] of Object.entries(AMENITY_COMMUNITY_MAP)) {
      if (communities.includes(cleanKey)) {
        found.push(amenity);
      }
    }
    return found;
  }
}

export default new CommunityAmenitiesIndex();

