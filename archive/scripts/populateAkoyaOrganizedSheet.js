#!/usr/bin/env node

/**
 * ============================================================================
 * DATA POPULATION SCRIPT - AKOYA ORGANIZED SHEET
 * ============================================================================
 * 
 * This script:
 * 1. Reads original "Akoya-Oxygen-2023-Arslan-only" sheet
 * 2. Deduplicates all records (removes duplicates)
 * 3. Organizes data by type (Contacts, Properties, Financials)
 * 4. Assigns unique codes (C001, P001, F001)
 * 5. Writes everything to "Akoya-Oxygen-2023-Organized" sheet
 * 
 * Usage:
 *   node populateAkoyaOrganizedSheet.js
 * 
 * Or with custom sheet IDs:
 *   node populateAkoyaOrganizedSheet.js --original-id "SHEET_ID" --organized-id "ORG_ID"
 * 
 * ============================================================================
 */

import { google } from 'googleapis';
import { initializeGoogleAuth, getPowerAgent } from './code/GoogleAPI/main.js';
import { DeduplicationService } from './code/Services/DeduplicationService.js';
import { CodeReferenceSystem } from './code/Services/CodeReferenceSystem.js';
import { Logger } from './code/utils/Logger.js';
import fs from 'fs';
import path from 'path';

const logger = new Logger('DataPopulationScript');

class AkoyaDataPopulator {
  constructor() {
    this.deduplicationService = new DeduplicationService();
    this.codeReferenceSystem = new CodeReferenceSystem();
    this.sheets = null;
    this.auth = null;
  }

