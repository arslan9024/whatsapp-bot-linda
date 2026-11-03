/**
 * CampaignConversionAnalytics.js
 * 
 * Single responsibility: Aggregate sent, delivered, responded, and closed conversion funnels per campaign.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class CampaignConversionAnalytics {
  calculateFunnel({ sent = 0, delivered = 0, responded = 0, qualified = 0, closed = 0 }) {
    const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;
    const responseRate = delivered > 0 ? (responded / delivered) * 100 : 0;
    const qualificationRate = responded > 0 ? (qualified / responded) * 100 : 0;
    const closedRate = qualified > 0 ? (closed / qualified) * 100 : 0;

    return {
      rawCounts: { sent, delivered, responded, qualified, closed },
      metrics: {
        deliveryRatePercent: Number(deliveryRate.toFixed(1)),
        responseRatePercent: Number(responseRate.toFixed(1)),
        qualificationRatePercent: Number(qualificationRate.toFixed(1)),
        closedRatePercent: Number(closedRate.toFixed(1)),
      },
      healthRating: responseRate >= 15 ? 'HIGH_ENGAGEMENT' : responseRate >= 8 ? 'HEALTHY' : 'NEEDS_OPTIMIZATION',
    };
  }
}

export default new CampaignConversionAnalytics();
