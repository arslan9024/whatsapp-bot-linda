import { Logger } from '../Utils/Logger.js';

const logger = new Logger('CodeReferenceSystem');

class CodeReferenceSystem {
  constructor() {
    this.codeMap = new Map(); // code -> record
    this.reverseMap = new Map(); // recordKey -> code
    this.countersByType = {
      'PROPERTY': 0,
      'CONTACT': 0,
      'FINANCIAL': 0,
      'OTHER': 0
    };
    this.typeDetectionRules = this.initializeTypeDetectionRules();
  }

  /**
   * Initialize type detection rules
   */
  initializeTypeDetectionRules() {
    return {
      PROPERTY: (record) => {
        const keys = Object.keys(record).map(k => k.toLowerCase());
        return keys.some(k => 
          k.includes('property') || k.includes('project') || k.includes('unit') || k.includes('apt')
        );
      },
      CONTACT: (record) => {
        const keys = Object.keys(record).map(k => k.toLowerCase());
        return keys.some(k => 
          k.includes('phone') || k.includes('email') || k.includes('contact') || k.includes('name')
        );
      },
      FINANCIAL: (record) => {
        const keys = Object.keys(record).map(k => k.toLowerCase());
        return keys.some(k => 
          k.includes('price') || k.includes('amount') || k.includes('payment') || k.includes('cost')
        );
      }
    };
  }

  /**
   * Detect record type from content
   */
  detectRecordType(record) {
    for (const [type, rule] of Object.entries(this.typeDetectionRules)) {
      if (rule(record)) {
        return type;
      }
    }
    return 'OTHER';
  }

  /**
   * Generate unique code for a record
   */
  generateCode(recordType) {
    if (!this.countersByType.hasOwnProperty(recordType)) {
      recordType = 'OTHER';
    }

    this.countersByType[recordType]++;
    const counter = String(this.countersByType[recordType]).padStart(5, '0');
    const code = `${recordType.substring(0, 1)}${counter}`; // P00001, C00001, etc.

    return code;
  }

  /**
   * Assign codes to all deduplicated records
   */
  assignCodes(deduplicatedRecords) {
    logger.info(`🔢 Assigning unique codes to ${deduplicatedRecords.length} records...`);

    const codedRecords = deduplicatedRecords.map((record) => {
      const recordType = this.detectRecordType(record);
      const code = this.generateCode(recordType);
      
      const recordKey = this.createRecordKey(record);
      
      this.codeMap.set(code, { ...record, _code: code, _type: recordType });
      this.reverseMap.set(recordKey, code);

      return {
        ...record,
        _code: code,
        _type: recordType
      };
    });

    logger.info(`✅ Assigned ${codedRecords.length} codes`);
    logger.info(`📊 Code breakdown:\n` +
      `   Properties: P00001-P${String(this.countersByType['PROPERTY']).padStart(5, '0')}\n` +
      `   Contacts: C00001-C${String(this.countersByType['CONTACT']).padStart(5, '0')}\n` +
      `   Financials: F00001-F${String(this.countersByType['FINANCIAL']).padStart(5, '0')}\n` +
      `   Others: O00001-O${String(this.countersByType['OTHER']).padStart(5, '0')}\n`
    );

    return codedRecords;
  }

  /**
   * Lookup record by code
   */
  lookupByCode(code) {
    return this.codeMap.get(code) || null;
  }

  /**
   * Lookup code by record
   */
  lookupCodeByRecord(record) {
    const key = this.createRecordKey(record);
    return this.reverseMap.get(key) || null;
  }

  /**
   * Get all codes of a specific type
   */
  getCodesByType(type) {
    const codes = [];
    for (const [code, record] of this.codeMap.entries()) {
      if (record._type === type) {
        codes.push(code);
      }
    }
    return codes;
  }

  /**
   * Search records by code or partial code
   */
  searchByCode(searchTerm) {
    const results = [];
    const term = searchTerm.toUpperCase();

    for (const [code, record] of this.codeMap.entries()) {
      if (code.includes(term) || code.startsWith(term)) {
        results.push({ code, record });
      }
    }

    return results;
  }

