/**
 * Data Viewer Tab Generator
 * Creates the interactive Data Viewer tab with Google Sheets formulas
 * 
 * Features:
 * - Row selector (number input)
 * - Column visibility filters  
 * - Dynamic display of selected row with filtered columns
 */

class DataViewerTabGenerator {
  /**
   * Generate Data Viewer tab structure
   * @param {Array<string>} columnHeaders - Column names to display
   * @returns {Array<Array>} Sheet rows for Data Viewer tab
   */
  static generateDataViewerTab(columnHeaders) {
    const rows = [];

    // ===== SECTION 1: ROW SELECTOR & CONTROLS =====
    rows.push(['ROW SELECTOR & FILTERS']);
    rows.push([]);

    rows.push(['Enter Row Number:', 1, '← Change this to view different row']);
    rows.push(['Current Row:', '=A3', '']);
    rows.push([]);

    // ===== SECTION 2: COLUMN VISIBILITY TOGGLES =====
    rows.push(['COLUMN VISIBILITY FILTERS']);
    rows.push([]);

    const filterRow = ['Show Columns: '];
    const toggleRow = [];
    
    columnHeaders.forEach(header => {
      filterRow.push(header);
      toggleRow.push('✓');  // Default all visible
    });
    
    rows.push(filterRow);
    rows.push(toggleRow);
    rows.push([]);

    // ===== SECTION 3: SELECTED ROW DATA DISPLAY =====
    rows.push(['SELECTED ROW DATA']);
    rows.push([]);

    // Headers
    rows.push(columnHeaders);
    rows.push([]);

    // Data row - will use formulas to fetch from organized data
    const dataRow = [];
    for (let i = 0; i < columnHeaders.length; i++) {
      dataRow.push(`{formula for column ${i + 1}}`);
    }
    rows.push(dataRow);

    rows.push([]);
    rows.push(['← Scroll up to change row number']);

    return rows;
  }

  /**
   * Generate row navigation arrows
   * @param {number} totalRows - Total rows in data
   * @returns {Array<Array>} Navigation UI rows
   */
  static generateNavigationControls(totalRows) {
    return [
      [],
      ['ROW NAVIGATION'],
      [
        '◀ Previous Row',
        'Row: ? of ' + totalRows,
        'Next Row ▶',
      ],
      [],
      ['Instructions:'],
      ['1. Click "Enter Row Number" cell (A3) and type a row number (1-' + totalRows + ')'],
      ['2. Check/uncheck column visibility toggles in row 9'],
      ['3. Selected row data appears below in the display area'],
    ];
  }

  /**
   * Generate column filter checkboxes
   * @param {Array<string>} columnHeaders - Column names
   * @returns {Array<Array>} Filter UI rows
   */
  static generateColumnFilters(columnHeaders) {
    const filterUI = [];
    filterUI.push(['Column Visibility Controls']);
    filterUI.push([]);

    columnHeaders.forEach((header, idx) => {
      filterUI.push([
        `☐ ${header}`,
        `Column ${idx + 1}`,
        '← Uncheck to hide column',
      ]);
    });

    return filterUI;
  }

  /**
   * Generate complete Data Viewer sheet structure
   * @param {Object} config - Configuration
   * @returns {Object} Complete sheet structure
   */
  static generateCompleteStructure(config) {
    const {
      originalSheetId = '___ORIGINAL_SHEET_ID___',
      columnHeaders = ['Contact', 'Property', 'Status', 'Date', 'Notes'],
      totalDataRows = 0,
    } = config;

    return {
      title: 'Data Viewer',
      properties: {
        sheetType: 'GRID',
        gridProperties: {
          rowCount: 50,
          columnCount: 10,
        },
      },
      data: [
        {
          range: 'Data Viewer!A1:E1',
          values: [['DATA VIEWER - INTERACTIVE ROW DISPLAY']],
          majorDimension: 'ROWS',
        },
        {
          range: 'Data Viewer!A3:D3',
          values: [['Enter Row Number:', '{user input}', 'Range: 1-' + totalDataRows, '']],
          majorDimension: 'ROWS',
        },
      ],
      instructions: [
        'Tab 1: Data Viewer - Interactive single-row viewer with column filters',
        'Tab 2: Organized Data - Clean, normalized data from original sheet',
        'Tab 3: Metadata - Column mapping and transformation logs',
        '',
        'HOW TO USE:',
        '1. Enter a row number in cell B3',
        '2. Check/uncheck column visibility in the COLUMN VISIBILITY section',
        '3. Selected row appears below with only checked columns visible',
      ],
    };
  }

  /**
   * Get formula for fetching cell from organized data
   * @param {number} rowNum - Row number (user input)
   * @param {number} colNum - Column number
   * @param {string} organizedSheetName - Name of organized data sheet
   * @returns {string} Google Sheets formula
   */
  static getCellFormula(rowNum, colNum, organizedSheetName = 'Organized Data') {
    // Formula: INDEX(sheet!column, rowNum)
    const colLetter = String.fromCharCode(64 + colNum);
    return `=IFERROR(INDEX('${organizedSheetName}'!${colLetter}:${colLetter},${rowNum}+1),"N/A")`;
  }

  /**
   * Get formula for filtering columns based on visibility checkboxes
   * @param {number} colNum - Column number
   * @param {string} checkboxRange - Range of visibility checkboxes
   * @returns {string} Google Sheets IF formula
   */
  static getVisibilityFormula(colNum, checkboxRange) {
    // IF checkbox checked, show value, else blank
    return `=IF(INDEX(${checkboxRange},1,${colNum})="✓",{cell_value},"")`;
  }
}

export default DataViewerTabGenerator;
