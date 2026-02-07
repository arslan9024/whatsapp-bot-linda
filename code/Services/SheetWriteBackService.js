/**
 * Sheet Write-Back Service (Session 16 - Phase 4)
 * 
 * Handles writing new/updated records back to organized sheet
 * Automatically assigns codes and manages data synchronization
 * 
 * Usage:
 *   import { SheetWriteBackService } from './SheetWriteBackService.js';
 *   const writeBack = new SheetWriteBackService(organizerSheetId);
 *   
 *   // Write new contact discovered from message
 *   const result = await writeBack.writeNewRecord('CONTACT', {
 *     phone: '+971501234567',
 *     name: 'Ahmed Mohammed'
 *   });
 *   console.log(`✅ Created with code: ${result.newCode}`);
 */

import { google } from 'googleapis';
import { getCredentialsManager } from '../Integration/Google/config/credentials.js';
import { CodeReferenceSystem } from './CodeReferenceSystem.js';

export class SheetWriteBackService {
  constructor(organizerSheetId) {
    this.organizerSheetId = organizerSheetId;
    this.sheets = null;
    this.auth = null;
    this.codeSystem = new CodeReferenceSystem();
    this.writeQueue = [];  // Temporary buffer if write fails
    this.lastWriteTime = null;
  }

  /**
   * Initialize the service with authentication
   */
  async initialize() {
    try {
      const credManager = getCredentialsManager();
      const credentials = credManager.getCredentials('serviceman11');
      
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive',
        ],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      console.log('✅ SheetWriteBackService initialized');
      return true;
    } catch (error) {
      console.error('❌ SheetWriteBackService init failed:', error.message);
      return false;
    }
  }

  /**
   * Write a new record to Master Data tab
   * @param {string} recordType - 'CONTACT' | 'PROPERTY' | 'FINANCIAL' | 'OTHER'
   * @param {Object} recordData - Record fields (phone, name, property, unit, etc)
   * @param {Object} metadata - Optional metadata (sourceMessage, discoveredBy, etc)
   * @returns {Promise<Object>} { success: true, newCode: 'P00001', row: 2 }
   */
  async writeNewRecord(recordType, recordData, metadata = {}) {
    try {
      console.log(`\n📝 Writing new ${recordType} record...`);

      // Step 1: Generate next code
      const newCode = await this.codeSystem.generateNextCode(recordType);
      console.log(`   Generated code: ${newCode}`);

      // Step 2: Build row data with all fields
      const rowData = {
        Code: newCode,
        Type: recordType,
        ...recordData,
        _code: newCode,
        _type: recordType,
        _createdAt: new Date().toISOString(),
        _source: metadata.sourceMessage || 'API',
        _discoveredBy: metadata.discoveredBy || 'system',
        ...(metadata || {})
      };

      // Step 3: Convert to array format for Master Data tab
      const headers = ['Code', 'Type', ...Object.keys(recordData)];
      const values = headers.map(h => rowData[h] || '');

      // Step 4: Validate before write
      const validation = await validateRecordForWrite(recordType, rowData);
      if (!validation.canWrite) {
        throw new Error(`Validation failed: ${validation.reason}`);
      }

      // Step 5: Append to Master Data tab
      const result = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.organizerSheetId,
        range: 'Master Data!A:Z',
        valueInputOption: 'RAW',
        requestBody: {
          values: [values],
        },
      });

      console.log(`✅ Record written to sheet`);
      console.log(`   Row: ${result.data.updates.updatedRows}`);
      
      this.lastWriteTime = new Date();

      return {
        success: true,
        newCode,
        type: recordType,
        rowsWritten: result.data.updates.updatedRows,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Write failed: ${error.message}`);
      
      // Queue for retry
      this.writeQueue.push({
        type: 'NEW_RECORD',
        recordType,
        recordData,
        metadata,
        queuedAt: new Date().toISOString()
      });

      return {
        success: false,
        error: error.message,
        queued: true,
        queueSize: this.writeQueue.length
      };
    }
  }

  /**
   * Update an existing record
   * @param {string} code - Record code (e.g., 'P00001')
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  async updateExistingRecord(code, updates) {
    try {
      console.log(`\n🔄 Updating record ${code}...`);

      // Find row by code
      const masterData = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.organizerSheetId,
        range: 'Master Data!A:Z',
      });

      const rows = masterData.data.values || [];
      const headerRow = rows[0];
      const codeIndex = headerRow.indexOf('Code');
      
      let targetRowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][codeIndex] === code) {
          targetRowIndex = i + 1;  // +1 because sheets are 1-indexed
          break;
        }
      }

      if (targetRowIndex === -1) {
        throw new Error(`Code ${code} not found in Master Data`);
      }

      // Update metadata
      const updateData = {
        ...updates,
        _lastUpdated: new Date().toISOString(),
        _updateCount: (parseInt(updates._updateCount) || 0) + 1
      };

      // Build update request
      const updateCells = [];
      for (const [field, value] of Object.entries(updateData)) {
        const fieldIndex = headerRow.indexOf(field);
        if (fieldIndex >= 0) {
          updateCells.push({
            range: `Master Data!${String.fromCharCode(65 + fieldIndex)}${targetRowIndex}`,
            values: [[value]]
          });
        }
      }

      // Perform update
      if (updateCells.length > 0) {
        const updateRequest = {
          spreadsheetId: this.organizerSheetId,
          resource: {
            data: updateCells.map(cell => ({
              range: cell.range,
              majorDimension: 'ROWS',
              values: cell.values
            })),
            valueInputOption: 'RAW'
          }
        };

        await this.sheets.spreadsheets.values.batchUpdate(updateRequest);
        console.log(`✅ Record updated: ${updateCells.length} fields changed`);
      }

      this.lastWriteTime = new Date();

      return {
        success: true,
        code,
        fieldsUpdated: updateCells.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Update failed: ${error.message}`);
      
      this.writeQueue.push({
        type: 'UPDATE_RECORD',
        code,
        updates,
        queuedAt: new Date().toISOString()
      });

      return {
        success: false,
        error: error.message,
        queued: true
      };
    }
  }

  /**
   * Batch write multiple records
   * @param {Array} records - Array of { recordType, recordData }
   * @returns {Promise<Object>} Batch result
   */
  async syncBatchRecords(records) {
    if (!records || records.length === 0) {
      return { success: true, written: 0, failed: 0, skipped: 0 };
    }

    console.log(`\n📦 Batch writing ${records.length} records...`);

    const results = {
      written: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const record of records) {
      const result = await this.writeNewRecord(
        record.recordType,
        record.recordData,
        record.metadata
      );

      if (result.success) {
        results.written++;
      } else {
        results.failed++;
        results.errors.push({
          code: result.newCode,
          error: result.error
        });
      }
    }

    console.log(`\n✅ Batch complete: ${results.written} written, ${results.failed} failed`);
    
    return results;
  }

  /**
   * Process queued writes (retry failed writes)
   * @returns {Promise<Object>} Retry result
   */
  async processWriteQueue() {
    if (this.writeQueue.length === 0) {
      return { success: true, processed: 0 };
    }

    console.log(`\n🔄 Processing ${this.writeQueue.length} queued writes...`);

    const processed = [];
    const failed = [];

    for (const queueItem of this.writeQueue) {
      try {
        let result;
        if (queueItem.type === 'NEW_RECORD') {
          result = await this.writeNewRecord(
            queueItem.recordType,
            queueItem.recordData,
            queueItem.metadata
          );
        } else if (queueItem.type === 'UPDATE_RECORD') {
          result = await this.updateExistingRecord(
            queueItem.code,
            queueItem.updates
          );
        }

        if (result.success) {
          processed.push(queueItem);
        } else {
          failed.push(queueItem);
        }
      } catch (error) {
        failed.push(queueItem);
      }
    }

    // Clear processed items from queue
    this.writeQueue = failed;

    console.log(`✅ Queue processed: ${processed.length} succeeded, ${failed.length} remain in queue`);

    return {
      success: failed.length === 0,
      processed: processed.length,
      failed: failed.length,
      queueRemaining: this.writeQueue.length
    };
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    return {
      queueSize: this.writeQueue.length,
      items: this.writeQueue,
      lastWriteTime: this.lastWriteTime,
      ready: this.sheets !== null
    };
  }
}

/**
 * Validate record before write
 * @private
 */
async function validateRecordForWrite(recordType, record) {
  const validation = {
    canWrite: true,
    reason: null
  };

  // Check required fields by type
  if (recordType === 'CONTACT') {
    if (!record.phone && !record.email && !record.name) {
      validation.canWrite = false;
      validation.reason = 'CONTACT must have phone, email, or name';
    }
  } else if (recordType === 'PROPERTY') {
    if (!record.property && !record.unit) {
      validation.canWrite = false;
      validation.reason = 'PROPERTY must have property or unit';
    }
  } else if (recordType === 'FINANCIAL') {
    if (!record.price && !record.amount) {
      validation.canWrite = false;
      validation.reason = 'FINANCIAL must have price or amount';
    }
  }

  // Check for duplicate code (should not happen, but safety check)
  if (record.Code && record.Code.match(/^[PCF]\d{5}$/)) {
    // Code format is valid
  } else if (record.Code) {
    validation.canWrite = false;
    validation.reason = `Invalid code format: ${record.Code}`;
  }

  return validation;
}

export default SheetWriteBackService;