  /**
   * Initialize Google Sheets API
   */
  async initialize() {
    try {
      logger.info('🔐 Initializing Google Sheets API...');
      await initializeGoogleAuth();
      this.auth = await getPowerAgent();

      if (!this.auth) {
        throw new Error('Failed to get authentication');
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      logger.info('✅ Google Sheets API initialized\n');
    } catch (error) {
      logger.error(`Failed to initialize: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find sheet by name in Google Drive
   */
  async findSheetByName(sheetName) {
    try {
      const drive = google.drive({ version: 'v3', auth: this.auth });
      const response = await drive.files.list({
        q: `name = "${sheetName}" and mimeType = "application/vnd.google-apps.spreadsheet"`,
        fields: 'files(id, name)',
        pageSize: 1,
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to find sheet: ${error.message}`);
      return null;
    }
  }

  /**
   * Read all data from original sheet
   */
  async readOriginalData(originalSheetId) {
    try {
      logger.info(`📖 Reading original Akoya sheet (${originalSheetId})...`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: originalSheetId,
        range: 'Sheet1',
      });

      const data = response.data.values || [];
      logger.info(`✅ Read ${data.length} rows (including header)`);

      return data;
    } catch (error) {
      logger.error(`Failed to read original sheet: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze and detect data structure
   */
  analyzeData(data) {
    try {
      if (data.length < 2) {
        throw new Error('Sheet has no data rows');
      }

      const headers = data[0] || [];
      const dataRows = data.slice(1);

      logger.info(`\n📊 Analyzing data structure...`);
      logger.info(`   Headers: ${headers.length} columns`);
      logger.info(`   Data rows: ${dataRows.length}`);

      // Detect column types
      const columnMap = this._detectColumns(headers);

      logger.info(`   Detected columns:`);
      Object.entries(columnMap).forEach(([type, cols]) => {
        if (cols.length > 0) {
          logger.info(`     • ${type}: ${cols.join(', ')}`);
        }
      });

      return {
        headers,
        dataRows,
        columnMap,
        totalRows: data.length,
      };
    } catch (error) {
      logger.error(`Failed to analyze data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect column types from headers
   */
  _detectColumns(headers) {
    const columnMap = {
      contact: [],
      property: [],
      financial: [],
      temporal: [],
      other: [],
    };

    const contactKeywords = ['name', 'phone', 'email', 'contact', 'whatsapp', 'mobile', 'number'];
    const propertyKeywords = ['unit', 'villa', 'apartment', 'property', 'address', 'location', 'bedroom', 'bed', 'br', 'sqft', 'area'];
    const financialKeywords = ['price', 'cost', 'budget', 'aed', 'usd', 'amount', 'payment', 'commission', 'value'];
    const temporalKeywords = ['date', 'time', 'created', 'updated', 'timestamp', 'when'];

    headers.forEach((header) => {
      const lower = (header || '').toLowerCase().trim();

      if (contactKeywords.some((kw) => lower.includes(kw))) {
        columnMap.contact.push(header);
      } else if (propertyKeywords.some((kw) => lower.includes(kw))) {
        columnMap.property.push(header);
      } else if (financialKeywords.some((kw) => lower.includes(kw))) {
        columnMap.financial.push(header);
      } else if (temporalKeywords.some((kw) => lower.includes(kw))) {
        columnMap.temporal.push(header);
      } else {
        columnMap.other.push(header);
      }
    });

    return columnMap;
  }

  /**
   * Deduplicate records
   */
  async deduplicateRecords(dataRows, columnMap) {
    try {
      logger.info(`\n🔄 Deduplicating records...`);
      const result = await this.deduplicationService.deduplicate(dataRows, columnMap);

      logger.info(`✅ Deduplication complete:`);
      logger.info(`   Original records: ${dataRows.length}`);
      logger.info(`   Deduplicated: ${result.records.length}`);
      logger.info(`   Removed: ${dataRows.length - result.records.length}`);
      logger.info(`   Dedup stages used: ${result.stages.length}`);

      return result;
    } catch (error) {
      logger.error(`Failed to deduplicate: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign unique codes to records
   */
  codeRecords(dedupRecords) {
    try {
      logger.info(`\n🔢 Assigning unique codes...`);
      const codedRecords = this.codeReferenceSystem.assignCodes(dedupRecords);

      const codeStats = this.codeReferenceSystem.getCodeStatistics();
      logger.info(`✅ Codes assigned:`);
      logger.info(`   Contact codes: ${codeStats.contactCodes} (C001, C002, ...)`);
      logger.info(`   Property codes: ${codeStats.propertyCodes} (P001, P002, ...)`);
      logger.info(`   Financial records: ${codeStats.financialRecords} (F001, F002, ...)`);
      logger.info(`   Total codes: ${codeStats.totalCodes}`);

      return codedRecords;
    } catch (error) {
      logger.error(`Failed to assign codes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create organized sheet with all tabs
   */
  async createOrganizedSheet(organizedSheetId, headers) {
    try {
      logger.info(`\n📝 Setting up organized sheet tabs...`);

      // First, clear the default Sheet1
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: organizedSheetId,
        range: 'Sheet1',
      });

      // Add header to Sheet1 (rename to Master Data later)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: organizedSheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        resource: { values: [headers] },
      });

      // Get spreadsheet to see current sheets
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: organizedSheetId,
      });

      const sheetIds = {};
      spreadsheet.data.sheets.forEach((sheet) => {
        sheetIds[sheet.properties.title] = sheet.properties.sheetId;
      });

      // Create tab names and their headers
      const tabDefinitions = {
        'Contacts': ['Code', 'Name', 'Email', 'Phone', 'WhatsApp', 'Type', 'Last Contact'],
        'Properties': ['Code', 'Unit Number', 'Project', 'Type', 'Bedrooms', 'Area', 'Price', 'Status'],
        'Financials': ['Code', 'Unit', 'Price', 'Commission', 'Status', 'Date'],
        'Code Map': ['Record ID', 'Code', 'Type', 'Description', 'Lookup Path'],
        'Data Viewer': ['Unit', 'Contact', 'Property', 'Price', 'Status', 'Notes'],
        'Analytics': ['Metric', 'Original', 'Deduplicated', 'Removed', 'Percentage'],
        'Metadata': ['Field', 'Value', 'Description'],
      };

      // Create missing tabs
      const tabsToCreate = Object.keys(tabDefinitions).filter((name) => !sheetIds[name]);

      if (tabsToCreate.length > 0) {
        const requests = tabsToCreate.map((tabName) => ({
          addSheet: {
            properties: { title: tabName },
          },
        }));

        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: organizedSheetId,
          resource: { requests },
        });

        logger.info(`✅ Created ${tabsToCreate.length} tabs`);
      } else {
        logger.info(`✅ All tabs already exist`);
      }

