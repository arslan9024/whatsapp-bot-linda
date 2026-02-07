/**
 * Sheet Data Analyzer Service
 * Analyzes sheet structure, finds columns, identifies data types
 * 
 * Date: February 8, 2026
 * Purpose: Understand original sheet structure before transforming to organized format
 */

import { GoogleServicesConsolidated } from '../GoogleServicesConsolidated.js';
import { logger } from '../utils/logger.js';

class SheetDataAnalyzer {
  /**
   * Analyze sheet structure
   * @param {string} sheetId - Google Sheet ID
   * @param {string} range - Range to analyze (default: "Sheet1")
   * @returns {Promise<Object>} Analysis results
   */
  static async analyzeSheet(sheetId, range = 'Sheet1') {
    try {
      logger.info('Starting sheet analysis', { sheetId, range });

      // Get all data from sheet
      const sheetsService = await GoogleServicesConsolidated.getSheetsClient();
      const response = await sheetsService.getValues(sheetId, range);
      
      if (!response || !response.values || response.values.length === 0) {
        throw new Error('Sheet is empty or cannot be accessed');
      }

      const values = response.values;
      const totalRows = values.length;
      const totalColumns = Math.max(...values.map(row => row.length));

      logger.info('Raw data retrieved', { totalRows, totalColumns });

      // Analyze header row
      const headerRow = values[0] || [];
      const columnAnalysis = this._analyzeColumns(headerRow, values);

      // Analyze data rows
      const dataAnalysis = {
        totalRows,
        totalColumns,
        dataRows: totalRows - 1,
        columns: columnAnalysis,
        sampleData: {
          firstRow: values[1] || [],
          lastRow: values[values.length - 1] || [],
          middleRow: values[Math.floor(totalRows / 2)] || [],
        },
      };

      logger.info('Sheet analysis complete', {
        totalRows: dataAnalysis.totalRows,
        dataRows: dataAnalysis.dataRows,
        columns: dataAnalysis.columns.length,
      });

      return dataAnalysis;
    } catch (error) {
      logger.error('Failed to analyze sheet', { error: error.message, sheetId });
      throw error;
    }
  }

  /**
   * Analyze individual columns
   * @param {Array} headerRow - First row containing headers
   * @param {Array<Array>} allRows - All data rows
   * @returns {Array<Object>} Column analysis for each column
   */
  static _analyzeColumns(headerRow, allRows) {
    const columnAnalysis = [];

    for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
      const header = headerRow[colIndex] || `Column_${colIndex + 1}`;
      const columnData = allRows.slice(1).map(row => row[colIndex] || null);

      const analysis = {
        index: colIndex,
        header: header.trim(),
        isEmpty: columnData.every(val => !val),
        nonEmptyCount: columnData.filter(val => val).length,
        percentFilled: Math.round((columnData.filter(val => val).length / columnData.length) * 100),
        dataTypes: this._detectDataTypes(columnData),
        sampleValues: columnData.filter(val => val).slice(0, 3),
      };

      columnAnalysis.push(analysis);
    }

    return columnAnalysis;
  }

  /**
   * Detect data types in a column
   * @param {Array} columnData - Column values
   * @returns {Object} Data type frequencies
   */
  static _detectDataTypes(columnData) {
    const types = {
      number: 0,
      email: 0,
      phone: 0,
      url: 0,
      date: 0,
      text: 0,
      empty: 0,
    };

    columnData.forEach(val => {
      if (!val) {
        types.empty++;
      } else if (/^\d+$/.test(val)) {
        types.number++;
      } else if (/^[\w.-]+@[\w.-]+\.\w+$/.test(val)) {
        types.email++;
      } else if (/^(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/.test(val)) {
        types.phone++;
      } else if (/^https?:\/\//.test(val)) {
        types.url++;
      } else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(val)) {
        types.date++;
      } else {
        types.text++;
      }
    });

    return types;
  }

  /**
   * Get important columns (non-empty, data-rich columns)
   * @param {Object} analysis - Sheet analysis from analyzeSheet()
   * @param {number} minFillPercentage - Minimum fill % to consider important (default: 50)
   * @returns {Array<Object>} Important columns
   */
  static getImportantColumns(analysis, minFillPercentage = 50) {
    return analysis.columns
      .filter(
        col => !col.isEmpty && col.percentFilled >= minFillPercentage
      )
      .sort((a, b) => b.percentFilled - a.percentFilled);
  }

  /**
   * Get column summary for display
   * @param {Object} analysis - Sheet analysis
   * @returns {string} Formatted summary
   */
  static getSummary(analysis) {
    const importantCols = this.getImportantColumns(analysis);
    
    let summary = `
📊 SHEET ANALYSIS REPORT
═════════════════════════════════════════

Total Rows: ${analysis.totalRows}
Data Rows: ${analysis.dataRows}
Total Columns: ${analysis.totalColumns}

IMPORTANT COLUMNS (Fill > 50%):
`;

    importantCols.forEach(col => {
      summary += `
  Column ${col.index + 1}: ${col.header}
    ├─ Fill Rate: ${col.percentFilled}%
    ├─ Non-Empty: ${col.nonEmptyCount}/${analysis.dataRows}
    └─ Types: ${Object.entries(col.dataTypes)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => `${type}(${count})`)
      .join(', ')}
`;
    });

    summary += `
EMPTY COLUMNS (Fill = 0%):
  ${analysis.columns.filter(c => c.isEmpty).map(c => `${c.header} (Col ${c.index + 1})`).join(', ')}

═════════════════════════════════════════
`;

    return summary;
  }

  /**
   * Generate organized column schema
   * @param {Object} analysis - Sheet analysis
   * @returns {Array<string>} Recommended column headers for organized sheet
   */
  static generateOrganizedSchema(analysis) {
    const importantCols = this.getImportantColumns(analysis);
    
    // Map column headers to standardized names
    const schema = [];
    const headerLower = importantCols.map(c => c.header.toLowerCase());

    // Key columns to include
    const keyPatterns = {
      'Contact/Name': ['name', 'contact', 'owner', 'client', 'person'],
      'Phone': ['phone', 'mobile', 'contact number', 'whatsapp'],
      'Property': ['property', 'unit', 'apartment', 'project', 'area'],
      'Status': ['status', 'stage', 'state', 'condition'],
      'Price': ['price', 'amount', 'cost', 'value', 'payment'],
      'Date': ['date', 'time', 'created', 'updated', 'inquiry'],
      'Notes': ['note', 'remark', 'comment', 'description', 'details'],
    };

    // Match important columns to key patterns
    importantCols.forEach(col => {
      const colHeaderLower = col.header.toLowerCase();
      
      for (const [standardName, patterns] of Object.entries(keyPatterns)) {
        if (patterns.some(pattern => colHeaderLower.includes(pattern))) {
          if (!schema.includes(standardName)) {
            schema.push(standardName);
          }
          break;
        }
      }
    });

    // Add metadata columns
    schema.push('Import_Date');
    schema.push('Data_Quality_Score');

    return schema;
  }
}

export default SheetDataAnalyzer;
