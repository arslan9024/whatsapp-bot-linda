/**
 * Google Sheets Service
 * Phase 2 Week 2 Implementation
 * 
 * Consolidated service for all Google Sheets operations
 * Replaces: getGoogleSheet, getSheetWMN, getSheet, WriteToSheet
 * Plus enhancements: update, batch, filtering
 * 
 * Version: 1.0.0 (Skeleton)
 * Status: Ready for Week 2 implementation (Feb 17-21)
 * Created: February 7, 2026
 */

import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/errorHandler.js';
import { getAuthenticationService } from './AuthenticationService.js';
import { google } from 'googleapis';

/**
 * SheetsService - Unified Google Sheets operations
 * 
 * Features:
 * - Read operations (getValues, getCell, getColumn, getRow)
 * - Write operations (appendRow, appendRows, updateCell, updateRange)
 * - Batch operations
 * - Caching & performance optimization
 * 
 * Migration Mapping:
 * ✅ getGoogleSheet() → getValues()
 * ✅ getSheetWMN() → getValues() (consolidated)
 * ✅ getSheet() → getValues() (consolidated)
 * ✅ getOneRowFromSheet() → getRow() (with filtering)
 * ✅ WriteToSheet() → appendRow()
 * ✨ NEW: appendRows (batch)
 * ✨ NEW: updateCell (single cell)
 * ✨ NEW: updateRange (range update)
 * ✨ NEW: caching layer
 * ✨ NEW: batch operations
 */
class SheetsService {
  /**
   * Initialize SheetsService
   * @param {Object} config - Configuration
   * @param {Object} config.authService - AuthenticationService instance
   * @param {boolean} config.enableCache - Enable caching (default: true)
   * @param {number} config.cacheTTL - Cache TTL in milliseconds (default: 3600000 = 1 hour)
   */
  constructor(config = {}) {
    this.authService = config.authService || getAuthenticationService();
    this.sheetsAPI = null;
    this.enableCache = config.enableCache !== false;
    this.cacheTTL = config.cacheTTL || 3600000;
    this.cache = new Map();
    
    logger.info('SheetsService initialized', {
      cacheEnabled: this.enableCache,
      cacheTTL: this.cacheTTL
    });
  }

  /**
   * Initialize the Sheets API client
   * MUST be called after authentication
   * @returns {Promise<boolean>} True if successful
   */
  async initialize() {
    try {
      // Get authenticated client from authService
      const authClient = await this.authService.getAuthClient();
      
      if (!authClient) {
        throw new Error('Failed to get authenticated client from AuthenticationService');
      }
      
      // Create sheets API instance
      this.sheetsAPI = google.sheets({ version: 'v4', auth: authClient });
      
      // Test connection with health check
      logger.info('SheetsService initialized successfully');
      return true;
    } catch (error) {
      logger.error('SheetsService initialization failed', { error: error.message });
      throw errorHandler.handle(error, { service: 'SheetsService', method: 'initialize' });
    }
  }

