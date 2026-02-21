/**
 * Google Sheets Manager - Full CRUD Operations
 * ============================================
 * 
 * Performs all CRUD operations on Google Sheets using PowerAgent credentials
 * 
 * Features:
 * - CREATE: Add new sheets, rows, columns
 * - READ: Get sheet data, search, filter
 * - UPDATE: Update cells, ranges, batch updates
 * - DELETE: Remove rows, clear cells, delete sheets
 * 
 * @usage
 * const gsm = new GoogleSheetsManager(googleServiceAccountManager);
 * await gsm.initialize('poweragent');
 * 
 * // Read data
 * const data = await gsm.readSheet(spreadsheetId, 'Sheet1!A1:Z100');
 * 
 * // Create row
 * await gsm.appendRow(spreadsheetId, 'Sheet1', ['John', 'Doe', 'John@example.com']);
 * 
 * // Update cell
 * await gsm.updateCell(spreadsheetId, 'Sheet1!A1', 'Updated Value');
 * 
 * // Delete row
 * await gsm.deleteRow(spreadsheetId, 'Sheet1', 1);
 */

import { google } from 'googleapis';

class GoogleSheetsManager {
  constructor(googleServiceAccountManager) {
    this.gsamManager = googleServiceAccountManager;
    this.sheetsAPI = null;
    this.currentAccount = null;
    this.logger = this._createLogger();
  }

  _createLogger() {
    return {
      info: (msg, data) => console.log(`📊 [GS] ${msg}`, data ? JSON.stringify(data) : ''),
      success: (msg, data) => console.log(`✅ [GS] ${msg}`, data ? JSON.stringify(data) : ''),
      error: (msg, data) => console.error(`❌ [GS] ${msg}`, data ? JSON.stringify(data) : ''),
      warn: (msg, data) => console.warn(`⚠️  [GS] ${msg}`, data ? JSON.stringify(data) : ''),
    };
  }

