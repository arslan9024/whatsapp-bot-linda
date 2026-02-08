/**
 * SheetEnhancementService.js
 * Service to enhance and normalize the Akoya-Oxygen-2023-Organized sheet
 * Enriches PropertyStatus and populates PropertyLayout columns
 */

const { google } = require('googleapis');
const PropertyStatusConfig = require('../config/PropertyStatusConfig');
const PropertyLayoutConfig = require('../config/PropertyLayoutConfig');
const { BOT_CONFIG } = require('../Config/OrganizedSheetBotConfig');

class SheetEnhancementService {
  constructor() {
    this.sheets = google.sheets('v4');
    this.sheetId = BOT_CONFIG.database.sheet_id;
    this.sheetName = BOT_CONFIG.database.primary_tab;
    this.authClient = null;
    this.stats = {
      processed: 0,
      normalized: 0,
      flagged: 0,
      errors: 0,
      layouts_populated: 0,
      layouts_flagged: 0
    };
    this.flaggedRows = [];
  }

  /**
   * Set authentication client
   */
  setAuthClient(auth) {
    this.authClient = auth;
  }

  /**
   * Analyze current Column N (PropertyStatus) values
   * Returns all unique status values in the sheet
   */
  async analyzePropertyStatusColumn() {
    try {
      console.log('Analyzing PropertyStatus Column...');
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `${this.sheetName}!N:N`,
        auth: this.authClient
      });

      const values = response.data.values || [];
      const uniqueStatuses = new Map();

      values.forEach((row, index) => {
        const status = (row[0] || '').trim();
        if (status && status !== 'PropertyStatus') {
          uniqueStatuses.set(status, (uniqueStatuses.get(status) || 0) + 1);
        }
      });

      const result = {
        total_rows: values.length,
        unique_statuses: Array.from(uniqueStatuses.entries()).map(([status, count]) => ({
          status,
          count,
          normalized: PropertyStatusConfig.normalizeStatus(status)
        }))
      };

