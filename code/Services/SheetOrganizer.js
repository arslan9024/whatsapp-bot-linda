/**
 * Sheet Organizer Service
 * Creates new organized sheet from original data
 * 
 * Workflow:
 * 1. Read original sheet
 * 2. Create new Google Sheet with 3 tabs
 * 3. Populate "Organized Data" tab with cleaned data
 * 4. Create "Data Viewer" tab with interactive UI
 * 5. Create "Metadata" tab with transformation info
 */

import { google } from 'googleapis';
import DataViewerTabGenerator from './DataViewerTabGenerator.js';

// Simple logger replacement
const logger = {
  info: (msg, data) => console.log(`ℹ️  ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg, data) => console.error(`❌ ${msg}`, data ? JSON.stringify(data) : ''),
};

class SheetOrganizer {
  /**
   * Main orchestration function
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} Result with new sheet ID and metadata
   */
  static async organizeSheet(config) {
    try {
      const {
        originalSheetId,
        originalProjectName = 'Akoya-Oxygen-2023-Arslan-only',
        newSheetName = 'Akoya-Oxygen-2023-Arslan-Organized',
        auth, // Google auth client
      } = config;

      logger.info('Starting sheet organization', {
        originalSheetId,
        newSheetName,
      });

      // Step 1: Read original sheet
      logger.info('Step 1: Reading original sheet');
      const originalData = await this._readSheet(auth, originalSheetId);
      
      // Step 2: Analyze structure
      logger.info('Step 2: Analyzing sheet structure');
      const analysis = this._analyzeData(originalData);

      // Step 3: Create new sheet
      logger.info('Step 3: Creating new sheet');
      const newSheetId = await this._createNewSheet(auth, newSheetName);

      // Step 4: Add tabs
      logger.info('Step 4: Adding sheet tabs');
      await this._addSheetTabs(auth, newSheetId);

      // Step 5: Populate organized data
      logger.info('Step 5: Populating organized data');
      const normalizedData = this._normalizeData(originalData, analysis);
      await this._populateOrganizedTab(auth, newSheetId, normalizedData, analysis);

      // Step 6: Create data viewer
      logger.info('Step 6: Creating data viewer tab');
      await this._populateDataViewerTab(auth, newSheetId, analysis);

      // Step 7: Create metadata
      logger.info('Step 7: Creating metadata tab');
      await this._populateMetadataTab(auth, newSheetId, analysis, originalSheetId);

      logger.info('Sheet organization complete', { newSheetId });

      return {
        success: true,
        originalSheetId,
        newSheetId,
        newSheetName,
        dataRows: analysis.dataRows,
        columns: analysis.columns.length,
        metadata: analysis,
      };
    } catch (error) {
      logger.error('Sheet organization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Read data from original sheet
   * @private
   */
  static async _readSheet(auth, sheetId) {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1',
    });

    return response.data.values || [];
  }

  /**
   * Analyze data structure
   * @private
   */
  static _analyzeData(data) {
    if (data.length === 0) {
      throw new Error('No data in sheet');
    }

    const headers = data[0] || [];
    const dataRows = data.length - 1;

    return {
      headers,
      dataRows,
      columns: headers.map((h, idx) => ({
        index: idx,
        originalHeader: h,
        normalizedHeader: this._normalizeHeader(h),
      })),
      organizationTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Normalize header names
   * @private
   */
  static _normalizeHeader(header) {
    // Remove special chars, trim, capitalize
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
   * @private
   */
  static async _createNewSheet(auth, title) {
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.create({
      resource: {
        properties: {
          title,
          locale: 'en_US',
          autoRecalc: 'ON_CHANGE',
        },
        sheets: [
          {
            properties: { title: 'Data Viewer' },
          },
        ],
      },
      fields: 'spreadsheetId',
    });

    return response.data.spreadsheetId;
  }

  /**
   * Add tabs to sheet
   * @private
   */
  static async _addSheetTabs(auth, sheetId) {
    const sheets = google.sheets({ version: 'v4', auth });

    const tabInfo = [
      { title: 'Organized Data', index: 1 },
      { title: 'Metadata', index: 2 },
    ];

    for (const tab of tabInfo) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: tab.title,
                  index: tab.index,
                },
              },
            },
          ],
        },
      });
    }
  }

  /**
   * Normalize data for organized tab
   * @private
   */
  static _normalizeData(data, analysis) {
    const normalized = [];

    // Add headers
    normalized.push(
      analysis.columns.map(c => c.normalizedHeader)
    );

    // Add data rows (skip original header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i] || [];
      normalized.push(row);
    }

    // Add metadata column
    normalized[0].push('Import_Date');
    normalized.forEach((row, idx) => {
      if (idx > 0) {
        row.push(analysis.organizationTimestamp);
      }
    });

    return normalized;
  }

  /**
   * Populate organized data tab
   * @private
   */
  static async _populateOrganizedTab(auth, sheetId, data, analysis) {
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Organized Data!A1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: data,
      },
    });
  }

  /**
   * Populate data viewer tab
   * @private
   */
  static async _populateDataViewerTab(auth, sheetId, analysis) {
    const sheets = google.sheets({ version: 'v4', auth });

    const headers = analysis.columns.map(c => c.normalizedHeader);
    const viewerData = DataViewerTabGenerator.generateDataViewerTab(headers);

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Data Viewer!A1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: viewerData,
      },
    });
  }

  /**
   * Populate metadata tab
   * @private
   */
  static async _populateMetadataTab(auth, sheetId, analysis, originalSheetId) {
    const sheets = google.sheets({ version: 'v4', auth });

    const metadata = [
      ['SHEET TRANSFORMATION METADATA'],
      [],
      ['Original Sheet ID', originalSheetId],
      ['Organized Date', analysis.organizationTimestamp],
      ['Total Data Rows', analysis.dataRows],
      ['Total Columns', analysis.columns.length],
      [],
      ['COLUMN MAPPING'],
      [],
      ['Original Header', 'Organized Header', 'Column Index'],
    ];

    // Add column mapping
    analysis.columns.forEach(col => {
      metadata.push([
        col.originalHeader,
        col.normalizedHeader,
        col.index + 1,
      ]);
    });

    metadata.push([]);
    metadata.push(['INSTRUCTIONS']);
    metadata.push(['1. Use "Data Viewer" tab to view one row at a time with filtered columns']);
    metadata.push(['2. "Organized Data" tab contains all data in normalized format']);
    metadata.push(['3. This tab shows transformation details']);

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Metadata!A1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: metadata,
      },
    });
  }
}

export default SheetOrganizer;
