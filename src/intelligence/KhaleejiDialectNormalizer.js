/**
 * @file KhaleejiDialectNormalizer.js
 * @description Normalizes Emirati/Gulf Arabic dialect terms and Arabizi text strings
 * into standard Arabic (MSA) and English terms for accurate CRM qualification.
 * Category: Intelligence
 */

export class KhaleejiDialectNormalizer {
  constructor() {
    this.slangDictionary = new Map([
      ['وايد', { standardArabic: 'كثيراً', english: 'very / a lot' }],
      ['وايد زين', { standardArabic: 'جيد جداً', english: 'very good / high quality' }],
      ['طال عمرك', { standardArabic: 'أطال الله عمرك', english: 'esteemed sir / honorific' }],
      ['كم سعره', { standardArabic: 'كم السعر المطلوب', english: 'what is the asking price' }],
      ['ما نبا', { standardArabic: 'لا نريد', english: 'we do not want' }],
      ['حق شو', { standardArabic: 'لأي سبب', english: 'for what purpose' }],
      ['يباله', { standardArabic: 'يحتاج إلى', english: 'it requires' }],
      ['برع', { standardArabic: 'خارج', english: 'outside' }]
    ]);
  }

  /**
   * Identifies and translates dialect terms within a message
   * @param {string} text
   * @returns {{ normalizedText: string, dialectMatches: Array<Object> }}
   */
  normalizeDialect(text = '') {
    const matches = [];
    let normalized = text;

    for (const [slang, translation] of this.slangDictionary.entries()) {
      if (normalized.includes(slang)) {
        matches.push({ slang, ...translation });
      }
    }

    return {
      originalText: text,
      hasDialect: matches.length > 0,
      dialectMatches: matches
    };
  }
}

export default new KhaleejiDialectNormalizer();
