/**
 * @file ExhibitionRoadshowLeadCatchment.js
 * @description Ingests, tags, and enriches real estate investor leads captured at overseas Dubai developer exhibitions and roadshows.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class ExhibitionRoadshowLeadCatchment {
  /**
   * Ingests and scores exhibition lead.
   * @param {Object} rawLead
   * @param {string} rawLead.leadName
   * @param {string} rawLead.phoneNumber
   * @param {string} rawLead.cityExhibition ('London', 'Mumbai', 'Singapore')
   * @param {string} [rawLead.budgetRange] ('1M-2M', '2M-5M', '5M+')
   * @param {string} [rawLead.timelineToPurchase] ('IMMEDIATE', '1_MONTH', 'CURIOUS')
   * @returns {Object}
   */
  processExhibitionLead(rawLead) {
    const budget = rawLead.budgetRange || '1M-2M';
    const timeline = rawLead.timelineToPurchase || '1_MONTH';

    let priorityTier = 'STANDARD';
    if (budget.includes('5M') || timeline === 'IMMEDIATE') {
      priorityTier = 'VIP_FAST_TRACK';
    } else if (budget.includes('2M-5M') || timeline === '1_MONTH') {
      priorityTier = 'HIGH_PRIORITY';
    }

    return {
      leadId: `ROADSOW-${Date.now().toString(36).toUpperCase()}`,
      leadName: rawLead.leadName,
      phoneNumber: rawLead.phoneNumber,
      eventLocation: rawLead.cityExhibition,
      budgetRange: budget,
      purchaseTimeline: timeline,
      priorityTier,
      assignedWelcomeSequence: `WELCOME_INTERNATIONAL_${rawLead.cityExhibition.toUpperCase()}`,
      autoWhatsAppTrigger: {
        template: 'roadshow_brochure_thank_you',
        delaySeconds: 120
      }
    };
  }
}

export default new ExhibitionRoadshowLeadCatchment();
