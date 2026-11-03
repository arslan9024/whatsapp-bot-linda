/**
 * @file CsvExcelReportGenerator.js
 * @description Generates RFC-4180 compliant CSV exports with Excel UTF-8 BOM headers
 * for lead rosters, campaign conversion analytics, and audit logs.
 * Category: Core
 */

export class CsvExcelReportGenerator {
  /**
   * Escapes a single CSV cell value
   * @param {any} val
   * @returns {string}
   */
  escapeCell(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  /**
   * Generates a complete CSV string from headers and data rows
   * @param {Array<string>} headers
   * @param {Array<Object>} rows
   * @returns {string} UTF-8 CSV with Excel BOM
   */
  generateCsv(headers = [], rows = []) {
    const bom = '\uFEFF'; // UTF-8 BOM for Microsoft Excel compatibility
    const headerLine = headers.map(h => this.escapeCell(h)).join(',');

    const dataLines = rows.map(row => {
      return headers.map(h => this.escapeCell(row[h])).join(',');
    });

    return bom + [headerLine, ...dataLines].join('\r\n');
  }
}

export default new CsvExcelReportGenerator();
