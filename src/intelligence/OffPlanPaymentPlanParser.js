/**
 * OffPlanPaymentPlanParser.js
 * 
 * Single responsibility: Parse and structure off-plan payment milestone schedules (60/40, 80/20, 1% monthly).
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class OffPlanPaymentPlanParser {
  parsePlan(planText = '') {
    if (!planText || typeof planText !== 'string') {
      return { planType: 'CUSTOM', downpaymentPercent: 20, postHandover: false };
    }
    const clean = planText.toLowerCase();

    // Check standard splits e.g. 60/40, 70/30, 80/20, 50/50
    const ratioMatch = clean.match(/(\d{2})\s*\/\s*(\d{2})/);
    const hasPostHandover = clean.includes('post handover') || clean.includes('post-handover') || clean.includes('1% monthly');

    let downpaymentPercent = 20;
    const dpMatch = clean.match(/(\d{1,2})%\s*(?:down\s*payment|booking)/);
    if (dpMatch) downpaymentPercent = parseInt(dpMatch[1], 10);

    return {
      planType: ratioMatch ? `${ratioMatch[1]}/${ratioMatch[2]}` : 'MILESTONE_LINKED',
      constructionRatio: ratioMatch ? parseInt(ratioMatch[1], 10) : 60,
      handoverRatio: ratioMatch ? parseInt(ratioMatch[2], 10) : 40,
      downpaymentPercent,
      hasPostHandover,
      monthlyPlan: clean.includes('1% monthly') ? '1%_MONTHLY_INSTALLMENT' : 'MILESTONES',
    };
  }
}

export default new OffPlanPaymentPlanParser();

