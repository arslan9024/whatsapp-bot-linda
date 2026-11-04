/**
 * @file DubaiMasterPlan2040Zoning.js
 * @description Maps real estate assets against the 5 strategic urban centers of the
 * Dubai 2040 Urban Master Plan, outlining future density allowances and green corridors.
 * Category: Domain / Feature (Spatial)
 */

export class DubaiMasterPlan2040Zoning {
  constructor() {
    this.urbanCenters = {
      DOWNTOWN_BUSINESS_BAY: {
        centerName: 'Downtown & Business Bay Financial Heart',
        priorityFocus: 'Global Financial Hub & High-Density Commercial/Residential',
        greenSpaceTarget: '60% expansion in public parks',
        longTermAppreciationPotential: 'VERY_HIGH'
      },
      MARINA_JBR: {
        centerName: 'Dubai Marina & JBR Tourism Centre',
        priorityFocus: 'International Tourism, Hospitality & Coastal Living',
        greenSpaceTarget: 'Integrated beach promenade and marina boardwalks',
        longTermAppreciationPotential: 'HIGH'
      },
      EXPO_CITY_SOUTH: {
        centerName: 'Expo City & Dubai South Gateway',
        priorityFocus: 'Al Maktoum International Airport Expansion & Logistics Capital',
        greenSpaceTarget: 'Sustainable eco-friendly exhibition districts',
        longTermAppreciationPotential: 'EXPONENTIAL_EMERGING'
      },
      SILICON_OASIS_ACADEMIC: {
        centerName: 'Dubai Silicon Oasis Science & Tech Hub',
        priorityFocus: 'Knowledge, Innovation & University Clusters',
        greenSpaceTarget: 'Pedestrian-friendly tech campus corridors',
        longTermAppreciationPotential: 'STRONG_MODERATE'
      }
    };
  }

  /**
   * Resolves Master Plan 2040 zoning context for a community
   * @param {string} communityName
   * @returns {Object} 2040 master plan strategic analysis
   */
  getZoningOutlook(communityName = '') {
    const lower = communityName.toLowerCase();

    if (lower.includes('downtown') || lower.includes('business bay') || lower.includes('difc')) {
      return this.urbanCenters.DOWNTOWN_BUSINESS_BAY;
    }
    if (lower.includes('marina') || lower.includes('jbr') || lower.includes('palm')) {
      return this.urbanCenters.MARINA_JBR;
    }
    if (lower.includes('south') || lower.includes('expo') || lower.includes('dwc')) {
      return this.urbanCenters.EXPO_CITY_SOUTH;
    }

    return {
      centerName: 'Dubai Suburban Master Planned Community',
      priorityFocus: 'Family Living, Master Community Villas & Green Corridors',
      greenSpaceTarget: 'Protected nature reserves and cycling networks',
      longTermAppreciationPotential: 'STABLE_GROWTH'
    };
  }
}

export default new DubaiMasterPlan2040Zoning();

