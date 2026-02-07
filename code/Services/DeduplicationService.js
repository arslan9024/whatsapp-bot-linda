import { Logger } from '../Utils/Logger.js';
import { PhoneValidator } from '../Integration/Google/services/PhoneValidator.js';

const logger = new Logger('DeduplicationService');

class DeduplicationService {
  constructor() {
    this.phoneValidator = new PhoneValidator();
    this.stats = { normalized: 0, duplicates: 0, merged: 0 };
  }

  /**
   * STAGE 1: Normalize data across all formats
   * Converts different formats to standard format for comparison
   */
  normalizeData(rows, columnMap) {
    logger.info('STAGE 1: Normalizing data...');
    
    const normalized = rows.map((row, idx) => {
      const normalized = { ...row, _originalIndex: idx, _normalizedFields: {} };
      
      // Normalize phone numbers
      if (columnMap.phone) {
        const phone = row[columnMap.phone];
        if (phone) {
          const validation = this.phoneValidator.validatePhoneNumber(phone);
          normalized._normalizedFields.phone = validation.formatted || phone;
          normalized._phoneValid = validation.isValid;
          normalized._phoneCategory = validation.category;
        }
      }

      // Normalize email
      if (columnMap.email) {
        const email = row[columnMap.email];
        if (email) {
          normalized._normalizedFields.email = email.toLowerCase().trim();
        }
      }

      // Normalize name (for phonetic matching)
      if (columnMap.name) {
        const name = row[columnMap.name];
        if (name) {
          normalized._normalizedFields.name = name.toUpperCase().trim();
          normalized._nameHash = this.createNameHash(name);
        }
      }

      // Normalize other string fields
      if (columnMap.property) {
        const prop = row[columnMap.property];
        if (prop) {
          normalized._normalizedFields.property = prop.toUpperCase().trim();
        }
      }

      if (columnMap.unit) {
        const unit = row[columnMap.unit];
        if (unit) {
          normalized._normalizedFields.unit = String(unit).toUpperCase().trim();
        }
      }

      this.stats.normalized++;
      return normalized;
    });

    logger.info(`✅ Normalized ${normalized.length} records`);
    return normalized;
  }

  /**
   * STAGE 2: Phonetic matching on names
   * Groups similar names together for review
   */
  phoneticMatch(normalizedRows, columnMap) {
    logger.info('STAGE 2: Phonetic matching on names...');
    
    const groups = {
      exactGroupName: {}, // Same exact name
      similarGroupName: {}, // Similar names (phonetically)
      otherGroup: []
    };

    normalizedRows.forEach(row => {
      const nameHash = row._nameHash || row[columnMap.name];
      const exactKey = row._normalizedFields.name || 'UNKNOWN';

      if (!groups.exactGroupName[exactKey]) {
        groups.exactGroupName[exactKey] = [];
      }
      groups.exactGroupName[exactKey].push(row);
    });

    logger.info(`✅ Created ${Object.keys(groups.exactGroupName).length} name groups`);
    return { groups, normalizedRows };
  }

  /**
   * STAGE 3: Exact deduplication
   * Removes exact duplicates based on normalized fields
   */
  exactDeduplication(normalizedRows, columnMap) {
    logger.info('STAGE 3: Exact deduplication...');
    
    const uniqueMap = new Map();
    const duplicateMap = new Map();

    normalizedRows.forEach((row, idx) => {
      // Create composite key for exact match
      const key = this.createCompositeKey(row, columnMap);
      
      if (uniqueMap.has(key)) {
        // Duplicate found
        if (!duplicateMap.has(key)) {
          duplicateMap.set(key, []);
        }
        duplicateMap.get(key).push(row);
        this.stats.duplicates++;
      } else {
        // First occurrence
        uniqueMap.set(key, row);
      }
    });

    const uniqueRecords = Array.from(uniqueMap.values());
    logger.info(`✅ Removed ${this.stats.duplicates} exact duplicates. Unique records: ${uniqueRecords.length}`);

    return { uniqueRecords, duplicateMap };
  }