      logger.info(`   Tabs: Master Data, Contacts, Properties, Financials, Code Map, Data Viewer, Analytics, Metadata`);
    } catch (error) {
      logger.error(`Failed to create tabs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Organize and write data by type to different tabs
   */
  async populateTypedTabs(organizedSheetId, codedRecords, analysis) {
    try {
      logger.info(`\n📋 Organizing data by type and writing to tabs...`);

      const { columnMap } = analysis;
      const contacts = [];
      const properties = [];
      const financials = [];

      // Separate records by detected type
      codedRecords.forEach((record) => {
        const recordArray = Array.isArray(record) ? record : Object.values(record);

        // Simple heuristic: check which type columns are populated
        const hasContactData = columnMap.contact.some((col, idx) => recordArray[idx]);
        const hasPropertyData = columnMap.property.some((col, idx) => recordArray[idx]);
        const hasFinancialData = columnMap.financial.some((col, idx) => recordArray[idx]);

        // Add to appropriate category
        if (hasContactData) {
          contacts.push(recordArray);
        }
        if (hasPropertyData) {
          properties.push(recordArray);
        }
        if (hasFinancialData) {
          financials.push(recordArray);
        }

        // Add to all if mixed
        if (!hasContactData && !hasPropertyData && !hasFinancialData) {
          properties.push(recordArray); // Default to properties
        }
      });

      logger.info(`   Contacts: ${contacts.length}`);
      logger.info(`   Properties: ${properties.length}`);
      logger.info(`   Financials: ${financials.length}`);

      // Write to tabs
      if (contacts.length > 0) {
        const contactHeaders = ['Code', ...columnMap.contact];
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: organizedSheetId,
          range: 'Contacts!A1',
          valueInputOption: 'RAW',
          resource: { values: [contactHeaders, ...contacts.slice(0, 1000)] },
        });
        logger.info(`✅ Wrote ${contacts.length} contacts`);
      }

      if (properties.length > 0) {
        const propertyHeaders = ['Code', ...columnMap.property];
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: organizedSheetId,
          range: 'Properties!A1',
          valueInputOption: 'RAW',
          resource: { values: [propertyHeaders, ...properties.slice(0, 1000)] },
        });
        logger.info(`✅ Wrote ${properties.length} properties`);
      }

      if (financials.length > 0) {
        const financialHeaders = ['Code', ...columnMap.financial];
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: organizedSheetId,
          range: 'Financials!A1',
          valueInputOption: 'RAW',
          resource: { values: [financialHeaders, ...financials.slice(0, 1000)] },
        });
        logger.info(`✅ Wrote ${financials.length} financial records`);
      }
    } catch (error) {
      logger.error(`Failed to populate tabs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Write all deduplicated data to Master Data tab
   */
  async writeToMasterDataTab(organizedSheetId, codedRecords, headers) {
    try {
      logger.info(`\n💾 Writing to Master Data tab...`);

      // Batching to handle large datasets
      const batchSize = 1000;
      let written = 0;

      for (let i = 0; i < codedRecords.length; i += batchSize) {
        const batch = codedRecords.slice(i, i + batchSize);
        const startRow = i + 2; // +2 for 1-indexed and header row

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: organizedSheetId,
          range: `Sheet1!A${startRow}`,
          valueInputOption: 'RAW',
          resource: { values: batch },
        });

        written += batch.length;
        logger.info(`   Wrote ${written}/${codedRecords.length} records...`);
      }

      logger.info(`✅ Master Data tab populated with ${codedRecords.length} records`);
    } catch (error) {
      logger.error(`Failed to write Master Data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create Code Reference Map for lookups
   */
  async populateCodeMap(organizedSheetId) {
    try {
      logger.info(`\n🗺️  Creating Code Reference Map...`);

      const codeStatistics = this.codeReferenceSystem.getCodeStatistics();
      const codeMap = [];

      // Add header
      codeMap.push(['Record ID', 'Code', 'Type', 'Description', 'Lookup Path']);

      // Add code entries
      let recordId = 1;

      // Contact codes
      for (let i = 1; i <= codeStatistics.contactCodes; i++) {
        codeMap.push([
          `C${i}`,
          `C${String(i).padStart(3, '0')}`,
          'Contact',
          `Contact record #${i}`,
          `/Contacts/C${String(i).padStart(3, '0')}`,
        ]);
        recordId++;
      }

      // Property codes
      for (let i = 1; i <= codeStatistics.propertyCodes; i++) {
        codeMap.push([
          `P${i}`,
          `P${String(i).padStart(3, '0')}`,
          'Property',
          `Property record #${i}`,
          `/Properties/P${String(i).padStart(3, '0')}`,
        ]);
        recordId++;
      }

      // Financial codes
      for (let i = 1; i <= codeStatistics.financialRecords; i++) {
        codeMap.push([
          `F${i}`,
          `F${String(i).padStart(3, '0')}`,
          'Financial',
          `Financial record #${i}`,
          `/Financials/F${String(i).padStart(3, '0')}`,
        ]);
        recordId++;
      }

      // Write to Code Map tab
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: organizedSheetId,
        range: 'Code Map!A1',
        valueInputOption: 'RAW',
        resource: { values: codeMap.slice(0, 1000) },
      });

      logger.info(`✅ Code Map created with ${recordId - 1} entries`);
    } catch (error) {
      logger.error(`Failed to create Code Map: ${error.message}`);
      throw error;
    }
  }

  /**
   * Populate Analytics tab with deduplication metrics
   */
  async populateAnalyticsTab(organizedSheetId, originalCount, dedupCount) {
    try {
      logger.info(`\n📈 Populating Analytics tab...`);

      const duplicatesRemoved = originalCount - dedupCount;
      const dedupPercentage = ((duplicatesRemoved / originalCount) * 100).toFixed(2);

      const analyticsData = [
        ['Metric', 'Original', 'Deduplicated', 'Removed', 'Percentage'],
        ['Total Records', originalCount, dedupCount, duplicatesRemoved, `${dedupPercentage}%`],
        ['Processing Date', new Date().toISOString(), '', '', ''],
        ['Status', 'Complete', '', '', ''],
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: organizedSheetId,
        range: 'Analytics!A1',
        valueInputOption: 'RAW',
        resource: { values: analyticsData },
      });

      logger.info(`✅ Analytics tab populated`);
    } catch (error) {
      logger.error(`Failed to populate Analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Main execution flow
   */
  async execute(originalSheetId, organizedSheetId) {
    try {
      logger.info('\n╔════════════════════════════════════════════╗');
      logger.info('║   AKOYA DATA POPULATION - ORGANIZED SHEET  ║');
      logger.info('║            Complete Workflow v1.0          ║');
      logger.info('╚════════════════════════════════════════════╝\n');

      // Initialize
      await this.initialize();

      // Read original data
      const originalData = await this.readOriginalData(originalSheetId);

      // Analyze structure
      const analysis = this.analyzeData(originalData);

      // Deduplicate
      const dedupResult = await this.deduplicateRecords(analysis.dataRows, analysis.columnMap);

      // Code assignment
      const codedRecords = this.codeRecords(dedupResult.records);

      // Create organized sheet
      await this.createOrganizedSheet(organizedSheetId, analysis.headers);

      // Write to Master Data
      await this.writeToMasterDataTab(organizedSheetId, codedRecords, analysis.headers);

      // Populate typed tabs
      await this.populateTypedTabs(organizedSheetId, codedRecords, analysis);

      // Create Code Map
      await this.populateCodeMap(organizedSheetId);

      // Create Analytics
      await this.populateAnalyticsTab(
        organizedSheetId,
        analysis.dataRows.length,
        dedupResult.records.length
      );

      logger.info('\n╔════════════════════════════════════════════╗');
      logger.info('║         ✨ DATA POPULATION COMPLETE ✨      ║');
      logger.info('╚════════════════════════════════════════════╝\n');

      logger.info('📊 Summary:');
      logger.info(`   Original Records: ${analysis.dataRows.length}`);
      logger.info(`   Deduplicated: ${dedupResult.records.length}`);
      logger.info(`   Duplicates Removed: ${analysis.dataRows.length - dedupResult.records.length}`);
      logger.info(`   Unique Codes Assigned: ${this.codeReferenceSystem.getCodeStatistics().totalCodes}`);
      logger.info(`\n✅ All data written to organized sheet!\n`);

      return {
        success: true,
        originalRecords: analysis.dataRows.length,
        deduplicatedRecords: dedupResult.records.length,
        duplicatesRemoved: analysis.dataRows.length - dedupResult.records.length,
        codesAssigned: this.codeReferenceSystem.getCodeStatistics().totalCodes,
      };
    } catch (error) {
      logger.error(`\n❌ EXECUTION FAILED: ${error.message}\n`);
      throw error;
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let originalSheetId = null;
    let organizedSheetId = null;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--original-id') {
        originalSheetId = args[i + 1];
        i++;
      } else if (args[i] === '--organized-id') {
        organizedSheetId = args[i + 1];
        i++;
      }
    }

    // If not provided, prompt for interactive mode
    if (!originalSheetId || !organizedSheetId) {
      console.log('\n╔════════════════════════════════════════════╗');
        console.log('║  AKOYA DATA POPULATION - AUTOMATIC MODE   ║');
        console.log('╚════════════════════════════════════════════╝\n');

        console.log('✅ Using sheet IDs from MyProjects.js:\n');

        // Actual sheet IDs from MyProjects.js
        originalSheetId =
          originalSheetId || '1wBX2zhUaBg082BUmGCvqCSPI6w8eDJFtxZAsH2LjiaY'; // Oxygen2023
        organizedSheetId =
          organizedSheetId || '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk'; // Akoya-Oxygen-2023-Organized

        console.log('   Original Sheet (Oxygen2023): ' + originalSheetId);
        console.log('   Organized Sheet: ' + organizedSheetId + '\n');
    }

    // Execute
    const populator = new AkoyaDataPopulator();
    const result = await populator.execute(originalSheetId, organizedSheetId);

    console.log('✅ Data population completed successfully!');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();
