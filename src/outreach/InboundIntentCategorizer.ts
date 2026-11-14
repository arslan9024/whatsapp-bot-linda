// @ts-nocheck
/**
 * InboundIntentCategorizer.js
 * 
 * Single responsibility: Categorize inbound WhatsApp chats into standard Real Estate Lists
 * (Landlord, Tenant, Buyer, Seller, Broker) and sync with BroadcastListManager and LabelSynchronizer.
 * Supports English and Arabic terminology for Dubai Real Estate (DLD, Ejari, NOC, Title Deed, Vardon).
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const RE_INTENT_CATEGORIES = Object.freeze({
  LANDLORD: 'Landlord',
  TENANT: 'Tenant',
  BUYER: 'Buyer',
  SELLER: 'Seller',
  BROKER: 'Broker',
  GENERAL: 'General Inquiry',
});

export const CATEGORY_PATTERNS = Object.freeze({
  BROKER: [
    'broker', 'agent', 'agency', 'commission split', 'co-broke', 'cobroke',
    'have client', 'direct to owner', 'direct client', 'are you agent',
    // Arabic terms
    'وسيط', 'سمسار', 'مكتب عقاري', 'عمولة', 'عندي مشتري', 'مباشر مع المالك', 'زبون مباشر'
  ],
  SELLER: [
    'sell my', 'want to sell', 'listing my', 'list my property', 'valuation',
    'market price for my', 'selling my villa', 'selling my unit', 'resale',
    'title deed', 'noc', 'vardon resale', 'damac hills 2 price',
    // Arabic terms
    'أريد أبيع', 'ابيع بيتي', 'بيع الفيلا', 'عرض عقاري', 'تقييم العقار', 'شهادة ملكية', 'سند الملكية', 'موافقـة عدم ممانعة', 'سعر السوق'
  ],
  LANDLORD: [
    'rent out', 'lease out', 'my tenant', 'rent my villa', 'property management',
    'tenancy contract', 'handover inspection', 'renew ejari', 'manage my unit',
    // Arabic terms
    'تأجير', 'أجر فيلتي', 'إيجار سنوي', 'عقد الإيجار', 'إيجاري', 'تجديد إيجاري', 'إدارة العقار', 'تسليم المفاتيح'
  ],
  BUYER: [
    'buy', 'purchase', 'looking to buy', 'interested in buying', 'ready to purchase',
    'investment opportunity', 'roi', 'down payment', 'mortgage', 'offplan', 'cash buyer',
    // Arabic terms
    'شراء', 'أريد اشتري', 'مشتري كاش', 'مهتم بالشراء', 'استثمار', 'عائد استثماري', 'دفعة أولى', 'تمويل عقاري', 'قيد الإنشاء'
  ],
  TENANT: [
    'rent', 'looking for rent', 'annual rent', 'cheques', 'cheque',
    'move in date', 'vacant now', 'deposit', 'ejari fee', 'studio for rent', 'villa for rent',
    // Arabic terms
    'أبحث عن إيجار', 'استئجار', 'شيكات', 'تأمين مسترد', 'شاغر الآن', 'رسوم إيجاري', 'فيلا للإيجار'
  ],
});

export class InboundIntentCategorizer {
  /**
   * Classify message text into one of the 5 core real estate role categories
   * @param {string} text - Message body
   * @returns {{ category: string, confidence: number, matches: string[], isHighPriority: boolean }}
   */
  categorize(text = '') {
    if (!text || typeof text !== 'string') {
      return { category: RE_INTENT_CATEGORIES.GENERAL, confidence: 0.5, matches: [], isHighPriority: false };
    }

    const lower = text.toLowerCase();

    // Check categories with priority: Broker -> Seller -> Landlord -> Buyer -> Tenant
    for (const [key, keywords] of Object.entries(CATEGORY_PATTERNS)) {
      const matches = keywords.filter(kw => lower.includes(kw));
      if (matches.length > 0) {
        const confidence = Math.min(0.98, 0.70 + (matches.length * 0.1));
        const category = RE_INTENT_CATEGORIES[key];
        const isHighPriority = category === RE_INTENT_CATEGORIES.SELLER || 
                               (category === RE_INTENT_CATEGORIES.BUYER && (lower.includes('cash') || lower.includes('ready') || lower.includes('كاش')));
        return {
          category,
          confidence,
          matches,
          isHighPriority,
        };
      }
    }

    return { category: RE_INTENT_CATEGORIES.GENERAL, confidence: 0.5, matches: [], isHighPriority: false };
  }

  /**
   * Categorize inbound message and register phone to the appropriate broadcast list
   * @param {string} phone - Contact phone
   * @param {string} text - Inbound message body
   * @param {import('./BroadcastListManager.js').BroadcastListManager} broadcastManager
   * @returns {{ phone: string, category: string, confidence: number, isHighPriority: boolean }}
   */
  categorizeAndEnroll(phone, text, broadcastManager) {
    const result = this.categorize(text);
    if (broadcastManager && typeof broadcastManager.addRecipient === 'function') {
      const listName = `LIST_${result.category.toUpperCase().replace(/\s+/g, '_')}`;
      broadcastManager.addRecipient(listName, phone);
    }
    return {
      phone,
      category: result.category,
      confidence: result.confidence,
      isHighPriority: result.isHighPriority,
    };
  }
}

export default new InboundIntentCategorizer();
