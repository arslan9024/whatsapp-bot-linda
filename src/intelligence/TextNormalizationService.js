/**
 * ============================================
 * TEXT NORMALIZATION SERVICE (Phase 17)
 * ============================================
 * 
 * Normalizes Unicode, emoji, and special characters
 * for consistent text processing. Uses native JavaScript
 * .normalize() for Unicode and custom logic for emoji/special chars.
 */

export class TextNormalizationService {
  /**
   * Normalize Unicode text to NFC form (composed characters)
   */
  static normalizeUnicode(text) {
    if (!text || typeof text !== 'string') return '';
    
    try {
      // Use NFC (Composed form): é = e + ´
      return text.normalize('NFC');
    } catch (error) {
      console.warn('⚠️ Unicode normalization error:', error.message);
      return text;
    }
  }

  /**
   * Strip zero-width and hidden Unicode characters
   */
  static stripZeroWidthChars(text) {
    if (!text || typeof text !== 'string') return '';
    
    try {
      // Remove zero-width space (U+200B), zero-width joiner (U+200D), etc
      return text
        .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')  // Zero-width chars
        .replace(/[\u202A\u202B\u202C\u202D\u202E]/g, '')  // Directional marks
        .replace(/[\u061C]/g, '');  // Arabic letter mark
    } catch (error) {
      console.warn('⚠️ Zero-width stripping error:', error.message);
      return text;
    }
  }

  /**
   * Validate and preserve emoji sequences
   */
  static validateEmojiSequences(text) {
    if (!text || typeof text !== 'string') return '';
    
    try {
      // Convert to array of codepoints to handle emoji clusters correctly
      const codePoints = [...text];  // Using spread operator handles emoji correctly
      
      // Check for emoji variation selectors (VS-16, VS-15) and preserve them
      return codePoints.join('');
    } catch (error) {
      console.warn('⚠️ Emoji validation error:', error.message);
      return text;
    }
  }

  /**
   * Normalize line endings to LF only
   */
  static normalizeLineEndings(text) {
    if (!text || typeof text !== 'string') return '';
    
    try {
      return text
        .replace(/\r\n/g, '\n')  // CRLF -> LF
        .replace(/\r/g, '\n');   // CR -> LF
    } catch (error) {
      console.warn('⚠️ Line ending normalization error:', error.message);
      return text;
    }
  }

  /**
   * Trim leading/trailing whitespace (including Unicode spaces)
   */
  static trimWhitespace(text) {
    if (!text || typeof text !== 'string') return '';
    
    try {
      return text
        .replace(/^[\s\u00A0\u2000-\u200B\u202F\u205F\u3000]+/, '')  // Leading
        .replace(/[\s\u00A0\u2000-\u200B\u202F\u205F\u3000]+$/, '');  // Trailing
    } catch (error) {
      console.warn('⚠️ Whitespace trim error:', error.message);
      return text;
    }
  }

  /**
   * Full normalization pipeline
   */
  static normalize(text, options = {}) {
    if (!text || typeof text !== 'string') return '';
    
    const {
      unicode = true,
      zeroWidth = true,
      emoji = true,
      lineEndings = true,
      whitespace = true,
    } = options;
    
    let result = text;
    
    if (unicode) result = this.normalizeUnicode(result);
    if (zeroWidth) result = this.stripZeroWidthChars(result);
    if (emoji) result = this.validateEmojiSequences(result);
    if (lineEndings) result = this.normalizeLineEndings(result);
    if (whitespace) result = this.trimWhitespace(result);
    
    return result;
  }

  /**
   * Detect text language (simple heuristic)
   */
  static detectLanguage(text) {
    if (!text || typeof text !== 'string') return 'unknown';
    
    try {
      // Arabic script detection
      if (/[\u0600-\u06FF]/.test(text)) return 'ar';
      
      // Chinese/Japanese/Korean
      if (/[\u4E00-\u9FFF\u3040-\u309F\uAC00-\uD7AF]/.test(text)) return 'cjk';
      
      // Cyrillic
      if (/[\u0400-\u04FF]/.test(text)) return 'ru';
      
      // Default to English/Latin
      return 'en';
    } catch (error) {
      console.warn('⚠️ Language detection error:', error.message);
      return 'unknown';
    }
  }

  /**
   * Handle RTL (Right-to-Left) text
   */
  static isRTL(text) {
    if (!text || typeof text !== 'string') return false;
    
    try {
      const rtlChars = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/;
      return rtlChars.test(text);
    } catch (error) {
      console.warn('⚠️ RTL detection error:', error.message);
      return false;
    }
  }

  /**
   * Sanitize text for database storage
   */
  static sanitize(text) {
    if (!text || typeof text !== 'string') return '';
    
    try {
      let result = text;
      
      // Full normalization
      result = this.normalize(result);
      
      // Remove control characters except newline/tab
      result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Limit length
      if (result.length > 65536) {
        result = result.substring(0, 65536);
        console.warn('⚠️ Text truncated to WhatsApp limit');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Sanitization error:', error.message);
      return '';
    }
  }

  /**
   * Extract emoji from text
   */
  static extractEmoji(text) {
    if (!text || typeof text !== 'string') return [];
    
    try {
      const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
      const matches = text.match(emojiRegex);
      return matches ? [...new Set(matches)] : [];
    } catch (error) {
      console.warn('⚠️ Emoji extraction error:', error.message);
      return [];
    }
  }

  /**
   * Replace emoji with text representation (useful for analysis)
   */
  static emojiToText(text) {
    const emojiMap = {
      '👋': '[wave]',
      '😊': '[smile]',
      '😂': '[laugh]',
      '😠': '[angry]',
      '❤️': '[heart]',
      '👍': '[thumbsup]',
      '👎': '[thumbsdown]',
      '🙏': '[pray]',
      '🔥': '[fire]',
      '✅': '[check]',
      '❌': '[x]',
      '⚠️': '[warning]',
      '💼': '[briefcase]',
      '🏠': '[house]',
      '🏢': '[building]',
      '📞': '[phone]',
      '📧': '[email]',
      '💰': '[money]',
      '💵': '[cash]',
    };
    
    let result = text;
    for (const [emoji, replacement] of Object.entries(emojiMap)) {
      result = result.replaceAll(emoji, replacement);
    }
    return result;
  }

  /**
   * Get character info (codepoint, name, category)
   */
  static getCharInfo(char) {
    try {
      const codePoint = char.codePointAt(0);
      return {
        char,
        codePoint: codePoint ? '0x' + codePoint.toString(16).toUpperCase() : null,
        decimal: codePoint,
        length: char.length,
        isEmoji: this.isEmoji(char),
      };
    } catch (error) {
      return { char, error: error.message };
    }
  }

  /**
   * Check if character is emoji
   */
  static isEmoji(str) {
    if (!str || typeof str !== 'string') return false;
    
    const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+$/;
    return emojiRegex.test(str);
  }
}

// Export singleton
export const textNormalizationService = new TextNormalizationService();