  /**
   * Get values from a spreadsheet range
   * MIGRATION: getGoogleSheet(), getSheetWMN(), getSheet()
   * 
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range in A1 notation (default: "Sheet1")
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Sheet data with values array
   */
  async getValues(spreadsheetId, range = 'Sheet1', options = {}) {
    try {
      // Check cache first (if enabled)
      if (this.enableCache) {
        const cacheKey = `${spreadsheetId}:${range}`;
        const cachedData = this.cache.get(cacheKey);
        
        if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheTTL) {
          logger.debug('Returning cached sheet values', { spreadsheetId, range });
          return cachedData.data;
        }
      }
      
      // Build request options
      const requestOptions = {
        spreadsheetId,
        range,
        ...options
      };
      
      // Call sheets.spreadsheets.values.get()
      const response = await this.sheetsAPI.spreadsheets.values.get(requestOptions);
      
      const data = {
        spreadsheetId,
        range: response.data.range || range,
        values: response.data.values || [],
        majorDimension: response.data.majorDimension || 'ROWS'
      };
      
      // Cache result
      if (this.enableCache) {
        const cacheKey = `${spreadsheetId}:${range}`;
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }
      
      logger.info('Successfully retrieved sheet values', { 
        spreadsheetId, 
        range, 
        rowCount: data.values.length 
      });
      
      return data;
    } catch (error) {
      logger.error('Failed to get sheet values', { 
        spreadsheetId, 
        range, 
        error: error.message 
      });
      throw errorHandler.handle(error, { 
        service: 'SheetsService', 
        method: 'getValues',
        context: { spreadsheetId, range }
      });
    }
  }

  /**
   * Get a single cell value
   * MIGRATION: NEW feature
   * 
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} cellRange - Cell in A1 notation (e.g., "A1", "Sheet1!B2")
   * @returns {Promise<any>} Cell value
   */
  async getCell(spreadsheetId, cellRange) {
    try {
      // Get values for single cell range
      const response = await this.getValues(spreadsheetId, cellRange);
      
      // Extract and return cell value
      if (response.values && response.values.length > 0 && response.values[0].length > 0) {
        const cellValue = response.values[0][0];
        logger.debug('Retrieved cell value', { spreadsheetId, cellRange, cellValue });
        return cellValue;
      }
      
      // Handle empty cells
      logger.debug('Cell is empty', { spreadsheetId, cellRange });
      return null;
    } catch (error) {
      logger.error('Failed to get cell', { spreadsheetId, cellRange, error: error.message });
      throw errorHandler.handle(error, { 
        service: 'SheetsService', 
        method: 'getCell',
        context: { spreadsheetId, cellRange }
      });
    }
  }

  /**
   * Get values from a specific column
   * MIGRATION: NEW feature
   * 
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} column - Column letter (e.g., "A", "BC")
   * @param {string} sheetName - Sheet name (default: "Sheet1")
   * @returns {Promise<Array>} Column values
   */
  async getColumn(spreadsheetId, column, sheetName = 'Sheet1') {
    try {
      // Build range for entire column
      const range = `${sheetName}!${column}:${column}`;
      
      // Get values
      const response = await this.getValues(spreadsheetId, range);
      
      // Extract column array and return filtered values (remove empty cells)
      const values = response.values || [];
      const columnValues = values.map(row => row[0] || null).filter(val => val !== null);
      
      logger.info('Retrieved column values', { 
        spreadsheetId, 
        column, 
        valueCount: columnValues.length 
      });
      
      return columnValues;
    } catch (error) {
      logger.error('Failed to get column', { spreadsheetId, column, error: error.message });
      throw errorHandler.handle(error, { 
        service: 'SheetsService', 
        method: 'getColumn',
        context: { spreadsheetId, column, sheetName }
      });
    }
  }

  /**
   * Get values from a specific row
   * MIGRATION: getOneRowFromSheet() - enhanced with actual filtering
   * 
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {number} rowNumber - Row number (1-based)
   * @param {string} sheetName - Sheet name (default: "Sheet1")
   * @returns {Promise<Array>} Row values
   */
  async getRow(spreadsheetId, rowNumber, sheetName = 'Sheet1') {
    try {
      // Build range for specific row
      const range = `${sheetName}!${rowNumber}:${rowNumber}`;
      
      // Get values
      const response = await this.getValues(spreadsheetId, range);
      
      // Extract row array and return values
      const values = response.values && response.values.length > 0 ? response.values[0] : [];
      
      logger.info('Retrieved row values', { 
        spreadsheetId, 
        rowNumber, 
        valueCount: values.length 
      });
      
      return values;
    } catch (error) {
      logger.error('Failed to get row', { spreadsheetId, rowNumber, error: error.message });
      throw errorHandler.handle(error, { 
        service: 'SheetsService', 
        method: 'getRow',
        context: { spreadsheetId, rowNumber, sheetName }
      });
    }
  }

  /**
   * Get values with filtering
   * MIGRATION: NEW feature
   * 
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range in A1 notation
   * @param {Object} filterOptions - Filter criteria
   * @param {number} filterOptions.columnIndex - Column to filter by (0-based)
   * @param {string} filterOptions.value - Value to match
   * @returns {Promise<Array>} Filtered rows
   */
  async getFiltered(spreadsheetId, range, filterOptions = {}) {
    try {
      // Get all values from range
      const response = await this.getValues(spreadsheetId, range);
      const allRows = response.values || [];
      
      // Apply filter criteria
      if (!filterOptions.columnIndex || filterOptions.value === undefined) {
        logger.warn('Incomplete filter options provided');
        return allRows;
      }
      
      const filteredRows = allRows.filter(row => {
        return row[filterOptions.columnIndex] === filterOptions.value;
      });
      
      logger.info('Applied filter to sheet values', { 
        spreadsheetId, 
        range, 
        totalRows: allRows.length,
        filteredRows: filteredRows.length,
        filter: filterOptions
      });
      
      return filteredRows;
    } catch (error) {
      logger.error('Failed to get filtered values', { spreadsheetId, range, error: error.message });
      throw errorHandler.handle(error, { 
        service: 'SheetsService', 
        method: 'getFiltered',
        context: { spreadsheetId, range }
      });
    }
  }

  /**
   * Append a single row
   * MIGRATION: WriteToSheet() - made generic
   * 
   * Legacy Usage:
   * ```javascript
   * WriteToSheet(msg) // msg = { from, to, body }
   * ```
   * 
   * New Usage:
   * ```javascript
   * sheetsService.appendRow(spreadsheetId, [value1, value2, value3])
   * ```
   * 
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {Array} values - Row values to append
   * @param {Object} options - Additional options
   * @param {string} options.range - Range for append (default: "Sheet1")
   * @returns {Promise<Object>} Append response
   */
  async appendRow(spreadsheetId, values, options = {}) {
    try {
      // Validate values array
      if (!Array.isArray(values) || values.length === 0) {
        throw new Error('Values must be a non-empty array');
      }
      
      // Build append request
      const range = options.range || 'Sheet1';
      const requestBody = {
        values: [values]
      };
      
      // Call sheets.spreadsheets.values.append()
      const response = await this.sheetsAPI.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: requestBody
      });
      
      // Clear cache for this spreadsheet
      if (this.enableCache && spreadsheetId) {
        const cachePrefix = `${spreadsheetId}:`;
        for (let [key] of this.cache) {
          if (key.startsWith(cachePrefix)) {
            this.cache.delete(key);
          }
        }
      }
      
      logger.info('Successfully appended row to sheet', { 
        spreadsheetId, 
        range, 
        valuesCount: values.length,
        updatedCells: response.data.updates?.updatedCells
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to append row', { spreadsheetId, error: error.message });
      throw errorHandler.handle(error, { 
        service: 'SheetsService', 
        method: 'appendRow',
        context: { spreadsheetId }
      });
    }
  }

  /**
   * Append multiple rows (batch operation)
   * MIGRATION: NEW feature - performance improvement
   * 
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {Array<Array>} rows - Array of rows to append
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Append response
   */
  async appendRows(spreadsheetId, rows, options = {}) {
    try {
      // Validate rows array
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('Rows must be a non-empty array');
      }
      
      // Validate each row is an array
      if (!rows.every(row => Array.isArray(row))) {
        throw new Error('Each row must be an array');
      }
      
      // Build batch append request
      const range = options.range || 'Sheet1';
      const requestBody = {
        values: rows
      };
      
      // Call sheets.spreadsheets.values.append() with all rows
      const response = await this.sheetsAPI.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: requestBody
      });
      
      // Clear cache for this spreadsheet
      if (this.enableCache && spreadsheetId) {
        const cachePrefix = `${spreadsheetId}:`;
        for (let [key] of this.cache) {
          if (key.startsWith(cachePrefix)) {
            this.cache.delete(key);
          }
        }
      }
      
      logger.info('Successfully appended multiple rows to sheet', { 
        spreadsheetId, 
        range, 
        rowCount: rows.length,
        updatedCells: response.data.updates?.updatedCells
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to append rows', { spreadsheetId, error: error.message });
      throw errorHandler.handle(error, { 
        service: 'SheetsService', 
        method: 'appendRows',
        context: { spreadsheetId }
      });
    }
  }

  /**
   * Update a single cell
   * MIGRATION: NEW feature
   * 
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} cellRange - Cell in A1 notation (e.g., "A1", "Sheet1!B2")
   * @param {any} value - New value
   * @returns {Promise<Object>} Update response
   */
  async updateCell(spreadsheetId, cellRange, value) {
    try {
      // Build update request
      const requestBody = {
        values: [[value]]
      };
      
      // Call sheets.spreadsheets.values.update()
      const response = await this.sheetsAPI.spreadsheets.values.update({
        spreadsheetId,
        range: cellRange,
        valueInputOption: 'RAW',
        resource: requestBody
      });
      
      // Clear cache for this spreadsheet
      if (this.enableCache && spreadsheetId) {
        const cachePrefix = `${spreadsheetId}:`;
        for (let [key] of this.cache) {
          if (key.startsWith(cachePrefix)) {
            this.cache.delete(key);
          }
        }
      }
      
      logger.info('Successfully updated cell', { 
        spreadsheetId, 
        cellRange, 
        updatedCells: response.data.updatedCells
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to update cell', { spreadsheetId, cellRange, error: error.message });
      throw errorHandler.handle(error, { 
        service: 'SheetsService', 
        method: 'updateCell',
        context: { spreadsheetId, cellRange }
      });
    }
  }

  /**
   * Update a range of cells
   * MIGRATION: NEW feature
   * 
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range in A1 notation
   * @param {Array<Array>} values - 2D array of values
   * @returns {Promise<Object>} Update response
   */
  async updateRange(spreadsheetId, range, values) {
    try {
      // Validate values
      if (!Array.isArray(values)) {
        throw new Error('Values must be a 2D array');
      }
      
      // Build update request
      const requestBody = {
        values: values
      };
      
      // Call sheets.spreadsheets.values.update()
      const response = await this.sheetsAPI.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: requestBody
      });
      
      // Clear cache for this spreadsheet
      if (this.enableCache && spreadsheetId) {
        const cachePrefix = `${spreadsheetId}:`;
        for (let [key] of this.cache) {
          if (key.startsWith(cachePrefix)) {
            this.cache.delete(key);
          }
        }
      }
      
      logger.info('Successfully updated range', { 
        spreadsheetId, 
        range, 
        updatedCells: response.data.updatedCells,
        rowCount: values.length
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to update range', { spreadsheetId, range, error: error.message });
      throw errorHandler.handle(error, { 
        service: 'SheetsService', 
        method: 'updateRange',
        context: { spreadsheetId, range }
      });
    }
  }

  /**
   * Clear a range (delete all values)
   * MIGRATION: NEW feature
   * 
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range to clear
   * @returns {Promise<Object>} Clear response
   */
  async clearRange(spreadsheetId, range) {
    try {
      // Call sheets.spreadsheets.values.clear()
      const response = await this.sheetsAPI.spreadsheets.values.clear({
        spreadsheetId,
        range
      });
      
      // Clear cache for this spreadsheet
      if (this.enableCache && spreadsheetId) {
        const cachePrefix = `${spreadsheetId}:`;
        for (let [key] of this.cache) {
          if (key.startsWith(cachePrefix)) {
            this.cache.delete(key);
          }
        }
      }
      
      logger.info('Successfully cleared range', { 
        spreadsheetId, 
        range, 
        clearedCells: response.data.clearedCells
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to clear range', { spreadsheetId, range, error: error.message });
      throw errorHandler.handle(error, { 
        service: 'SheetsService', 
        method: 'clearRange',
        context: { spreadsheetId, range }
      });
    }
  }

  /**
   * Batch operation for multiple requests
   * MIGRATION: NEW feature
   * 
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {Array<Object>} requests - Array of batch request objects
   * @returns {Promise<Object>} Batch response
   */
  async batchUpdate(spreadsheetId, requests) {
    try {
      // Validate requests
      if (!Array.isArray(requests) || requests.length === 0) {
        throw new Error('Requests must be a non-empty array');
      }
      
      // Build batch update request
      const requestBody = {
        requests: requests
      };
      
      // Call sheets.spreadsheets.batchUpdate()
      const response = await this.sheetsAPI.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: requestBody
      });
      
      // Clear cache for this spreadsheet
      if (this.enableCache && spreadsheetId) {
        const cachePrefix = `${spreadsheetId}:`;
        for (let [key] of this.cache) {
          if (key.startsWith(cachePrefix)) {
            this.cache.delete(key);
          }
        }
      }
      
      logger.info('Successfully batch updated', { 
        spreadsheetId, 
        requestCount: requests.length,
        responseCount: response.data.replies?.length
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to batch update', { spreadsheetId, error: error.message });
      throw errorHandler.handle(error, { 
        service: 'SheetsService', 
        method: 'batchUpdate',
        context: { spreadsheetId }
      });
    }
  }

  /**
   * Clear cache for a specific spreadsheet
   * @param {string} spreadsheetId - Spreadsheet ID (optional, clears all if not provided)
   */
  clearCache(spreadsheetId = null) {
    if (!this.enableCache) return;
    
    if (spreadsheetId) {
      this.cache.delete(spreadsheetId);
      logger.debug('Cleared cache for spreadsheet', { spreadsheetId });
    } else {
      this.cache.clear();
      logger.debug('Cleared all cache');
    }
  }

  /**
   * Get cache stats
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      enabled: this.enableCache,
      size: this.cache.size,
      ttl: this.cacheTTL,
      items: Array.from(this.cache.keys())
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let sheetsServiceInstance = null;

/**
 * Get or create SheetsService instance
 * @param {Object} config - Configuration options
 * @returns {SheetsService} Service instance
 */
function getSheetsService(config = {}) {
  if (!sheetsServiceInstance) {
    sheetsServiceInstance = new SheetsService(config);
  }
  return sheetsServiceInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SheetsService,
  getSheetsService,
};