      console.log('Analysis Complete:', result);
      return result;

    } catch (error) {
      console.error('Error analyzing PropertyStatus column:', error);
      throw error;
    }
  }

  /**
   * Enrich PropertyStatus Column (Column N)
   * Normalizes all values to comprehensive enum
   */
  async enrichPropertyStatusColumn(dryRun = true) {
    try {
      console.log(`Enriching PropertyStatus Column (Dry Run: ${dryRun})...`);

      // Get all data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `${this.sheetName}!A:O`,
        auth: this.authClient
      });

      const values = response.data.values || [];
      const updates = [];

      for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
        const row = values[rowIndex];
        const currentStatus = (row[13] || '').trim(); // Column N = index 13

        if (!currentStatus) continue;

        const normalized = PropertyStatusConfig.normalizeStatus(currentStatus);

        if (normalized) {
          this.stats.normalized++;
          if (normalized.code !== currentStatus) {
            updates.push({
              rowIndex,
              oldValue: currentStatus,
              newValue: normalized.code,
              reason: 'normalized'
            });
          }
        } else {
          this.stats.flagged++;
          this.flaggedRows.push({
            row: rowIndex + 1,
            currentValue: currentStatus,
            reason: 'invalid_status',
            suggestion: 'Needs manual review'
          });
        }

        this.stats.processed++;
      }

      console.log(`\nEnrichment Statistics:`);
      console.log(`- Total rows processed: ${this.stats.processed}`);
      console.log(`- Rows normalized: ${this.stats.normalized}`);
      console.log(`- Flagged rows: ${this.stats.flagged}`);

      if (!dryRun && updates.length > 0) {
        await this._batchUpdateColumn(updates, 13); // Column N
        console.log(`Applied ${updates.length} updates to PropertyStatus column`);
      }

      return {
        stats: this.stats,
        updates: updates,
        flaggedRows: this.flaggedRows,
        dryRun
      };

    } catch (error) {
      console.error('Error enriching PropertyStatus column:', error);
      throw error;
    }
  }

  /**
   * Populate PropertyLayout Column
   * Auto-detects layout from available data, flags ambiguous ones
   */
  async populatePropertyLayoutColumn(dryRun = true) {
    try {
      console.log(`Populating PropertyLayout Column (Dry Run: ${dryRun})...`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `${this.sheetName}!A:P`,
        auth: this.authClient
      });

      const values = response.data.values || [];
      const updates = [];
      const headers = values[0] || [];

      // Find existing layout-related columns
      const layoutColumnIndex = headers.findIndex(h => 
        h && h.toLowerCase().includes('layout')
      );
      const typeColumnIndex = headers.findIndex(h => 
        h && h.toLowerCase().includes('type')
      );
      const bedroomColumnIndex = headers.findIndex(h => 
        h && h.toLowerCase().includes('bedroom')
      );
      const unitColumnIndex = headers.findIndex(h => 
        h && h.toLowerCase().includes('unit')
      );

      // PropertyLayout will be in a new column (let's assume column P for now)
      const propertyLayoutColumnIndex = 15; // Column P

      for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
        const row = values[rowIndex];
        
        // Skip if layout already exists
        if (row[propertyLayoutColumnIndex]) {
          continue;
        }

        // Gather clues from various columns
        let detectionText = '';
        if (layoutColumnIndex >= 0) detectionText += row[layoutColumnIndex] + ' ';
        if (typeColumnIndex >= 0) detectionText += row[typeColumnIndex] + ' ';
        if (bedroomColumnIndex >= 0) detectionText += row[bedroomColumnIndex] + ' ';
        if (unitColumnIndex >= 0) detectionText += row[unitColumnIndex] + ' ';

        // Try to detect layout
        const detected = PropertyLayoutConfig.detectLayout(detectionText);

        if (detected && detected.confidence >= 85) {
          this.stats.layouts_populated++;
          updates.push({
            rowIndex,
            columnIndex: propertyLayoutColumnIndex,
            value: detected.code,
            confidence: detected.confidence
          });
        } else if (detected && detected.confidence >= 75) {
          // Moderate confidence - flag for review
          this.stats.layouts_flagged++;
          this.flaggedRows.push({
            row: rowIndex + 1,
            currentValue: detectionText.trim(),
            suggestion: `Possibly ${detected.code} (${detected.confidence}% confidence)`,
            reason: 'layout_low_confidence'
          });
        } else {
          // No match found
          this.stats.layouts_flagged++;
          this.flaggedRows.push({
            row: rowIndex + 1,
            currentValue: detectionText.trim(),
            reason: 'layout_not_detected',
            suggestion: 'Needs manual layout assignment'
          });
        }

        this.stats.processed++;
      }

      console.log(`\nLayout Population Statistics:`);
      console.log(`- Total rows processed: ${this.stats.processed}`);
      console.log(`- Layouts populated: ${this.stats.layouts_populated}`);
      console.log(`- Flagged for review: ${this.stats.layouts_flagged}`);

      if (!dryRun && updates.length > 0) {
        await this._batchUpdateCells(updates);
        console.log(`Applied ${updates.length} layout updates`);
      }

      return {
        stats: this.stats,
        updates: updates,
        flaggedRows: this.flaggedRows,
        dryRun
      };

    } catch (error) {
      console.error('Error populating PropertyLayout column:', error);
      throw error;
    }
  }

  /**
   * Validate enrichment completeness
   */
  async validateEnrichment() {
    try {
      console.log('Validating enrichment...');

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `${this.sheetName}!N:P`,
        auth: this.authClient
      });

      const values = response.data.values || [];
      const validationReport = {
        total_rows: values.length - 1, // Exclude header
        status_column_filled: 0,
        status_column_valid: 0,
        status_column_invalid: 0,
        layout_column_filled: 0,
        layout_column_valid: 0,
        layout_column_invalid: 0,
        issues: []
      };

      for (let i = 1; i < values.length; i++) {
        const row = values[i] || [];
        const status = (row[0] || '').trim();
        const layout = (row[2] || '').trim();

        // Validate status
        if (status) {
          validationReport.status_column_filled++;
          if (PropertyStatusConfig.isValidStatus(status)) {
            validationReport.status_column_valid++;
          } else {
            validationReport.status_column_invalid++;
            validationReport.issues.push({
              row: i + 1,
              column: 'N',
              issue: `Invalid status: '${status}'`,
              suggestion: 'Use: SALE, RENT, SOLD, RENTED, PENDING, VACANT'
            });
          }
        }

        // Validate layout
        if (layout) {
          validationReport.layout_column_filled++;
          if (PropertyLayoutConfig.getLayoutByCode(layout)) {
            validationReport.layout_column_valid++;
          } else {
            validationReport.layout_column_invalid++;
            validationReport.issues.push({
              row: i + 1,
              column: 'P',
              issue: `Invalid layout: '${layout}'`,
              suggestion: `Use one of: ${PropertyLayoutConfig.getAllLayoutCodes().join(', ')}`
            });
          }
        }
      }

      console.log('\nValidation Report:');
      console.log(`Status Column: ${validationReport.status_column_valid}/${validationReport.status_column_filled} valid`);
      console.log(`Layout Column: ${validationReport.layout_column_valid}/${validationReport.layout_column_filled} valid`);
      console.log(`Total Issues: ${validationReport.issues.length}`);

      return validationReport;

    } catch (error) {
      console.error('Error validating enrichment:', error);
      throw error;
    }
  }

  /**
   * Batch update column values
   */
  async _batchUpdateColumn(updates, columnIndex) {
    const data = [];
    updates.forEach(update => {
      const columnLetter = String.fromCharCode(65 + columnIndex);
      data.push({
        range: `${this.sheetName}!${columnLetter}${update.rowIndex + 1}`,
        values: [[update.newValue]]
      });
    });

    const result = await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.sheetId,
      requestBody: {
        data: data,
        valueInputOption: 'RAW'
      },
      auth: this.authClient
    });

    return result;
  }

  /**
   * Batch update arbitrary cells
   */
  async _batchUpdateCells(updates) {
    const data = [];
    updates.forEach(update => {
      const columnLetter = String.fromCharCode(65 + update.columnIndex);
      data.push({
        range: `${this.sheetName}!${columnLetter}${update.rowIndex + 1}`,
        values: [[update.value]]
      });
    });

    const result = await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.sheetId,
      requestBody: {
        data: data,
        valueInputOption: 'RAW'
      },
      auth: this.authClient
    });

    return result;
  }

  /**
   * Generate enrichment report
   */
  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      flaggedRows: this.flaggedRows,
      summary: {
        total_processed: this.stats.processed,
        status_normalized: this.stats.normalized,
        status_flagged: this.stats.flagged,
        layouts_populated: this.stats.layouts_populated,
        layouts_flagged: this.stats.layouts_flagged,
        completion_percentage: ((this.stats.normalized + this.stats.layouts_populated) / 
                               (this.stats.processed * 2)) * 100
      }
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      processed: 0,
      normalized: 0,
      flagged: 0,
      errors: 0,
      layouts_populated: 0,
      layouts_flagged: 0
    };
    this.flaggedRows = [];
  }
}

module.exports = SheetEnhancementService;
