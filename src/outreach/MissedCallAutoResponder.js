/**
 * MissedCallAutoResponder.js
 * 
 * Single responsibility: Generate instant polite WhatsApp replies when a voice/video call is missed.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const DEFAULT_MISSED_CALL_TEMPLATE =
  "Hello! I noticed I missed your call. I am currently attending to client inquiries. How may I assist you with Dubai properties today?";

export class MissedCallAutoResponder {
  constructor({ defaultTemplate = DEFAULT_MISSED_CALL_TEMPLATE, cooldownMs = 300000 } = {}) { // 5m cooldown
    this.template = defaultTemplate;
    this.cooldownMs = cooldownMs;
    /** @type {Map<string, number>} */
    this.lastDispatched = new Map();
  }

  shouldRespondToCall(callerJid, now = Date.now()) {
    if (!callerJid) throw new Error('callerJid is required');
    const last = this.lastDispatched.get(callerJid) || 0;
    return (now - last) >= this.cooldownMs;
  }

  generateMissedCallReply(callerJid, { leadName = null, language = 'en' } = {}) {
    this.lastDispatched.set(callerJid, Date.now());

    if (language === 'ar') {
      return "مرحباً! لاحظت اتصالكم الفائت. أنا حالياً في خدمة عملاء آخرين، كيف يمكنني مساعدتكم بخصوص عقارات دبي؟";
    }

    const greeting = leadName ? `Hello ${leadName}!` : "Hello!";
    return `${greeting} I noticed I missed your call. I am currently attending to client viewings. How may I assist you with your property inquiry today?`;
  }
}

export default new MissedCallAutoResponder();