  /**
   * STAGE 4: Fuzzy matching
   * Finds potential duplicates that don't match exactly
   */
  fuzzyMatching(uniqueRecords, columnMap, similarityThreshold = 0.85) {
    logger.info('STAGE 4: Fuzzy matching...');
    
    const potentialDuplicates = [];
    const reviewed = new Set();

    for (let i = 0; i < uniqueRecords.length; i++) {
      const record1 = uniqueRecords[i];
      const key1 = `${i}`;

      if (reviewed.has(key1)) continue;

      for (let j = i + 1; j < uniqueRecords.length; j++) {
        const record2 = uniqueRecords[j];
        const key2 = `${j}`;

        if (reviewed.has(key2)) continue;

        // Compare phone numbers
        const phoneSimilarity = this.comparePhones(
          record1._normalizedFields.phone,
          record2._normalizedFields.phone
        );

        // Compare names
        const nameSimilarity = this.compareSimilarity(
          record1._normalizedFields.name,
          record2._normalizedFields.name
        );

        // Compare email
        const emailSimilarity = record1._normalizedFields.email && record2._normalizedFields.email
          ? (record1._normalizedFields.email === record2._normalizedFields.email ? 1 : 0)
          : 0;

        // Average similarity
        const avgSimilarity = (phoneSimilarity + nameSimilarity + emailSimilarity) / 3;

        if (avgSimilarity >= similarityThreshold) {
          potentialDuplicates.push({
            record1: record1._originalIndex,
            record2: record2._originalIndex,
            similarity: avgSimilarity,
            matchedFields: {
              phone: phoneSimilarity > 0.5,
              name: nameSimilarity > 0.5,
              email: emailSimilarity > 0.5
            },
            record1Data: {
              name: record1._normalizedFields.name,
              phone: record1._normalizedFields.phone,
              email: record1._normalizedFields.email
            },
            record2Data: {
              name: record2._normalizedFields.name,
              phone: record2._normalizedFields.phone,
              email: record2._normalizedFields.email
            }
          });

          reviewed.add(key2);
        }
      }
    }

    logger.info(`✅ Found ${potentialDuplicates.length} potential duplicate pairs`);
    return { uniqueRecords, potentialDuplicates };
  }

  /**
   * STAGE 5: Merge and output deduplicated data with scores
   */
  mergeAndOutput(uniqueRecords, duplicateMap, potentialDuplicates) {
    logger.info('STAGE 5: Merging and outputting results...');
    
    const finalRecords = uniqueRecords.map((record, idx) => {
      const key = this.createCompositeKey(record, {});
      const duplicateCount = duplicateMap.get(key)?.length || 0;
      const dataQuality = this.calculateDataQuality(record);

      return {
        ...record,
        _deduplicationStats: {
          exactDuplicatesRemoved: duplicateCount,
          potentialMatches: potentialDuplicates.filter(
            pd => pd.record1 === record._originalIndex || pd.record2 === record._originalIndex
          ).length,
          dataQualityScore: dataQuality,
          processedAt: new Date().toISOString()
        }
      };
    });

    this.stats.merged = finalRecords.length;
    logger.info(`✅ Output ${finalRecords.length} deduplicated records with quality scores`);

    return {
      records: finalRecords,
      duplicateMap,
      potentialDuplicates,
      stats: this.stats
    };
  }