  /**
   * Search records by any field value
   */
  searchByValue(fieldName, value, exactMatch = true) {
    const results = [];
    const searchValue = exactMatch ? value : String(value).toLowerCase();

    for (const [code, record] of this.codeMap.entries()) {
      const fieldValue = record[fieldName];
      
      if (exactMatch) {
        if (fieldValue === value) {
          results.push({ code, record });
        }
      } else {
        if (String(fieldValue).toLowerCase().includes(searchValue)) {
          results.push({ code, record });
        }
      }
    }

    return results;
  }

  /**
   * Create compact key for record (for reverse lookup)
   */
  createRecordKey(record) {
    const phone = record._normalizedFields?.phone || record.Phone || record.phone || '';
    const email = record._normalizedFields?.email || record.Email || record.email || '';
    const name = record._normalizedFields?.name || record.Name || record.name || '';
    
    return `${phone}|${email}|${name}`;
  }

  /**
   * Export code reference map as structured data
   */
  exportCodeReferenceMap() {
    const map = [];

    for (const [code, record] of this.codeMap.entries()) {
      map.push({
        Code: code,
        Type: record._type,
        Name: record._normalizedFields?.name || record.Name || record.name || 'N/A',
        Phone: record._normalizedFields?.phone || record.Phone || record.phone || 'N/A',
        Email: record._normalizedFields?.email || record.Email || record.email || 'N/A',
        Property: record._normalizedFields?.property || record.Property || record.property || 'N/A',
        Unit: record._normalizedFields?.unit || record.Unit || record.unit || 'N/A',
        DataQuality: record._deduplicationStats?.dataQualityScore || 0,
        ImportDate: record.Import_Date || new Date().toISOString()
      });
    }

    return map;
  }

  /**
   * Get statistics about assigned codes
   */
  getCodeStatistics() {
    return {
      totalCodes: this.codeMap.size,
      byType: {
        properties: this.getCodesByType('PROPERTY').length,
        contacts: this.getCodesByType('CONTACT').length,
        financials: this.getCodesByType('FINANCIAL').length,
        others: this.getCodesByType('OTHER').length
      },
      counters: this.countersByType,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Export stats for use in sheets
   */
  exportStatsForSheet() {
    const stats = this.getCodeStatistics();
    return [
      ['Code Reference Map Statistics', new Date().toISOString()],
      [],
      ['Total Records', stats.totalCodes],
      ['Properties (P)', stats.byType.properties],
      ['Contacts (C)', stats.byType.contacts],
      ['Financials (F)', stats.byType.financials],
      ['Others (O)', stats.byType.others],
      []
    ];
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.codeMap.clear();
    this.reverseMap.clear();
    this.countersByType = {
      'PROPERTY': 0,
      'CONTACT': 0,
      'FINANCIAL': 0,
      'OTHER': 0
    };
    logger.info('✅ Code reference system cleared');
  }

  /**
   * Load existing code map from array of records
   */
  loadFromRecords(records) {
    logger.info(`📂 Loading ${records.length} records with existing codes...`);

    records.forEach(record => {
      const code = record._code;
      const type = record._type || this.detectRecordType(record);

      if (code) {
        this.codeMap.set(code, record);
        const recordKey = this.createRecordKey(record);
        this.reverseMap.set(recordKey, code);

        // Update counters
        const prefix = code.charAt(0);
        const typeMap = { 'P': 'PROPERTY', 'C': 'CONTACT', 'F': 'FINANCIAL', 'O': 'OTHER' };
        const recordType = typeMap[prefix] || 'OTHER';
        
        const counter = parseInt(code.substring(1));
        if (counter > this.countersByType[recordType]) {
          this.countersByType[recordType] = counter;
        }
      }
    });

    logger.info(`✅ Loaded ${this.codeMap.size} records into code reference system`);
  }
}

export { CodeReferenceSystem };
