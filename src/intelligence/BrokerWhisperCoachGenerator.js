/**
 * @file BrokerWhisperCoachGenerator.js
 * @description Generates contextual sales coaching tips and objection handling advice
 * ("whisper tips") for human brokers navigating live client discussions.
 * Category: Intelligence
 */

export class BrokerWhisperCoachGenerator {
  /**
   * Generates tailored whisper advice based on client conversation context
   * @param {Object} context
   * @param {string} [context.objectionType] - 'price' | 'developer_reputation' | 'timeline' | 'roi'
   * @param {string} [context.developer] - e.g. 'Emaar', 'Binghatti', 'Damac'
   * @param {string} [context.community] - e.g. 'Downtown', 'Business Bay'
   * @param {number} [context.budgetAed]
   * @returns {Object} Coaching bullet points and closing tactics
   */
  generateWhisperAdvice(context = {}) {
    const { objectionType, developer, community, budgetAed } = context;
    const tips = [];
    let closingRecommendation = 'Suggest a 15-minute Google Meet to review live inventory layout.';

    if (objectionType === 'price') {
      tips.push('Pivot from sticker price to rental yield (gross 7.8% vs 3.5% in London/Singapore).');
      tips.push('Emphasize 0% capital gains tax and no annual property council taxes in Dubai.');
      closingRecommendation = 'Propose a flexible 60/40 payment plan with handover in Q4 2027.';
    } else if (objectionType === 'developer_reputation') {
      if (developer && /emaar|meraas|nakheel/i.test(developer)) {
        tips.push(`${developer} is government-backed / master developer with 100% historical delivery track record.`);
      } else {
        tips.push('Reassure client that 100% of investor funds are held in RERA regulated escrow accounts under Law 8.');
      }
    } else if (objectionType === 'roi') {
      tips.push(`Highlight short-term holiday home (Airbnb) yields in ${community || 'prime zones'} averaging 9-11% net.`);
      tips.push('Mention high expat influx driving 15-20% year-on-year rental appreciation.');
    } else {
      tips.push('Establish rapport by inquiring about their investment horizon (residence vs capital growth).');
    }

    if (budgetAed && budgetAed >= 15000000) {
      tips.push('Ultra-High-Net-Worth Lead: Highlight private beach access, branded residences, and Golden Visa eligibility for entire family.');
    }

    return {
      contextCategory: objectionType || 'general_consultation',
      recommendedClosing: closingRecommendation,
      coachingPoints: tips
    };
  }
}

export default new BrokerWhisperCoachGenerator();

