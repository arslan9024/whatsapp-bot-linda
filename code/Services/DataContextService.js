/**
 * Data Context Service
 * 
 * Loads organized sheet data into memory and provides fast lookup
 * for bot message processing. Enables context-aware responses using
 * code references and fuzzy matching.
 */

import { SheetsService } from '../Integration/Google/services/SheetsService.js';
import { CodeReferenceSystem } from './CodeReferenceSystem.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('DataContextService');

class DataContextService {
  constructor(sheetsService = null) {
    this.sheetsService = sheetsService || new SheetsService();
    this.codeReferenceSystem = new CodeReferenceSystem();
    this.isLoaded = false;
    this.lastLoadTime = null;
    this.stats = {
      totalRecords: 0,
      recordsByType: {},
      loadTime: 0
    };
  }

  /**
   * Load all organized sheet data into memory
   */
  async loadContext(organizerSheetId, cacheExpiry = 3600000) { // 1 hour default
    try {
      logger.info(`📂 Loading data context from sheet ${organizerSheetId}...`);
      const startTime = Date.now();

      // Load Master Data tab
      const masterData = await this.sheetsService.getValues(organizerSheetId, "'Master Data'!A1:Z1000");
      
      if (!masterData || masterData.length < 2) {
        throw new Error('Master Data tab is empty or missing');
      }

      // Parse headers (first row)
      const headers = masterData[0];
      const codeIndex = headers.indexOf('Code');
      const typeIndex = headers.indexOf('Type');

      if (codeIndex === -1) {
        throw new Error('Code column not found in Master Data');
      }

      // Parse data rows
      const records = [];
      for (let i = 1; i < masterData.length; i++) {
        const row = masterData[i];
        const record = {};

        headers.forEach((header, idx) => {
          record[header] = row[idx] || '';
        });

        if (record.Code) {
          records.push(record);
        }
      }

      // Load into code reference system
      this.codeReferenceSystem.loadFromRecords(records);

      // Calculate stats
      const stats = this.codeReferenceSystem.getCodeStatistics();
      this.stats = {
        totalRecords: stats.totalCodes,
        recordsByType: stats.byType,
        loadTime: Date.now() - startTime,
        cacheExpiry: cacheExpiry,
        lastLoaded: new Date().toISOString()
      };

      this.isLoaded = true;
      this.lastLoadTime = Date.now();

      logger.info(`✅ Loaded ${this.stats.totalRecords} records in ${this.stats.loadTime}ms`);
      logger.info(`   Properties: ${stats.byType.properties}`);
      logger.info(`   Contacts: ${stats.byType.contacts}`);
      logger.info(`   Financials: ${stats.byType.financials}`);
      logger.info(`   Others: ${stats.byType.others}`);

      return { success: true, stats: this.stats };
    } catch (error) {
      logger.error(`Failed to load context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(maxAgeMs = 3600000) {
    if (!this.isLoaded || !this.lastLoadTime) return false;
    return (Date.now() - this.lastLoadTime) < maxAgeMs;
  }

  /**
   * Get record by code
   */
  getByCode(code) {
    if (!this.isLoaded) {
      logger.warn('Data context not loaded. Call loadContext() first.');
      return null;
    }

    const record = this.codeReferenceSystem.lookupByCode(code);
    
    if (record) {
      logger.debug(`Found record for code ${code}`);
      return this._enrichRecord(record);
    }

    return null;
  }

  /**
   * Search records by field and value
   */
  searchByField(fieldName, value, exactMatch = false) {
    if (!this.isLoaded) return [];

    const results = this.codeReferenceSystem.searchByValue(fieldName, value, exactMatch);
    
    logger.debug(`Found ${results.length} records matching ${fieldName}=${value}`);
    
    return results.map(hit => ({
      code: hit.code,
      record: this._enrichRecord(hit.record),
      relevance: this._calculateRelevance(hit.record, fieldName, value)
    }));
  }

  /**
   * Search records by partial code
   */
  searchByCodePrefix(codePrefix) {
    if (!this.isLoaded) return [];

    const results = this.codeReferenceSystem.searchByCode(codePrefix);
    
    logger.debug(`Found ${results.length} records matching code prefix ${codePrefix}`);
    
    return results.map(hit => ({
      code: hit.code,
      record: this._enrichRecord(hit.record)
    }));
  }

  /**
   * Get all records of a specific type
   */
  getByType(type) {
    if (!this.isLoaded) return [];

    const codes = this.codeReferenceSystem.getCodesByType(type);
    const records = [];

    codes.forEach(code => {
      const record = this.codeReferenceSystem.lookupByCode(code);
      if (record) {
        records.push({
          code,
          record: this._enrichRecord(record)
        });
      }
    });

    logger.debug(`Retrieved ${records.length} records of type ${type}`);
    return records;
  }

  /**
   * Fuzzy search by multiple possible matches
   * Useful for extracting context from user messages
   */
  fuzzySearch(searchTerms = {}) {
    if (!this.isLoaded) return { matches: [], confidence: 0 };

    const results = [];
    let bestMatch = null;
    let bestScore = 0;

    // Try each search term
    for (const [field, value] of Object.entries(searchTerms)) {
      if (!value) continue;

      const matches = this.searchByField(field, value, false);

      matches.forEach(match => {
        const score = match.relevance || 0;
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = match;
        }

        if (score > 0.5) {
          results.push(match);
        }
      });
    }

    // Remove duplicates
    const unique = new Map();
    results.forEach(result => {
      if (!unique.has(result.code)) {
        unique.set(result.code, result);
      }
    });

    return {
      matches: Array.from(unique.values()),
      bestMatch,
      confidence: bestScore,
      searchTerms
    };
  }

  /**
   * Extract context from message for AI/bot use
   * 
   * Example: User says "what about P00001?"
   * Returns: { code: "P00001", record: {...}, type: "PROPERTY" }
   */
  extractContext(messageText) {
    const context = {
      codes: [],
      contacts: [],
      properties: [],
      financials: [],
      allMatches: [],
      extractedAt: new Date().toISOString()
    };

    if (!this.isLoaded) return context;

    // Extract codes (P00001, C00002, etc.)
    const codePattern = /[PCF]O?\d{5}/gi;
    const codeMatches = messageText.match(codePattern) || [];

    codeMatches.forEach(code => {
      const record = this.getByCode(code.toUpperCase());
      if (record) {
        context.codes.push({ code: code.toUpperCase(), record });
        context.allMatches.push({ type: 'CODE', code, record });
      }
    });

    // Extract phone numbers
    const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
    const phoneMatches = messageText.match(phonePattern) || [];

    phoneMatches.forEach(phone => {
      const matches = this.searchByField('Phone', phone.trim(), false);
      matches.forEach(match => {
        context.contacts.push(match);
        context.allMatches.push({ type: 'PHONE', value: phone, ...match });
      });
    });

    // Extract potential unit numbers (up to 4 digits)
    const unitPattern = /unit\s*#?(\d{3,4})/gi;
    const unitMatches = messageText.matchAll(unitPattern) || [];

    for (const match of unitMatches) {
      const unitNum = match[1];
      const records = this.searchByField('Unit', unitNum, false);
      records.forEach(record => {
        context.properties.push(record);
        context.allMatches.push({ type: 'UNIT', value: unitNum, ...record });
      });
    }

    logger.debug(`Extracted context: ${context.codes.length} codes, ${context.contacts.length} contacts, ${context.properties.length} properties`);

    return context;
  }

  /**
   * Build rich context object for message handler
   */
  buildMessageContext(messageText) {
    const extracted = this.extractContext(messageText);

    return {
      message: messageText,
      extracted,
      hasRecords: extracted.allMatches.length > 0,
      recordCount: extracted.allMatches.length,
      primaryRecord: extracted.allMatches.length > 0 ? extracted.allMatches[0] : null,
      allRecords: extracted.allMatches,
      
      // Helper methods for message handlers
      getProperty: () => extracted.properties[0]?.record || null,
      getContact: () => extracted.contacts[0]?.record || null,
      getByCode: (code) => extracted.codes.find(c => c.code === code)?.record || null,
      
      metadata: {
        extractedAt: extracted.extractedAt,
        contextService: this.constructor.name,
        dataContextLoaded: this.isLoaded
      }
    };
  }

  /**
   * Enrich record with additional context information
   */
  _enrichRecord(record) {
    return {
      ...record,
      _metadata: {
        code: record._code,
        type: record._type,
        importDate: record.Import_Date,
        dataQuality: record._deduplicationStats?.dataQualityScore || 0,
        enrichedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Calculate relevance score for a match
   */
  _calculateRelevance(record, fieldName, value) {
    const fieldValue = record[fieldName];
    if (!fieldValue) return 0;

    const searchStr = String(value).toLowerCase();
    const fieldStr = String(fieldValue).toLowerCase();

    if (fieldStr === searchStr) return 1.0; // Exact match
    if (fieldStr.includes(searchStr)) return 0.8; // Contains
    
    // Levenshtein-like simple distance
    const distance = Math.abs(fieldStr.length - searchStr.length);
    return Math.max(0, 1 - (distance / Math.max(fieldStr.length, searchStr.length)));
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      isLoaded: this.isLoaded,
      ...this.stats,
      cacheAge: this.lastLoadTime ? Date.now() - this.lastLoadTime : null,
      codeReferenceStats: this.codeReferenceSystem.getCodeStatistics()
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.codeReferenceSystem.clear();
    this.isLoaded = false;
    this.lastLoadTime = null;
    logger.info('✅ Data context cache cleared');
  }

  /**
   * Reload context if cache is stale
   */
  async reloadIfStale(organizerSheetId, maxAgeMs = 3600000) {
    if (!this.isCacheValid(maxAgeMs)) {
      logger.info('Cache is stale. Reloading...');
      await this.loadContext(organizerSheetId, maxAgeMs);
    }
    return this.stats;
  }
}

export { DataContextService };