  /**
   * Initialize Google Sheets API with service account
   */
  async initialize(accountName = 'poweragent') {
    try {
      this.logger.info(`Initializing Google Sheets for account: ${accountName}`);
      
      const credentials = await this.gsamManager.getCredentials(accountName);
      if (!credentials) {
        throw new Error(`No credentials found for account: ${accountName}`);
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheetsAPI = google.sheets({ version: 'v4', auth });
      this.currentAccount = accountName;
      
      this.logger.success(`Initialized with account: ${accountName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize: ${error.message}`);
      return false;
    }
  }

  // ========== READ OPERATIONS ==========

  /**
   * Read sheet data
   */
  async readSheet(spreadsheetId, range = 'Sheet1') {
    try {
      this.logger.info(`Reading sheet`, { spreadsheetId, range });
      
      const response = await this.sheetsAPI.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const data = response.data.values || [];
      this.logger.success(`Read ${data.length} rows from ${range}`);
      
      return {
        success: true,
        data,
        range: response.data.range,
        rowCount: data.length,
        columnCount: data.length > 0 ? data[0].length : 0,
      };
    } catch (error) {
      this.logger.error(`Read failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get specific cell value
   */
  async getCell(spreadsheetId, cell) {
    try {
      const response = await this.readSheet(spreadsheetId, cell);
      if (!response.success || response.data.length === 0) {
        return { success: false, error: 'Cell not found' };
      }
      return { success: true, value: response.data[0][0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for value in sheet
   */
  async searchSheet(spreadsheetId, range, searchValue) {
    try {
      const response = await this.readSheet(spreadsheetId, range);
      if (!response.success) return response;

      const results = [];
      response.data.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell && cell.toString().toLowerCase().includes(searchValue.toLowerCase())) {
            results.push({
              value: cell,
              cell: String.fromCharCode(65 + colIndex) + (rowIndex + 1),
              row: rowIndex,
              column: colIndex,
            });
          }
        });
      });

      return {
        success: true,
        found: results.length,
        results,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== CREATE OPERATIONS ==========

  /**
   * Append single row
   */
  async appendRow(spreadsheetId, sheetName, values) {
    try {
      this.logger.info(`Appending row to ${sheetName}`, { valueCount: values.length });
      
      const response = await this.sheetsAPI.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'RAW',
        resource: {
          values: [values],
        },
      });

      this.logger.success(`Row appended`);
      return { success: true, updatedCells: response.data.updates.updatedCells };
    } catch (error) {
      this.logger.error(`Append failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Append multiple rows
   */
  async appendRows(spreadsheetId, sheetName, rows) {
    try {
      this.logger.info(`Appending ${rows.length} rows to ${sheetName}`);
      
      const response = await this.sheetsAPI.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'RAW',
        resource: {
          values: rows,
        },
      });

      this.logger.success(`${rows.length} rows appended`);
      return { success: true, updatedCells: response.data.updates.updatedCells };
    } catch (error) {
      this.logger.error(`Batch append failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new sheet
   */
  async createSheet(spreadsheetId, sheetTitle) {
    try {
      this.logger.info(`Creating sheet: ${sheetTitle}`);
      
      const response = await this.sheetsAPI.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                },
              },
            },
          ],
        },
      });

      const sheetId = response.data.replies[0].addSheet.properties.sheetId;
      this.logger.success(`Sheet created with ID: ${sheetId}`);
      return { success: true, sheetId };
    } catch (error) {
      this.logger.error(`Create sheet failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ========== UPDATE OPERATIONS ==========

  /**
   * Update single cell
   */
  async updateCell(spreadsheetId, cellReference, value) {
    try {
      this.logger.info(`Updating cell ${cellReference}`, { value });
      
      const response = await this.sheetsAPI.spreadsheets.values.update({
        spreadsheetId,
        range: cellReference,
        valueInputOption: 'RAW',
        resource: {
          values: [[value]],
        },
      });

      this.logger.success(`Cell updated`);
      return { success: true, updatedCells: response.data.updatedCells };
    } catch (error) {
      this.logger.error(`Update cell failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update range
   */
  async updateRange(spreadsheetId, range, values) {
    try {
      this.logger.info(`Updating range ${range}`);
      
      const response = await this.sheetsAPI.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: {
          values,
        },
      });

      this.logger.success(`Range updated: ${response.data.updatedCells} cells`);
      return { success: true, updatedCells: response.data.updatedCells };
    } catch (error) {
      this.logger.error(`Update range failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear range
   */
  async clearRange(spreadsheetId, range) {
    try {
      this.logger.info(`Clearing range ${range}`);
      
      await this.sheetsAPI.spreadsheets.values.clear({
        spreadsheetId,
        range,
      });

      this.logger.success(`Range cleared`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Clear failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ========== DELETE OPERATIONS ==========

  /**
   * Delete row by index
   */
  async deleteRow(spreadsheetId, sheetName, rowIndex) {
    try {
      this.logger.info(`Deleting row ${rowIndex} from ${sheetName}`);
      
      // First get sheet ID
      const metadata = await this.sheetsAPI.spreadsheets.get({
        spreadsheetId,
      });

      const sheet = metadata.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const sheetId = sheet.properties.sheetId;

      // Delete row
      const response = await this.sheetsAPI.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteRange: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
                shiftDimension: 'ROWS',
              },
            },
          ],
        },
      });

      this.logger.success(`Row ${rowIndex} deleted`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Delete row failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete sheet
   */
  async deleteSheet(spreadsheetId, sheetName) {
    try {
      this.logger.info(`Deleting sheet: ${sheetName}`);
      
      // Get sheet ID
      const metadata = await this.sheetsAPI.spreadsheets.get({
        spreadsheetId,
      });

      const sheet = metadata.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const sheetId = sheet.properties.sheetId;

      // Delete sheet
      const response = await this.sheetsAPI.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteSheet: {
                sheetId,
              },
            },
          ],
        },
      });

      this.logger.success(`Sheet deleted`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Delete sheet failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ========== UTILITY OPERATIONS ==========

  /**
   * Get spreadsheet metadata
   */
  async getMetadata(spreadsheetId) {
    try {
      const response = await this.sheetsAPI.spreadsheets.get({
        spreadsheetId,
      });

      const sheets = response.data.sheets.map(s => ({
        name: s.properties.title,
        id: s.properties.sheetId,
        rowCount: s.properties.gridProperties.rowCount,
        columnCount: s.properties.gridProperties.columnCount,
      }));

      return {
        success: true,
        spreadsheet: response.data.properties.title,
        sheetCount: sheets.length,
        sheets,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sheet names
   */
  async getSheetNames(spreadsheetId) {
    try {
      const metadata = await this.getMetadata(spreadsheetId);
      if (!metadata.success) return metadata;
      return { success: true, sheets: metadata.sheets.map(s => s.name) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default GoogleSheetsManager;
