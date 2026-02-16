/**
 * ============================================
 * ADVANCED ENTITY EXTRACTOR (Phase 17)
 * ============================================
 * 
 * Extracts phone numbers, currencies, dates, locations, and properties
 * from WhatsApp messages with confidence scoring.
 * 
 * Uses:
 * - libphonenumber-js for international phone validation
 * - date-fns for date parsing
 * - Custom regex for properties and currencies
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { parse as parseDate, isValid as isValidDate } from 'date-fns';

export class AdvancedEntityExtractor {
  constructor() {
    this.propertyKeywords = [
      'villa', 'apartment', 'apt', 'studio', '1br', '1 br', '2br', '2 br', 
      '3br', '3 br', '4br', '4 br', '5br', '5 br', 'penthouse', 'townhouse',
      'unit', 'plot', 'duplex', 'flat'
    ];
    
    this.projectNames = [
      'akoya', 'damac', 'emaar', 'beachfront', 'creek harbour', 
      'creek harbor', 'wasl', 'jumeirah', 'downtown', 'marina', 'deira',
      'souk al bahar', 'arabian ranches', 'emirates living', 'hills'
    ];
    
    this.currencyCodes = {
      'aed': 'AED', 'uae': 'AED', 'dhs': 'AED',
      'usd': 'USD', '$': 'USD',
      'eur': 'EUR', '€': 'EUR',
      'gbp': 'GBP', '£': 'GBP',
    };
  }

  /**
   * Extract all entities from message text
   */
  extractAll(text, phoneNumber = null) {
    if (!text || typeof text !== 'string') {
      return {
        phones: [],
        urls: [],
        emails: [],
        dates: [],
        currencies: [],
        properties: [],
        success: false,
      };
    }

    try {
      return {
        phones: this.extractPhones(text),
        urls: this.extractUrls(text),
        emails: this.extractEmails(text),
        dates: this.extractDates(text),
        currencies: this.extractCurrencies(text),
        properties: this.extractProperties(text),
        success: true,
      };
    } catch (error) {
      console.error('❌ Entity extraction error:', error.message);
      return {
        phones: [],
        urls: [],
        emails: [],
        dates: [],
        currencies: [],
        properties: [],
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract and validate phone numbers
   */
  extractPhones(text) {
    try {
      const results = [];
      
      // International format: +971501234567
      const intlRegex = /\+\d{1,3}\d{6,14}/g;
      const intlMatches = text.matchAll(intlRegex);
      
      for (const match of intlMatches) {
        try {
          const phoneNumber = parsePhoneNumber(match[0], 'US');
          if (phoneNumber && phoneNumber.isValid()) {
            results.push({
              value: phoneNumber.formatInternational(),
              raw: match[0],
              format: 'international',
              countryCode: phoneNumber.country,
              confidence: 0.95,
            });
          }
        } catch (e) {
          // Invalid phone, skip
        }
      }
      
      // Local UAE format: 50 123 4567 or 0501234567
      const localRegex = /(?:0|00971|\+971)?[\s-]?(50|51|52|54|55|56)\s?(\d{3})\s?(\d{4})/gi;
      const localMatches = text.matchAll(localRegex);
      
      for (const match of localMatches) {
        try {
          const phone = `+971${match[2]}${match[3]}${match[4]}`;
          const phoneNumber = parsePhoneNumber(phone, 'AE');
          if (phoneNumber && phoneNumber.isValid()) {
            results.push({
              value: phoneNumber.formatInternational(),
              raw: match[0],
              format: 'local',
              countryCode: 'AE',
              confidence: 0.9,
            });
          }
        } catch (e) {
          // Invalid phone, skip
        }
      }
      
      // Remove duplicates based on value
      return Array.from(new Map(results.map(r => [r.value, r])).values());
    } catch (error) {
      console.warn('⚠️ Phone extraction error:', error.message);
      return [];
    }
  }

  /**
   * Extract URLs
   */
  extractUrls(text) {
    try {
      const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
      const matches = text.matchAll(urlRegex);
      const results = [];
      
      for (const match of matches) {
        const url = match[0];
        try {
          const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
          results.push({
            value: url,
            domain: urlObj.hostname,
            protocol: urlObj.protocol,
            confidence: 0.95,
          });
        } catch (e) {
          // Invalid URL, skip
        }
      }
      
      return results;
    } catch (error) {
      console.warn('⚠️ URL extraction error:', error.message);
      return [];
    }
  }

  /**
   * Extract email addresses
   */
  extractEmails(text) {
    try {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = text.matchAll(emailRegex);
      const results = [];
      
      for (const match of matches) {
        const email = match[0];
        // Basic validation: check for double dots or invalid patterns
        if (!/\.{2,}|^[\.]|[\.]$/.test(email)) {
          results.push({
            value: email,
            domain: email.split('@')[1],
            confidence: 0.9,
          });
        }
      }
      
      return Array.from(new Map(results.map(r => [r.value, r])).values());
    } catch (error) {
      console.warn('⚠️ Email extraction error:', error.message);
      return [];
    }
  }

  /**
   * Extract dates
   */
  extractDates(text) {
    try {
      const results = [];
      
      // ISO format: 2026-02-16, 2026/02/16
      const isoRegex = /(\d{4}[-\/]\d{2}[-\/]\d{2})/g;
      for (const match of text.matchAll(isoRegex)) {
        try {
          const dateStr = match[1].replace(/\//g, '-');
          const date = new Date(dateStr);
          if (isValidDate(date)) {
            results.push({
              value: match[1],
              normalizedDate: date.toISOString(),
              format: 'ISO',
              confidence: 0.95,
            });
          }
        } catch (e) {
          // Invalid date
        }
      }
      
      // Common formats: 15/2/2026, 15-02-2026
      const commonRegex = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/g;
      for (const match of text.matchAll(commonRegex)) {
        try {
          const day = parseInt(match[1]);
          const month = parseInt(match[2]);
          const year = match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3]);
          
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const date = new Date(year, month - 1, day);
            if (isValidDate(date)) {
              results.push({
                value: match[0],
                normalizedDate: date.toISOString(),
                format: 'DD/MM/YYYY',
                confidence: 0.85,
              });
            }
          }
        } catch (e) {
          // Invalid date
        }
      }
      
      // Natural language: "next week", "tomorrow", "next month"
      const naturalRegex = /\b(today|tomorrow|next\s+(week|month|day)|end\s+of\s+\w+)\b/gi;
      for (const match of text.matchAll(naturalRegex)) {
        results.push({
          value: match[0],
          normalizedDate: null,  // Would need NLP to parse
          format: 'natural',
          confidence: 0.5,
        });
      }
      
      return results;
    } catch (error) {
      console.warn('⚠️ Date extraction error:', error.message);
      return [];
    }
  }

  /**
   * Extract currency amounts
   */
  extractCurrencies(text) {
    try {
      const results = [];
      
      // Format: AED 100,000 or 100,000 AED or $100,000
      const currencyRegex = /(\$|aed|usd|eur|gbp)?\s*(\d{1,3}(?:[,\s]\d{3})*|\d+)\s*(aed|usd|eur|gbp)?/gi;
      
      for (const match of text.matchAll(currencyRegex)) {
        const currencyPre = match[1];
        const amount = match[2].replace(/[,\s]/g, '');
        const currencyPost = match[3];
        
        const currency = this.currencyCodes[
          (currencyPre || currencyPost || 'aed').toLowerCase()
        ] || 'AED';
        
        const numAmount = parseInt(amount);
        if (!isNaN(numAmount) && numAmount > 0 && numAmount < 1000000000) {
          results.push({
            value: numAmount,
            currency,
            raw: match[0],
            confidence: 0.9,
          });
        }
      }
      
      return results;
    } catch (error) {
      console.warn('⚠️ Currency extraction error:', error.message);
      return [];
    }
  }

  /**
   * Extract property references
   */
  extractProperties(text) {
    try {
      const results = [];
      const lowerText = text.toLowerCase();
      
      // Find property types
      for (const propType of this.propertyKeywords) {
        if (lowerText.includes(propType)) {
          // Look for unit numbers near property type
          const regex = new RegExp(
            `(${propType})\\s+(?:no\\.?|#|unit)?\\s*([a-z0-9\\-]+)?`,
            'gi'
          );
          
          for (const match of text.matchAll(regex)) {
            results.push({
              type: match[1].toLowerCase(),
              unit: match[2] || null,
              project: this.extractProject(text),
              confidence: 0.85,
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.warn('⚠️ Property extraction error:', error.message);
      return [];
    }
  }

  /**
   * Extract project name from text
   */
  extractProject(text) {
    try {
      const lowerText = text.toLowerCase();
      
      for (const project of this.projectNames) {
        if (lowerText.includes(project)) {
          return project.charAt(0).toUpperCase() + project.slice(1);
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get extraction confidence score
   */
  getConfidenceScore(extractionResult) {
    try {
      const scores = [
        extractionResult.phones.reduce((sum, p) => sum + p.confidence, 0) / Math.max(extractionResult.phones.length, 1),
        extractionResult.emails.reduce((sum, e) => sum + e.confidence, 0) / Math.max(extractionResult.emails.length, 1),
        extractionResult.urls.reduce((sum, u) => sum + u.confidence, 0) / Math.max(extractionResult.urls.length, 1),
      ];
      
      return scores.filter(s => s > 0).length > 0 
        ? scores.filter(s => s > 0).reduce((a, b) => a + b, 0) / scores.filter(s => s > 0).length
        : 0;
    } catch (error) {
      return 0;
    }
  }
}

// Export singleton
export const advancedEntityExtractor = new AdvancedEntityExtractor();
