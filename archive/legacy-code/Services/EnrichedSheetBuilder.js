/**
 * EnrichedSheetBuilder.js
 * Intelligently populates PropertyStatus and PropertyLayout columns
 * in the organized sheet by analyzing available data
 * 
 * Strategy:
 * 1. Column N (PropertyStatus) - Currently has numeric codes - will populate with intelligent mapping
 * 2. New Column (PropertyLayout) - Will detect and populate from available data
 * 3. Handle null/empty intelligently with defaults and confidence scoring
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import PropertyStatusConfig from '../config/PropertyStatusConfig.js';
import PropertyLayoutConfig from '../config/PropertyLayoutConfig.js';
import { BOT_CONFIG } from '../Config/OrganizedSheetBotConfig.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnrichedSheetBuilder {
  constructor() {
    this.sheets = google.sheets('v4');
    this.sheetId = BOT_CONFIG.DATABASE.ORGANIZED_SHEET.id;
    this.sheetName = BOT_CONFIG.DATABASE.ORGANIZED_SHEET.tab;
    this.authClient = null;
    this.columnMappings = {}; // Will store header -> column index mapping
    this.stats = {
      total_processed: 0,
      status_populated: 0,
      layout_populated: 0,
      flagged: 0,
      confidence_high: 0,
      confidence_medium: 0,
      confidence_low: 0
    };
    this.flaggedRows = [];
  }

  setAuthClient(auth) {
    this.authClient = auth;
  }

  /**
   * Get all sheet data and build column mapping
   */
  async loadSheetData() {
    try {
      console.log('Loading organized sheet data...');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `${this.sheetName}!A:Z`,
        auth: this.authClient
      });

      const values = response.data.values || [];
      const headers = values[0] || [];

      // Build column mapping
      headers.forEach((header, index) => {
        const normalized = (header || '').toLowerCase().trim();
        this.columnMappings[normalized] = index;
      });

      console.log(`Loaded ${values.length} rows with ${headers.length} columns`);
      console.log('Column mapping:', Object.keys(this.columnMappings));

      return {
        data: values,
        headers: headers,
        rowCount: values.length - 1
      };

    } catch (error) {
      console.error('Error loading sheet data:', error);
      throw error;
    }
  }

  /**
   * Intelligent status detection from available columns
   */
  detectStatus(row, headers) {
    // Look for clues in various columns
    const searchableColumns = [
      'status', 'property status', 'listing status', 'availability', 
      'type', 'category', 'notes', 'remarks', 'comments'
    ];

    let detectedStatus = null;
    let confidence = 0;

    for (const colName of searchableColumns) {
      const colIndex = this.columnMappings[colName];
      if (colIndex !== undefined && row[colIndex]) {
        const cellValue = (row[colIndex] || '').toString().toLowerCase();
        const normalized = PropertyStatusConfig.normalizeStatus(cellValue);
        
        if (normalized && confidence < 90) {
          detectedStatus = normalized.code;
          confidence = 90; // Exact match
          break;
        }

        // Pattern matching for common phrases
        if (cellValue.includes('sale') || cellValue.includes('buy')) {
          detectedStatus = 'SALE';
          confidence = Math.max(confidence, 70);
        }
        if (cellValue.includes('rent') || cellValue.includes('lease')) {
          detectedStatus = 'RENT';
          confidence = Math.max(confidence, 70);
        }
        if (cellValue.includes('sold') || cellValue.includes('closed')) {
          detectedStatus = 'SOLD';
          confidence = Math.max(confidence, 70);
        }
        if (cellValue.includes('pending') || cellValue.includes('offer')) {
          detectedStatus = 'PENDING';
          confidence = Math.max(confidence, 65);
        }
      }
    }

    // Default strategy: Most properties are for SALE (market standard)
    if (!detectedStatus) {
      detectedStatus = 'SALE';
      confidence = 30; // Low confidence - defaulting
    }

    return {
      code: detectedStatus,
      confidence: confidence,
      label: PropertyStatusConfig.getStatusByCode(detectedStatus)?.label || detectedStatus
    };
  }

  /**
   * Intelligent layout detection from available columns
   */
  detectLayout(row, headers) {
    const searchableColumns = [
      'layout', 'type', 'unit type', 'property type', 'unit', 
      'bedrooms', 'bed', 'br', 'studio', 'apartment', 'villa',
      'penthouse', 'name', 'description'
    ];

    let detectionText = '';
    let confidence = 0;

    for (const colName of searchableColumns) {
      const colIndex = this.columnMappings[colName];
      if (colIndex !== undefined && row[colIndex]) {
        detectionText += ' ' + (row[colIndex] || '').toString();
      }
    }

    const detected = PropertyLayoutConfig.detectLayout(detectionText);

    if (detected) {
      return {
        code: detected.code,
        confidence: detected.confidence,
        label: detected.layout.label,
        bedrooms: detected.layout.bedrooms
      };
    }

    return {
      code: null,
      confidence: 0,
      label: null,
      reason: 'Unable to detect layout from available data'
    };
  }

  /**
   * Build enrichment mappings
   */
  async analyzeAndMap(data, dryRun = true) {
    try {
      console.log('Analyzing data for enrichment...');
      const headers = data[0] || [];
      
      // Find the target columns (or where they should be)
      const colN = 13; // Column N (PropertyStatus)
      const colO = 14; // Column O (PropertyLayout) - potential location

      const statusUpdates = [];
      const layoutUpdates = [];

      for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        this.stats.total_processed++;

        // Detect status
        const statusDetection = this.detectStatus(row, headers);
        statusUpdates.push({
          rowIndex,
          column: colN,
          value: statusDetection.code,
          confidence: statusDetection.confidence,
          existing: row[colN]  
        });

        // Detect layout
        const layoutDetection = this.detectLayout(row, headers);
        if (layoutDetection.code) {
          this.stats.layout_populated++;
          layoutUpdates.push({
            rowIndex,
            column: colO,
            value: layoutDetection.code,
            confidence: layoutDetection.confidence
          });
        } else {
          this.stats.flagged++;
          this.flaggedRows.push({
            row: rowIndex + 1,
            issue: 'layout_not_detected',
            detectionData: row.slice(0, 10).join(' | ')
          });
        }

        // Track confidence
        if (statusDetection.confidence >= 80) {
          this.stats.confidence_high++;
          this.stats.status_populated++;
        } else if (statusDetection.confidence >= 50) {
          this.stats.confidence_medium++;
          this.stats.status_populated++;
        } else {
          this.stats.confidence_low++;
        }

        if ((rowIndex % 1000) === 0) {
          console.log(`Processed ${rowIndex} rows...`);
        }
      }

      console.log('\nEnrichment Analysis Complete:');
      console.log(`- Status populated (all confidence): ${this.stats.status_populated}`);
      console.log(`- Status high confidence (>80%): ${this.stats.confidence_high}`);
      console.log(`- Status medium confidence (>=50%): ${this.stats.confidence_medium}`);
      console.log(`- Status low confidence (<50%): ${this.stats.confidence_low}`);
      console.log(`- Layouts populated: ${this.stats.layout_populated}`);
      console.log(`- Layouts flagged: ${this.stats.flagged}`);

      if (!dryRun) {
        console.log('\nApplying updates to sheet...');
        // TODO: Batch write updates
      }

      return {
        stats: this.stats,
        statusUpdates,
        layoutUpdates,
        flaggedRows: this.flaggedRows,
        dryRun
      };

    } catch (error) {
      console.error('Error analyzing and mapping:', error);
      throw error;
    }
  }

  /**
   * Apply batch updates to sheet
   */
  async applyUpdates(statusUpdates, layoutUpdates) {
    try {
      console.log('Applying updates to organized sheet...');
      
      const batchData = [];

      // Add status updates (Column N)
      statusUpdates.forEach(update => {
        batchData.push({
          range: `${this.sheetName}!N${update.rowIndex + 1}`,
          values: [[update.value]]
        });
      });

      // Add layout updates (Column O)
      layoutUpdates.forEach(update => {
        batchData.push({
          range: `${this.sheetName}!O${update.rowIndex + 1}`,
          values: [[update.value]]
        });
      });

      // Batch update in chunks of 100
      for (let i = 0; i < batchData.length; i += 100) {
        const chunk = batchData.slice(i, i + 100);
        console.log(`Applying batch ${Math.floor(i / 100) + 1}...`);

        await this.sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: this.sheetId,
          requestBody: {
            data: chunk,
            valueInputOption: 'RAW'
          },
          auth: this.authClient
        });
      }

      console.log(`Applied ${batchData.length} updates total`);
      return { success: true, updatesApplied: batchData.length };

    } catch (error) {
      console.error('Error applying updates:', error);
      throw error;
    }
  }

  /**
   * Generate enrichment report
   */
  generateReport(analysis) {
    const report = {
      timestamp: new Date().toISOString(),
      sheetId: this.sheetId,
      sheetName: this.sheetName,
      analysis: analysis,
      columnMappings: this.columnMappings,
      statistics: this.stats,
      flaggedRowsCount: this.flaggedRows.length,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.stats.confidence_low > 0) {
      recommendations.push({
        issue: 'Low Confidence Status Detection',
        count: this.stats.confidence_low,
        action: `${this.stats.confidence_low} records have low confidence status assignments. Consider manual review.`
      });
    }

    if (this.stats.flagged > 0) {
      recommendations.push({
        issue: 'Undetectable Layouts',
        count: this.stats.flagged,
        action: `${this.stats.flagged} records could not have layout detected. Consider manual assignment.`
      });
    }

    if (this.stats.status_populated === this.stats.total_processed) {
      recommendations.push({
        issue: 'Complete Status Population',
        action: 'All records have PropertyStatus values assigned.'
      });
    }

    return recommendations;
  }
}

export default EnrichedSheetBuilder;
