/**
 * @file LeadDossierCompiler.js
 * @description Compiles comprehensive lead dossiers combining contact facts, sentiment history,
 * property preferences, and chat interactions for the Web UI Lead Modal drawer.
 * Category: Intelligence
 */

export class LeadDossierCompiler {
  /**
   * Compiles an executive dossier for a prospect
   * @param {Object} params
   * @param {Object} params.contact
   * @param {Array<Object>} [params.timelineEvents]
   * @param {Object} [params.financialProfile]
   * @param {string} [params.assignedBroker]
   * @returns {Object} Comprehensive dossier
   */
  compileDossier(params) {
    const { contact = {}, timelineEvents = [], financialProfile = {}, assignedBroker = 'Unassigned' } = params;

    const totalEvents = timelineEvents.length;
    const sortedTimeline = [...timelineEvents].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      dossierId: `dos_${contact.phone ? contact.phone.replace(/\D/g, '') : Date.now()}`,
      compiledAt: new Date().toISOString(),
      leadInfo: {
        name: contact.name || 'Valued Investor',
        phone: contact.phone || '',
        email: contact.email || '',
        assignedBroker,
        leadTier: financialProfile.budgetAed >= 10000000 ? 'UHNW_VIP' : 'QUALIFIED'
      },
      preferences: {
        targetCommunity: contact.community || 'Dubai Prime',
        preferredType: contact.propertyType || 'Apartment / Villa',
        declaredBudgetAed: financialProfile.budgetAed || 0,
        currencyPreference: financialProfile.currency || 'AED'
      },
      interactionStats: {
        totalInteractions: totalEvents,
        lastInteractionAt: sortedTimeline[0]?.timestamp || null,
        sentimentScore: contact.sentimentScore ?? 80
      },
      recentTimeline: sortedTimeline.slice(0, 10)
    };
  }
}

export default new LeadDossierCompiler();
