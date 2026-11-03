/**
 * SalesforcePropertyCloudMapper.js
 * 
 * Single responsibility: Map real estate leads to Salesforce Lead, Property, and Opportunity SObjects.
 * Category: 2️⃣ Domain / Feature (src/integrations/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class SalesforcePropertyCloudMapper {
  mapLeadSObject({ fullName = 'Investor', phone, email, community, budgetAed }) {
    return {
      attributes: { type: 'Lead' },
      LastName: fullName,
      Company: 'Individual Private Investor',
      Phone: phone,
      Email: email || null,
      Status: 'Open - Not Contacted',
      LeadSource: 'WhatsApp Linda Bot',
      Property_Interest__c: community || 'Dubai Prime',
      Budget_AED__c: budgetAed || null,
    };
  }

  mapOpportunitySObject({ opportunityName, accountId, stageName = 'Qualification', amountAed = 0 }) {
    return {
      attributes: { type: 'Opportunity' },
      Name: opportunityName,
      AccountId: accountId || null,
      StageName: stageName,
      Amount: amountAed,
      CloseDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    };
  }
}

export default new SalesforcePropertyCloudMapper();
