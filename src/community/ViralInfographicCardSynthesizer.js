/**
 * @file ViralInfographicCardSynthesizer.js
 * @description Compiles concise high-impact market data cards (ROI rankings, price per sqft comparisons) structured for viral resharing across WhatsApp broker communities.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class ViralInfographicCardSynthesizer {
  /**
   * Synthesizes market ranking infographic payload.
   * @param {Object} params
   * @param {string} params.title ('Top 5 Highest Yield Communities in Dubai')
   * @param {Array<{ rank: number, community: string, metricLabel: string, metricValue: string }>} params.rows
   * @param {string} [params.footerCta='Direct Verified Inventory via Linda AI']
   * @returns {Object}
   */
  synthesizeInfographicPayload({ title, rows = [], footerCta = 'Direct Verified Inventory via Linda AI' }) {
    const formattedRows = rows.map(r => `${r.rank}. *${r.community}* — ${r.metricLabel}: ${r.metricValue}`).join('\n');

    const fullCardText = [
      `📊 *${title.toUpperCase()}*`,
      `─────────────────────────`,
      formattedRows,
      `─────────────────────────`,
      `💡 _Source: DLD Open Data & Mollak Intelligence_`,
      `📲 ${footerCta}`
    ].join('\n');

    return {
      title,
      rowsCount: rows.length,
      shareableWhatsAppText: fullCardText,
      graphicAspectRatio: '1:1_SQUARE_INSTAGRAM_WHATSAPP',
      recommendedCaption: `Essential Dubai Real Estate Data: ${title}. Save and share with serious investors.`
    };
  }
}

export default new ViralInfographicCardSynthesizer();
