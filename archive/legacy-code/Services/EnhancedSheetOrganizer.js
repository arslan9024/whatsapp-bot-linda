/**
 * Enhanced Sheet Organizer with Smart Deduplication & Code References
 * 
 * Workflow:
 * 1. Read original sheet
 * 2. Deduplicate using multi-stage pipeline
 * 3. Assign unique codes (P001, C001, F001)
 * 4. Create new Google Sheet with specialized tabs
 * 5. Populate data by type in separate tabs
 * 6. Create Code Reference Map tab
 * 7. Create enhanced Data Viewer with filters
 * 8. Create Metadata and Analytics tabs
 */

import { google } from 'googleapis';
import { DeduplicationService } from './DeduplicationService.js';
import { CodeReferenceSystem } from './CodeReferenceSystem.js';
import { Logger } from '../Utils/Logger.js';

const logger = new Logger('EnhancedSheetOrganizer');

class EnhancedSheetOrganizer {
  constructor() {
    this.deduplicationService = new DeduplicationService();
    this.codeReferenceSystem = new CodeReferenceSystem();
  }

  /**
   * Main orchestration function - complete pipeline
   */
  async organizeSheet(config) {
    try {
      const {
        originalSheetId,
        newSheetName = 'Organized-Sheet',
        auth,
      } = config;

      logger.info(`🚀 Starting Enhanced Sheet Organization`);
      logger.info(`   Original Sheet ID: ${originalSheetId}`);
      logger.info(`   New Sheet Name: ${newSheetName}`);

      // STEP 1: Read original data
      logger.info(`\n📖 STEP 1: Reading original sheet...`);
      const originalData = await this._readSheet(auth, originalSheetId);
      logger.info(`   ✅ Read ${originalData.length} rows`);

      // STEP 2: Analyze structure
      logger.info(`\n📊 STEP 2: Analyzing data structure...`);
      const analysis = this._analyzeData(originalData);
      logger.info(`   ✅ Found ${analysis.dataRows} data rows and ${analysis.columns.length} columns`);

      // STEP 3: Deduplicate
      logger.info(`\n🔄 STEP 3: Running deduplication pipeline...`);
      const dataRows = originalData.slice(1); // Skip header
      const deduplicationResult = await this.deduplicationService.deduplicate(dataRows, analysis.columnMap);
      const deduplicatedRecords = deduplicationResult.records;
      logger.info(`   ✅ Deduplicated from ${dataRows.length} to ${deduplicatedRecords.length} records`);

      // STEP 4: Assign codes
      logger.info(`\n🔢 STEP 4: Assigning unique codes...`);
      const codedRecords = this.codeReferenceSystem.assignCodes(deduplicatedRecords);
      logger.info(`   ✅ Assigned codes to all ${codedRecords.length} records`);

      // STEP 5: Create new sheet
      logger.info(`\n📝 STEP 5: Creating new Google Sheet...`);
      const newSheetId = await this._createNewSheet(auth, newSheetName);
      logger.info(`   ✅ Created sheet: ${newSheetId}`);

      // STEP 6: Add specialized tabs
      logger.info(`\n📑 STEP 6: Adding specialized tabs...`);
      await this._addSpecializedTabs(auth, newSheetId);
      logger.info(`   ✅ Added tabs: Contacts, Properties, Financials, Code Map, Data Viewer, Analytics, Metadata`);

      // STEP 7: Populate tabs by data type
      logger.info(`\n📋 STEP 7: Populating typed data tabs...`);
      await this._populateTypedTabs(auth, newSheetId, codedRecords, analysis);
      logger.info(`   ✅ Populated Contacts, Properties, and Financials tabs`);

      // STEP 8: Populate Code Reference Map
      logger.info(`\n🗺️  STEP 8: Populating Code Reference Map...`);
      await this._populateCodeReferenceTab(auth, newSheetId);
      logger.info(`   ✅ Created Code Reference Map with all codes and lookup info`);

      // STEP 9: Create enhanced Data Viewer
      logger.info(`\n👁️  STEP 9: Creating enhanced Data Viewer...`);
      await this._populateEnhancedDataViewer(auth, newSheetId, codedRecords);
      logger.info(`   ✅ Created interactive Data Viewer with filters`);

      // STEP 10: Create Analytics tab
      logger.info(`\n📈 STEP 10: Populating Analytics...`);
      await this._populateAnalyticsTab(auth, newSheetId, deduplicatedRecords, deduplicationResult);
      logger.info(`   ✅ Created Analytics tab with deduplication and data quality metrics`);

      // STEP 11: Create Metadata tab
      logger.info(`\n📄 STEP 11: Creating Metadata tab...`);
      await this._populateMetadataTab(auth, newSheetId, analysis, originalSheetId, deduplicationResult);
      logger.info(`   ✅ Created Metadata tab with transformation details`);

      logger.info(`\n✨ Sheet Organization Complete!`);
      logger.info(`\n📊 Summary:`);
      logger.info(`   Original Records: ${originalData.length - 1}`);
      logger.info(`   Deduplicated Records: ${deduplicatedRecords.length}`);
      logger.info(`   Duplicates Removed: ${(originalData.length - 1) - deduplicatedRecords.length}`);
      logger.info(`   Code Reference: ${this.codeReferenceSystem.getCodeStatistics().totalCodes} codes assigned`);
      logger.info(`   New Sheet ID: ${newSheetId}\n`);

      return {
        success: true,
        originalSheetId,
        newSheetId,
        newSheetName,
        originalRecords: originalData.length - 1,
        deduplicatedRecords: deduplicatedRecords.length,
        duplicatesRemoved: (originalData.length - 1) - deduplicatedRecords.length,
        codeStats: this.codeReferenceSystem.getCodeStatistics(),
        analysis,
        tabs: ['Master Data', 'Code Reference Map', 'Data Viewer', 'Contacts', 'Properties', 'Financials', 'Analytics', 'Metadata']
      };
    } catch (error) {
      logger.error(`Sheet organization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read data from original sheet
   */
  async _readSheet(auth, sheetId) {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1',
    });
    return response.data.values || [];
  }

  /**
   * Analyze data structure and detect columns
   */
  _analyzeData(data) {
    if (data.length === 0) throw new Error('No data in sheet');

    const headers = data[0] || [];
    const dataRows = data.length - 1;

    // Auto-detect column types
    const columnMap = this._detectColumns(headers);

    return {
      headers,
      dataRows,
      columnMap,
      columns: headers.map((h, idx) => ({
        index: idx,
        originalHeader: h,
        normalizedHeader: this._normalizeHeader(h),
        detectedType: this._detectColumnType(h)
      })),
      organizationTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Detect column mappings from headers
   */
  _detectColumns(headers) {
    const columnMap = {};
    headers.forEach(header => {
      const lower = header.toLowerCase();
      if (lower.includes('phone') || lower.includes('mobile')) columnMap.phone = header;
      else if (lower.includes('email')) columnMap.email = header;
      else if (lower.includes('name') || lower.includes('contact')) columnMap.name = header;
      else if (lower.includes('property') || lower.includes('project')) columnMap.property = header;
      else if (lower.includes('unit') || lower.includes('apt')) columnMap.unit = header;
    });
    return columnMap;
  }

  /**
   * Detect column data type
   */
  _detectColumnType(header) {
    const lower = header.toLowerCase();
    if (lower.includes('phone') || lower.includes('mobile')) return 'PHONE';
    if (lower.includes('email')) return 'EMAIL';
    if (lower.includes('price') || lower.includes('amount')) return 'FINANCIAL';
    if (lower.includes('date') || lower.includes('time')) return 'DATE';
    if (lower.includes('status')) return 'STATUS';
    return 'TEXT';
  }

  /**
   * Normalize header names
   */
  _normalizeHeader(header) {
    return header
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('_');
  }

  /**
   * Create new Google Sheet
   */
  async _createNewSheet(auth, title) {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.create({
      resource: {
        properties: {
          title,
          locale: 'en_US',
          autoRecalc: 'ON_CHANGE',
        },
        sheets: [{ properties: { title: 'Master Data' } }],
      },
      fields: 'spreadsheetId',
    });
    return response.data.spreadsheetId;
  }

  /**
   * Add specialized tabs for different data types
   */
  async _addSpecializedTabs(auth, sheetId) {
    const sheets = google.sheets({ version: 'v4', auth });

    const tabs = [
      'Code Reference Map',
      'Data Viewer',
      'Contacts',
      'Properties',
      'Financials',
      'Analytics',
      'Metadata'
    ];

    for (let i = 0; i < tabs.length; i++) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: tabs[i],
                index: i + 1,
              },
            },
          }],
        },
      });
    }
  }

  /**
   * Populate tabs organized by data type
   */
  async _populateTypedTabs(auth, sheetId, codedRecords, analysis) {
    const sheets = google.sheets({ version: 'v4', auth });

    // Master Data (all records with codes)
    const masterData = this._createMasterDataTab(codedRecords, analysis);
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Master Data!A1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: masterData },
    });

    // Contacts tab
    const contacts = codedRecords.filter(r => r._type === 'CONTACT');
    if (contacts.length > 0) {
      const contactsData = this._createTypedDataTab(contacts, analysis, ['Name', 'Phone', 'Email', 'Code']);
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Contacts!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: contactsData },
      });
    }

    // Properties tab
    const properties = codedRecords.filter(r => r._type === 'PROPERTY');
    if (properties.length > 0) {
      const propertiesData = this._createTypedDataTab(properties, analysis, ['Code', 'Property', 'Unit', 'Status']);
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Properties!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: propertiesData },
      });
    }

    // Financials tab
    const financials = codedRecords.filter(r => r._type === 'FINANCIAL');
    if (financials.length > 0) {
      const financialsData = this._createTypedDataTab(financials, analysis, ['Code', 'Amount', 'Price', 'Status']);
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Financials!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: financialsData },
      });
    }
  }

  /**
   * Create master data tab
   */
  _createMasterDataTab(records, analysis) {
    const headers = [
      'Code',
      'Type',
      ...analysis.headers.map(h => this._normalizeHeader(h)),
      'Data_Quality_Score',
      'Import_Date'
    ];

    const data = [headers];
    records.forEach(record => {
      const row = [
        record._code,
        record._type,
        ...analysis.headers.map(h => record[h] || ''),
        record._deduplicationStats?.dataQualityScore || 0,
        new Date().toISOString()
      ];
      data.push(row);
    });

    return data;
  }

  /**
   * Create typed data tab (Contacts, Properties, Financials)
   */
  _createTypedDataTab(records, analysis, displayColumns) {
    const headers = displayColumns;
    const data = [headers];

    records.forEach(record => {
      const row = displayColumns.map(col => {
        if (col === 'Code') return record._code;
        if (col === 'Type') return record._type;
        // Handle standard column names
        const key = analysis.headers.find(h => this._normalizeHeader(h) === col) || col;
        return record[key] || record[col] || '';
      });
      data.push(row);
    });

    return data;
  }

  /**
   * Populate Code Reference Map tab
   */
  async _populateCodeReferenceTab(auth, sheetId) {
    const sheets = google.sheets({ version: 'v4', auth });

    const codeMap = this.codeReferenceSystem.exportCodeReferenceMap();
    const data = [
      ['CODE REFERENCE MAP', 'All unique records with assigned codes for bot lookup'],
      [],
      Object.keys(codeMap[0] || {})
    ];

    codeMap.forEach(record => {
      data.push(Object.values(record));
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Code Reference Map!A1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: data },
    });
  }

  /**
   * Create enhanced Data Viewer with smart filters
   */
  async _populateEnhancedDataViewer(auth, sheetId, codedRecords) {
    const sheets = google.sheets({ version: 'v4', auth });

    const data = [
      ['ENHANCED DATA VIEWER', 'Interactive view - search and filter by code, project, unit, or mobile'],
      [],
      ['SEARCH FILTERS:'],
      ['Search Type:', 'Filter Value:', 'Results:'],
      [],
      ['Search by Code:', 'Enter code (e.g., P00001)', `=COUNTIF('Master Data'!A:A,"P*")`],
      ['Search by Project:', 'Project name', `=COUNTIF('Master Data'!C:C,"*")`],
      ['Search by Unit:', 'Unit number', `=COUNTIF('Master Data'!D:D,"*")`],
      ['Search by Mobile:', 'Phone number', `=COUNTIF('Master Data'!E:E,"*")`],
      [],
      ['QUICK STATISTICS:'],
      ['Total Records:', codedRecords.length],
      ['Properties:', codedRecords.filter(r => r._type === 'PROPERTY').length],
      ['Contacts:', codedRecords.filter(r => r._type === 'CONTACT').length],
      ['Financials:', codedRecords.filter(r => r._type === 'FINANCIAL').length],
      [],
      ['INSTRUCTIONS:'],
      ['1. Use Code Reference Map tab to lookup codes for any record'],
      ['2. Use Master Data tab for complete data with codes'],
      ['3. Each typed tab (Contacts/Properties/Financials) shows category-specific data'],
      ['4. Use filters in each tab to find specific records'],
      ['5. Codes can be referenced in bot logic for context-aware responses']
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Data Viewer!A1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: data },
    });
  }

  /**
   * Populate Analytics tab with deduplication stats
   */
  async _populateAnalyticsTab(auth, sheetId, deduplicatedRecords, deduplicationResult) {
    const sheets = google.sheets({ version: 'v4', auth });

    const stats = this.codeReferenceSystem.getCodeStatistics();
    const dupStats = deduplicationResult.stats;

    const data = [
      ['DEDUPLICATION & DATA QUALITY ANALYTICS'],
      [],
      ['DEDUPLICATION RESULTS:'],
      ['Original Records:', dupStats.normalized],
      ['Exact Duplicates Found:', dupStats.duplicates],
      ['Unique Records (After Exact Dedup):', dupStats.merged],
      ['Reduction Rate:', `${Math.round((dupStats.duplicates / dupStats.normalized) * 100)}%`],
      [],
      ['CODE ALLOCATION:'],
      ['Properties (P):', stats.byType.properties],
      ['Contacts (C):', stats.byType.contacts],
      ['Financials (F):', stats.byType.financials],
      ['Others (O):', stats.byType.others],
      [],
      ['DATA QUALITY METRICS:'],
      ['Total Records with Codes:', stats.totalCodes],
      ['Avg Data Quality Score:', Math.round(
        deduplicatedRecords.reduce((sum, r) => sum + (r._deduplicationStats?.dataQualityScore || 0), 0) / 
        deduplicatedRecords.length
      )],
      [],
      ['POTENTIAL DUPLICATES (Fuzzy Matches):'],
      ['Count:', deduplicationResult.potentialDuplicates?.length || 0],
      ['These require manual review and can be merged if confirmed']
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Analytics!A1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: data },
    });
  }

  /**
   * Create Metadata tab
   */
  async _populateMetadataTab(auth, sheetId, analysis, originalSheetId, deduplicationResult) {
    const sheets = google.sheets({ version: 'v4', auth });

    const data = [
      ['TRANSFORMATION METADATA & INSTRUCTIONS'],
      [],
      ['Original Sheet ID:', originalSheetId],
      ['Organization Date:', analysis.organizationTimestamp],
      [],
      ['SHEET STRUCTURE:'],
      ['Tab Name', 'Purpose', 'Records'],
      ['Master Data', 'All deduplicated records with codes', deduplicationResult.records.length],
      ['Code Reference Map', 'Lookup table for code references', deduplicationResult.records.length],
      ['Data Viewer', 'Interactive search and filter interface', 'N/A'],
      ['Contacts', 'Contact records (Type C)', deduplicationResult.records.filter(r => r._type === 'CONTACT').length],
      ['Properties', 'Property records (Type P)', deduplicationResult.records.filter(r => r._type === 'PROPERTY').length],
      ['Financials', 'Financial records (Type F)', deduplicationResult.records.filter(r => r._type === 'FINANCIAL').length],
      ['Analytics', 'Deduplication and quality metrics', 'N/A'],
      [],
      ['COLUMN MAPPING (Original → Normalized):'],
      ['Original Header', 'Normalized Header', 'Data Type'],
      ...analysis.columns.map(col => [col.originalHeader, col.normalizedHeader, col.detectedType]),
      [],
      ['BOT INTEGRATION INSTRUCTIONS:'],
      ['1. Load CodeReferenceSystem with records from Code Reference Map'],
      ['2. When bot receives message, extract potential codes or keywords'],
      ['3. Lookup in CodeReferenceSystem by code (P00001) or by field value'],
      ['4. Inject rich context into message analysis and reply generation'],
      ['5. Example: User says "check P00001" → Lookup P00001 → Get all property details → Provide detailed response'],
      ['6. For ambiguous references, use fuzzy matching on phone/name from Code Reference Map'],
      []
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Metadata!A1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: data },
    });
  }
}

export { EnhancedSheetOrganizer };
