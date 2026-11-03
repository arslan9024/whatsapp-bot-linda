/**
 * BrochureCoverPersonalizer.js
 * 
 * Single responsibility: Format personalized greeting and cover overlays for PDF property brochure dispatches.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class BrochureCoverPersonalizer {
  formatCoverMetadata({ leadName = 'Valued Investor', community = 'DAMAC Hills 2', preparedBy = 'Linda Real Estate Advisory' }) {
    return {
      title: `EXCLUSIVE INVESTMENT DOSSIER: ${community.toUpperCase()}`,
      subtitle: `Prepared Exclusively For: ${leadName}`,
      preparedBy,
      dateFormatted: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      disclaimer: 'Official Dubai Land Department verified transaction data and payment schedules included.',
    };
  }
}

export default new BrochureCoverPersonalizer();
