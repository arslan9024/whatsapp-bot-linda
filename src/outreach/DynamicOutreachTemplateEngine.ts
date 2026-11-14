// @ts-nocheck
/**
 * DynamicOutreachTemplateEngine.ts
 * 
 * Single responsibility: Multi-cluster Spintax & bilingual (EN/AR) dynamic template generation
 * with variable interpolation for Dubai master communities (Damac Hills 2, Vardon, Aster, etc.).
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

import spintaxEngine from './SpintaxSyntaxEngine.js';
import interpolator from './BroadcastVariableInterpolator.js';

export const OUTREACH_TEMPLATES = Object.freeze({
  VARDON_VALUATION_EN: {
    id: 'VARDON_VALUATION_EN',
    cluster: 'Vardon',
    language: 'EN',
    purpose: 'SELLER_VALUATION',
    template: '{Good day|Hello|Hi} {firstName|Owner}, {trust you are well|hope all is well with you}. This is Linda from White Caves Real Estate LLC in Dubai. We are currently assisting {qualified cash buyers|serious investors} looking specifically for villas in the {cluster|Vardon} cluster, Damac Hills 2. Recent DLD transactions indicate strong capital appreciation for your unit type. Would you be {open to reviewing|interested in} an updated market valuation report for your property this week?'
  },
  VARDON_VALUATION_AR: {
    id: 'VARDON_VALUATION_AR',
    cluster: 'Vardon',
    language: 'AR',
    purpose: 'SELLER_VALUATION',
    template: '{مرحباً بك|أهلاً وسهلاً|السلام عليكم} {firstName|عزيزي المالك}، معكم ليندا من شركة وايت كيفز العقارية في دبي. لدينا حالياً {مستثمرون معتمدون|مشترون كاش جاهزون} يبحثون تحديداً عن فلل في مجمع {cluster|فاردون} - داماك هيلز 2. وفقاً لآخر صفقات دائرة الأراضي والأملاك (DLD)، يشهد المجمع طلباً مرتفعاً. هل ترغب في الحصول على {تقرير تقييم عقاري مجاني|تحديث عن القيمة السوقية الحالية} لفيلتكم؟'
  },
  VARDON_RENTAL_EJARI_EN: {
    id: 'VARDON_RENTAL_EJARI_EN',
    cluster: 'Vardon',
    language: 'EN',
    purpose: 'LANDLORD_LEASING',
    template: '{Hello|Good afternoon|Hi} {firstName|Property Owner}, Linda here from White Caves Real Estate LLC. If your villa in {cluster|Vardon} is currently vacant or approaching renewal, our asset management desk provides {comprehensive tenant screening|end-to-end Ejari documentation} with optimal annual yields. May we share our recent rental comps for your cluster?'
  },
  VARDON_RENTAL_EJARI_AR: {
    id: 'VARDON_RENTAL_EJARI_AR',
    cluster: 'Vardon',
    language: 'AR',
    purpose: 'LANDLORD_LEASING',
    template: '{تحية طيبة|أهلاً بك|السلام عليكم} {firstName|عزيزي المالك}، معكم ليندا من وايت كيفز العقارية. إذا كانت فيلتكم في مجمع {cluster|فاردون} شاغرة أو تقترب من موعد تجديد عقد الإيجار، يسعدنا تولي {فحص المستأجرين المعتمدين|إجراءات توثيق عقد إيجاري بالكامل} لتحقيق أعلى عائد سنوي. هل تود استعراض أسعار الإيجار الحالية في مجمعكم؟'
  },
  VARDON_INVESTOR_ROI_EN: {
    id: 'VARDON_INVESTOR_ROI_EN',
    cluster: 'Vardon',
    language: 'EN',
    purpose: 'BUYER_INVESTMENT',
    template: '{Dear|Hi|Hello} {firstName|Investor}, White Caves Real Estate has secured an exclusive off-market listing in {cluster|Vardon}, Damac Hills 2. With rental yields hovering at {projectedRoi|8.2%} and immediate tenant occupancy, this is a prime addition to your portfolio. Would you like the full property prospectus sent over WhatsApp?'
  }
});

export class DynamicOutreachTemplateEngine {
  constructor({ spintax = spintaxEngine, variableInterpolator = interpolator } = {}) {
    this.spintax = spintax;
    this.interpolator = variableInterpolator;
  }

  /**
   * Generate humanized spintax message with dynamic variables
   * @param {string} templateId - Key from OUTREACH_TEMPLATES
   * @param {Object} recipientData - Recipient attributes (firstName, cluster, etc.)
   * @returns {{ messageText: string, templateId: string, language: string, variationsAvailable: number }}
   */
  generateOutreachMessage(templateId, recipientData = {}) {
    const templateConfig = OUTREACH_TEMPLATES[templateId] || OUTREACH_TEMPLATES.VARDON_VALUATION_EN;
    const interpolated = this.interpolator.interpolate(templateConfig.template, {
      cluster: 'Vardon',
      ...recipientData,
    });
    const messageText = this.spintax.spin(interpolated);
    const variationsAvailable = this.spintax.getCombinationsCount(templateConfig.template);

    return {
      templateId: templateConfig.id,
      language: templateConfig.language,
      purpose: templateConfig.purpose,
      messageText,
      variationsAvailable,
    };
  }

  /**
   * Get available templates list
   */
  listTemplates() {
    return Object.values(OUTREACH_TEMPLATES);
  }
}

export default new DynamicOutreachTemplateEngine();
