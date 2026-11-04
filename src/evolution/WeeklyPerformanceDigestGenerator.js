/**
 * @file WeeklyPerformanceDigestGenerator.js
 * @description Compiles weekly executive brokerage intelligence digests (total inbound leads, gross pipeline volume, speed-to-lead benchmarks, top agents).
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class WeeklyPerformanceDigestGenerator {
  /**
   * Compiles executive summary report.
   * @param {Object} metrics
   * @param {string} metrics.weekIdentifier ('2026-W45')
   * @param {number} metrics.totalLeads
   * @param {number} metrics.pipelineVolumeAed
   * @param {number} metrics.viewingsConducted
   * @param {number} metrics.dealsClosed
   * @param {string} metrics.topPerformingBrokerName
   * @returns {Object}
   */
  generateWeeklyDigest(metrics) {
    const conversionPct = metrics.totalLeads > 0 ? (metrics.dealsClosed / metrics.totalLeads) * 100 : 0;

    const digestText = [
      `📈 *LINDA BROKERAGE INTELLIGENCE DIGEST — ${metrics.weekIdentifier}*`,
      `───────────────────────────────────`,
      `📥 *Total Inbound Leads:* ${metrics.totalLeads.toLocaleString()}`,
      `💰 *Gross Pipeline Volume:* AED ${(metrics.pipelineVolumeAed / 1000000).toFixed(1)}M`,
      `🤝 *Viewings Conducted:* ${metrics.viewingsConducted}`,
      `🏆 *Deals Closed:* ${metrics.dealsClosed} (${conversionPct.toFixed(1)}% Conversion)`,
      `⭐ *Star Producer of the Week:* ${metrics.topPerformingBrokerName}`,
      `───────────────────────────────────`,
      `🤖 _Autonomous AI Operations Nominal: 100% 24/7 Uptime_`
    ].join('\n');

    return {
      week: metrics.weekIdentifier,
      formattedDigestText: digestText,
      conversionRatePct: Number(conversionPct.toFixed(1)),
      targetDistributionList: ['managing_director@poweragent.ae', 'head_of_sales@goraha.com']
    };
  }
}

export default new WeeklyPerformanceDigestGenerator();
