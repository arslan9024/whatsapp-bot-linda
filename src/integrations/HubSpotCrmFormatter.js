/**
 * HubSpotCrmFormatter.js
 * 
 * Single responsibility: Map Linda leads and conversation events into standard HubSpot Contact & Deal schemas.
 * Category: 2️⃣ Domain / Feature (src/integrations/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class HubSpotCrmFormatter {
  formatContactProperties({ email, phone, firstName, lastName, preferredCommunity, budgetAed }) {
    return {
      properties: {
        email: email || undefined,
        phone,
        firstname: firstName || 'Investor',
        lastname: lastName || 'Lead',
        dubai_preferred_community: preferredCommunity || 'DAMAC_HILLS_2',
        budget_aed: budgetAed ? String(budgetAed) : undefined,
        lifecyclestage: 'lead',
        lead_source: 'WHATSAPP_BOT_LINDA',
      },
    };
  }

  formatDealProperties({ dealName, pipelineStage = 'appointmentscheduled', amountAed = 0, closeDateString }) {
    return {
      properties: {
        dealname: dealName || 'Dubai Property Inquiry',
        pipeline: 'default',
        dealstage: pipelineStage,
        amount: String(amountAed),
        closedate: closeDateString || new Date(Date.now() + 30 * 86400000).toISOString(),
      },
    };
  }
}

export default new HubSpotCrmFormatter();