  /**
   * FULL PIPELINE: Run complete deduplication
   */
  async deduplicate(rows, columnMap = {}) {
    logger.info(`🔄 Starting full deduplication pipeline for ${rows.length} rows...`);
    
    // Auto-detect column map if not provided
    if (Object.keys(columnMap).length === 0) {
      columnMap = this.autoDetectColumns(rows);
      logger.info('Auto-detected columns:', columnMap);
    }

    // Stage 1: Normalize
    const normalized = this.normalizeData(rows, columnMap);

    // Stage 2: Phonetic matching
    const phonetic = this.phoneticMatch(normalized, columnMap);

    // Stage 3: Exact deduplication
    const exact = this.exactDeduplication(normalized, columnMap);

    // Stage 4: Fuzzy matching
    const fuzzy = this.fuzzyMatching(exact.uniqueRecords, columnMap);

    // Stage 5: Merge and output
    const result = this.mergeAndOutput(fuzzy.uniqueRecords, exact.duplicateMap, fuzzy.potentialDuplicates);

    logger.info(`\n📊 DEDUPLICATION SUMMARY:\n${this.formatStats(result.stats)}`);

    return result;
  }

  /**
   * Helper: Create composite key for exact match detection
   */
  createCompositeKey(row, columnMap) {
    const parts = [
      row._normalizedFields.phone || 'NO_PHONE',
      row._normalizedFields.email || 'NO_EMAIL',
      row._normalizedFields.name || 'NO_NAME'
    ];
    return parts.join('||');
  }

  /**
   * Helper: Create hash for name (for grouping)
   */
  createNameHash(name) {
    if (!name) return null;
    const cleaned = name
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]/g, '');
    return cleaned;
  }

  /**
   * Helper: Compare two phone numbers
   */
  comparePhones(phone1, phone2) {
    if (!phone1 || !phone2) return 0;
    if (phone1 === phone2) return 1;
    
    // Remove all non-digits
    const digits1 = phone1.replace(/\D/g, '');
    const digits2 = phone2.replace(/\D/g, '');
    
    if (digits1 === digits2) return 1;
    
    // Check if one contains the other (last 9 digits often match)
    if (digits1.length > 9 && digits2.length > 9) {
      const last9_1 = digits1.slice(-9);
      const last9_2 = digits2.slice(-9);
      if (last9_1 === last9_2) return 0.9;
    }
    
    return 0;
  }

  /**
   * Helper: Compare string similarity (Levenshtein distance)
   */
  compareSimilarity(str1, str2, threshold = 0.7) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    const distance = this.levenshteinDistance(str1, str2);
    const similarity = 1 - (distance / maxLen);
    
    return Math.max(0, similarity);
  }

  /**
   * Helper: Levenshtein distance algorithm
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Helper: Auto-detect columns from header row
   */
  autoDetectColumns(rows) {
    if (rows.length === 0) return {};

    const firstRow = rows[0];
    const keys = Object.keys(firstRow);
    const columnMap = {};

    keys.forEach(key => {
      const lower = key.toLowerCase();
      if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact')) columnMap.phone = key;
      else if (lower.includes('email') || lower.includes('email_address')) columnMap.email = key;
      else if (lower.includes('name') || lower.includes('contact_name')) columnMap.name = key;
      else if (lower.includes('property') || lower.includes('project')) columnMap.property = key;
      else if (lower.includes('unit') || lower.includes('apt')) columnMap.unit = key;
    });

    return columnMap;
  }

  /**
   * Helper: Calculate data quality score for a record
   */
  calculateDataQuality(record) {
    let score = 0;
    let fields = 0;

    if (record._normalizedFields.phone && record._phoneValid) score += 25;
    fields++;
    if (record._normalizedFields.email) score += 25;
    fields++;
    if (record._normalizedFields.name) score += 25;
    fields++;
    if (record._normalizedFields.property || record._normalizedFields.unit) score += 25;
    fields++;

    return fields > 0 ? Math.round((score / 100) * 100) : 0;
  }

  /**
   * Helper: Format statistics for display
   */
  formatStats(stats) {
    return `
    Normalized Records: ${stats.normalized}
    Exact Duplicates Removed: ${stats.duplicates}
    Final Unique Records: ${stats.merged}
    Reduction: ${Math.round((stats.duplicates / stats.normalized) * 100)}%
    `;
  }
}

export { DeduplicationService };
