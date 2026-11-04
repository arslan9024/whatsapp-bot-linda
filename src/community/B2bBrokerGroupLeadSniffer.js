/**
 * @file B2bBrokerGroupLeadSniffer.js
 * @description Parses incoming unformatted WhatsApp broker group messages to extract real-time buyer requirements, location, bedrooms, and budget ceilings.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class B2bBrokerGroupLeadSniffer {
  /**
   * Sniffs buyer brief from raw message text.
   * @param {string} rawText
   * @param {string} senderPhone
   * @param {string} groupName
   * @returns {Object|null}
   */
  sniffBrokerBrief(rawText, senderPhone, groupName) {
    if (!rawText || typeof rawText !== 'string') return null;

    const lower = rawText.toLowerCase();
    const isBuyerInquiry = lower.includes('client looking') ||
      lower.includes('direct buyer') ||
      lower.includes('looking for') ||
      lower.includes('require 1br') ||
      lower.includes('require 2br') ||
      lower.includes('require 3br') ||
      lower.includes('need urgent');

    if (!isBuyerInquiry) return null;

    // Extract bedrooms
    let bedrooms = '1BR';
    if (lower.includes('studio')) bedrooms = 'Studio';
    else if (lower.includes('2br') || lower.includes('2 bed')) bedrooms = '2BR';
    else if (lower.includes('3br') || lower.includes('3 bed')) bedrooms = '3BR';
    else if (lower.includes('4br') || lower.includes('4 bed')) bedrooms = '4BR';
    else if (lower.includes('villa') || lower.includes('townhouse')) bedrooms = 'Villa/Townhouse';

    // Extract community
    let community = 'Dubai General';
    if (lower.includes('downtown')) community = 'Downtown Dubai';
    else if (lower.includes('marina')) community = 'Dubai Marina';
    else if (lower.includes('palm')) community = 'Palm Jumeirah';
    else if (lower.includes('jvc') || lower.includes('circle')) community = 'Jumeirah Village Circle';
    else if (lower.includes('hills') || lower.includes('estate')) community = 'Dubai Hills Estate';
    else if (lower.includes('creek')) community = 'Dubai Creek Harbour';

    // Extract budget ceiling
    const budgetMatch = rawText.match(/(\d+(?:\.\d+)?)\s*(?:m|million|aed|k)/i);
    let budgetAed = 0;
    if (budgetMatch) {
      const val = parseFloat(budgetMatch[1]);
      if (budgetMatch[0].toLowerCase().includes('m')) budgetAed = Math.round(val * 1000000);
      else if (budgetMatch[0].toLowerCase().includes('k')) budgetAed = Math.round(val * 1000);
      else budgetAed = Math.round(val);
    }

    return {
      senderPhone,
      sourceGroup: groupName,
      isHighIntentLead: true,
      extractedRequirements: {
        bedrooms,
        targetCommunity: community,
        maxBudgetAed: budgetAed
      },
      rawSnippet: rawText.slice(0, 150),
      actionableDispatch: `Direct Match Opportunity: Broker looking for ${bedrooms} in ${community} (Budget: AED ${budgetAed.toLocaleString()}).`
    };
  }
}

export default new B2bBrokerGroupLeadSniffer();
