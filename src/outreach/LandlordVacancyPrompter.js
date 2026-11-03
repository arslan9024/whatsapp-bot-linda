/**
 * LandlordVacancyPrompter.js
 * 
 * Single responsibility: Format bi-annual inventory checks to inquire if landlord properties are tenanted or vacant.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class LandlordVacancyPrompter {
  formatVacancyCheck({ ownerName = 'there', unitNumber = 'your unit', community = 'DAMAC Hills 2' } = {}) {
    return `Hello ${ownerName}! Checking in from Linda Advisory regarding ${unitNumber} in ${community}. Is the property currently tenanted or vacant for sale/lease? We have registered pre-qualified clients actively seeking units in this cluster.`;
  }
}

export default new LandlordVacancyPrompter();
