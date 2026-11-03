/**
 * @file CampaignPerformanceAnalyticsAggregator.js
 * @description Computes granular conversion funnels (Sent -> Delivered -> Read -> Replied -> Qualified)
 * and pipeline ROI estimates for completed WhatsApp campaigns.
 * Category: Outreach
 */

export class CampaignPerformanceAnalyticsAggregator {
  /**
   * Computes campaign performance funnel
   * @param {Object} campaignMetrics
   * @param {number} campaignMetrics.sent
   * @param {number} campaignMetrics.delivered
   * @param {number} campaignMetrics.replied
   * @param {number} campaignMetrics.qualified
   * @param {number} [campaignMetrics.totalBudgetVolumeAed]
   * @returns {Object} Full conversion rates
   */
  calculateFunnel(campaignMetrics) {
    const { sent = 0, delivered = 0, replied = 0, qualified = 0, totalBudgetVolumeAed = 0 } = campaignMetrics;

    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
    const responseRate = delivered > 0 ? Math.round((replied / delivered) * 100) : 0;
    const qualificationRate = replied > 0 ? Math.round((qualified / replied) * 100) : 0;

    return {
      sent,
      delivered,
      replied,
      qualified,
      rates: {
        deliveryRatePercent: deliveryRate,
        responseRatePercent: responseRate,
        qualificationRatePercent: qualificationRate
      },
      pipeline: {
        totalDeclaredBudgetAed: totalBudgetVolumeAed,
        projectedCommissionAed: Math.round(totalBudgetVolumeAed * 0.02) // 2% agency commission estimate
      }
    };
  }
}

export default new CampaignPerformanceAnalyticsAggregator();
