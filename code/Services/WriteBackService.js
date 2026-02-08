/**
 * ============================================================================
 * WRITE-BACK SERVICE - AUTO-APPEND NEW LEADS TO ORGANIZED SHEET
 * ============================================================================
 * 
 * Handles appending new leads to the organized Akoya sheet
 * Features:
 * - Auto-assign unique codes (P, C, F prefixes)
 * - Validate data before writing
 * - Batch append operations
 * - Logging and error handling
 * 
 * Usage:
 *   const writebackService = new WriteBackService();
 *   await writebackService.appendLead(leadData);
 *   await writebackService.appendBatch(leadsArray);
 * 
 * ============================================================================
 */

import { google } from 'googleapis';
import { getPowerAgent } from '../GoogleAPI/main.js';

class WriteBackService {
  constructor(sheetId = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk') {
    this.sheetId = sheetId;
    this.sheets = null;
    this.nextRowIndex = null;
    this.counters = {
      properties: 1,
      contacts: 1,
      financial: 1
    };
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      const auth = await getPowerAgent();
      if (!auth) {
        throw new Error('Failed to authenticate with Google');
      }
      this.sheets = google.sheets({ version: 'v4', auth });
      
      // Get current row count to know where to append
      await this.updateRowIndex();
      
      console.log('✅ WriteBackService initialized');
      console.log(`   Sheet: ${this.sheetId}`);
      console.log(`   Next write position: Row ${this.nextRowIndex + 1}`);
      
      return true;
    } catch (error) {
      console.error('❌ WriteBackService init error:', error.message);
      return false;
    }
  }

  /**
   * Update the next available row index
   */
  async updateRowIndex() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'Sheet1!A:A',
      });

      const values = response.data.values || [];
      // First row is header, find last non-empty row
      this.nextRowIndex = values.length;
    } catch (error) {
      console.error('Error updating row index:', error.message);
      this.nextRowIndex = 2; // Default to row 2 if error
    }
  }

  /**
   * Assign unique code based on record type
   */
  assignCode(record) {
    const recordStr = Object.values(record).join('|').toLowerCase();
    
    let code = '';
    if (recordStr.match(/phone|whatsapp|email|contact|name/i)) {
      code = `C${String(this.counters.contacts++).padStart(3, '0')}`;
    } else if (recordStr.match(/unit|villa|apartment|property|bedroom|sqft/i)) {
      code = `P${String(this.counters.properties++).padStart(3, '0')}`;
    } else if (recordStr.match(/price|cost|budget|aed|usd|amount|payment|commission/i)) {
      code = `F${String(this.counters.financial++).padStart(3, '0')}`;
    } else {
      code = `P${String(this.counters.properties++).padStart(3, '0')}`;
    }
    
    return code;
  }

  /**
   * Validate lead data
   */
  validateLead(lead) {
    if (!lead || typeof lead !== 'object') {
      return { valid: false, error: 'Lead must be an object' };
    }

    const values = Object.values(lead);
    if (values.length === 0) {
      return { valid: false, error: 'Lead has no data' };
    }

    // Check if at least one value is not empty
    if (!values.some(v => v && String(v).trim())) {
      return { valid: false, error: 'Lead has no non-empty values' };
    }

    return { valid: true };
  }

  /**
   * Append single lead
   */
  async appendLead(lead, metadata = {}) {
    try {
      const validation = this.validateLead(lead);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const code = this.assignCode(lead);
      const row = [code, ...Object.values(lead)];

      // Append to sheet
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range: 'Sheet1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });

      this.nextRowIndex++;

      console.log(`✅ Lead appended: ${code}`);
      
      return {
        success: true,
        code,
        row: response.data.updates.updatedRows,
        metadata
      };
    } catch (error) {
      console.error('❌ Error appending lead:', error.message);
      return {
        success: false,
        error: error.message,
        lead
      };
    }
  }

  /**
   * Append multiple leads in batch
   */
  async appendBatch(leads, metadata = {}) {
    if (!Array.isArray(leads) || leads.length === 0) {
      return {
        success: false,
        error: 'Leads must be a non-empty array'
      };
    }

    try {
      const rows = [];
      const results = [];

      for (const lead of leads) {
        const validation = this.validateLead(lead);
        if (validation.valid) {
          const code = this.assignCode(lead);
          rows.push([code, ...Object.values(lead)]);
          results.push({ code, success: true });
        } else {
          results.push({ success: false, error: validation.error });
        }
      }

      if (rows.length === 0) {
        return {
          success: false,
          error: 'No valid leads to write',
          results
        };
      }

      // Append all at once
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range: 'Sheet1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rows,
        },
      });

      console.log(`✅ Batch appended: ${rows.length} records`);

      return {
        success: true,
        totalProcessed: leads.length,
        totalAppended: rows.length,
        totalFailed: leads.length - rows.length,
        results,
        metadata,
        updatedRange: response.data.updates.updatedRange
      };
    } catch (error) {
      console.error('❌ Error appending batch:', error.message);
      return {
        success: false,
        error: error.message,
        totalAttempted: leads.length
      };
    }
  }

  /**
   * Get stats about last writes
   */
  getStats() {
    return {
      nextRowIndex: this.nextRowIndex,
      codesAssigned: {
        properties: this.counters.properties - 1,
        contacts: this.counters.contacts - 1,
        financial: this.counters.financial - 1,
        total: (this.counters.properties - 1) + (this.counters.contacts - 1) + (this.counters.financial - 1)
      }
    };
  }
}

export default WriteBackService;
