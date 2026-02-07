/**
 * Test Data Fixtures
 * Shared test data for all unit and integration tests
 * 
 * Usage:
 * import { getMockSheetData, getMockPhoneRows, etc } from './fixtures/testData.js'
 */

/**
 * Mock sheet data for SheetsService tests
 */
export const mockSheetData = {
  simple: {
    range: 'Sheet1!A1:C3',
    majorDimension: 'ROWS',
    values: [
      ['Name', 'Email', 'Phone'],
      ['John Doe', 'john@example.com', '971501234567'],
      ['Jane Smith', 'jane@example.com', '971509876543']
    ]
  },
  
  empty: {
    range: 'Sheet1!A1:C1',
    majorDimension: 'ROWS',
    values: [['Name', 'Email', 'Phone']]
  },
  
  large: {
    range: 'Sheet1!A1:C1001',
    majorDimension: 'ROWS',
    values: Array.from({ length: 1000 }, (_, i) => [
      `User ${i + 1}`,
      `user${i + 1}@example.com`,
      `97150${String(1000000 + i).slice(-7)}`
    ]).unshift(['Name', 'Email', 'Phone']) || []
  },
  
  withMergedCells: {
    range: 'Sheet1!A1:E5',
    majorDimension: 'ROWS',
    values: [
      ['Header 1', 'Header 2', 'Header 3', 'Header 4', 'Header 5'],
      ['Data 1', 'Data 2', 'Data 3', 'Data 4', 'Data 5'],
      ['Data 6', '', 'Data 8', 'Data 9', 'Data 10'],
      ['Data 11', 'Data 12', 'Data 13', '', 'Data 15']
    ]
  }
};

/**
 * Mock phone number rows (variable column layout)
 */
export const mockPhoneRows = {
  standardLayout: [
    ['Ali Mohammed', 'Ali@company.com', '', '', '', '971501234567', '', '971509876543'],
    ['Fatima Hassan', 'Fatima@company.com', '', '', '', '971501234568', '', '971509876544'],
    ['Omar Ahmed', 'Omar@company.com', '', '', '', '971501234569', '', '971509876545']
  ],
  
  withUAECodes: [
    ['Name', '971501234567', '971509876543'],
    ['User 1', '971505551111', '971565552222'],
    ['User 2', '971551234567', '971501234567']
  ],
  
  withInternationalCodes: [
    ['Name', '+44 7700 900123', '+1 212 555 0100'],
    ['UK User', '+44 20 7946 0958', '+44 121 496 0000'],
    ['US User', '+1 415 550 0123', '+1 202 555 0173']
  ],
  
  mixedFormats: [
    ['Name', '+ 971 50 123 4567', '0501234567', '9715012345670001'],
    ['User 1', '971-50-123-4567', '050-123-4567', '971(50)1234567'],
    ['User 2', '971.501.234.567', '(050) 123-4567', '+971 50 123 4567']
  ],
  
  withInvalidNumbers: [
    ['Name', 'not-a-number', '123', 'abc-def-ghij'],
    ['User 1', '', '', ''],
    ['User 2', '971501234567', 'invalid', '971509876543']
  ],
  
  empty: [],
  
  singleRow: [
    ['Ali Mohammed', '971501234567']
  ]
};

/**
 * Mock Spreadsheet IDs
 */
export const mockSpreadsheetIds = {
  valid: 'test-spreadsheet-123abc456def789ghi',
  invalid: 'invalid-id',
  malformed: 'not-a-valid-id-format',
  empty: ''
};

/**
 * Mock API responses
 */
export const mockAPIResponses = {
  successGetValues: {
    status: 200,
    data: {
      range: 'Sheet1!A1:C3',
      majorDimension: 'ROWS',
      values: [
        ['Name', 'Email', 'Phone'],
        ['Test User', 'test@example.com', '971501234567']
      ]
    }
  },
  
  emptyGetValues: {
    status: 200,
    data: {
      range: 'Sheet1!A1:C1',
      majorDimension: 'ROWS',
      values: [['Name', 'Email', 'Phone']]
    }
  },
  
  successAppend: {
    status: 200,
    data: {
      spreadsheetId: 'test-123',
      updates: {
        spreadsheetId: 'test-123',
        updatedRange: 'Sheet1!A4:C4',
        updatedRows: 1,
        updatedColumns: 3
      }
    }
  },
  
  successUpdate: {
    status: 200,
    data: {
      spreadsheetId: 'test-123',
      updatedRange: 'Sheet1!B2',
      updatedRows: 1,
      updatedColumns: 1,
      updatedCells: 1
    }
  },
  
  errorUnauthorized: {
    status: 401,
    message: 'Unauthorized'
  },
  
  errorNotFound: {
    status: 404,
    message: 'Spreadsheet not found'
  }
};

/**
 * Phone validation test cases
 */
export const phoneValidationTests = {
  validUAE: [
    '971501234567',
    '971509876543',
    '971505551111',
    '+971501234567',
    '00971501234567',
    '0501234567'
  ],
  
  validInternational: [
    '+44 7700 900123',
    '+1 212 555 0100',
    '+49 30 12345678',
    '+33 1 42 34 56 78'
  ],
  
  invalid: [
    'not-a-number',
    '123',
    'abc-def-ghij',
    '971501234',  // Too short
    '97150123456789',  // Too long
    '',
    null,
    undefined
  ]
};

/**
 * Performance test data
 */
export const performanceTestData = {
  rows100: Array.from({ length: 100 }, (_, i) => [
    `User ${i + 1}`,
    `user${i + 1}@example.com`,
    `97150${String(1000000 + i).slice(-7)}`
  ]),
  
  rows1000: Array.from({ length: 1000 }, (_, i) => [
    `User ${i + 1}`,
    `user${i + 1}@example.com`,
    `97150${String(1000000 + i).slice(-7)}`
  ]),
  
  rows10000: Array.from({ length: 10000 }, (_, i) => [
    `User ${i + 1}`,
    `user${i + 1}@example.com`,
    `97150${String(1000000 + i).slice(-7)}`
  ])
};

/**
 * Cache test scenarios
 */
export const cacheScenarios = {
  cacheHit: {
    key: 'sheet1:range1',
    data: mockSheetData.simple,
    ttl: 3600000
  },
  
  cacheMiss: {
    key: 'sheet2:range2',
    data: null
  },
  
  cacheExpired: {
    key: 'sheet3:range3',
    data: mockSheetData.simple,
    createdAt: Date.now() - 4000000  // Older than TTL
  }
};

/**
 * Error scenarios
 */
export const errorScenarios = {
  noAuth: {
    error: 'Unauthorized',
    code: 401,
    message: 'Authentication required'
  },
  
  noSheet: {
    error: 'Not Found',
    code: 404,
    message: 'Spreadsheet not found'
  },
  
  invalidRange: {
    error: 'Invalid Range',
    code: 400,
    message: 'The range is invalid'
  },
  
  quotaExceeded: {
    error: 'Too Many Requests',
    code: 429,
    message: 'Rate limit exceeded'
  },
  
  networkError: {
    error: 'Network Error',
    code: 0,
    message: 'Failed to fetch'
  }
};

/**
 * Legacy migration test data
 */
export const legacyMigrationData = {
  oldPhoneExtractionCall: {
    input: {
      rows: mockPhoneRows.standardLayout,
      columns: [5, 7]
    },
    expectedOutput: {
      primary: ['971501234567', '971501234568', '971501234569'],
      secondary: ['971509876543', '971509876544', '971509876545']
    }
  },
  
  oldGetSheetCall: {
    input: {
      spreadsheetId: mockSpreadsheetIds.valid,
      range: 'Sheet1'
    },
    expectedOutput: mockSheetData.simple
  }
};

/**
 * Batch operation test data
 */
export const batchOperationData = {
  multipleRows: [
    ['John Doe', 'john@example.com', '971501234567'],
    ['Jane Smith', 'jane@example.com', '971509876543'],
    ['Bob Johnson', 'bob@example.com', '971505551111']
  ],
  
  multipleRanges: [
    { range: 'Sheet1!A1:C3', values: [[1, 2, 3], [4, 5, 6]] },
    { range: 'Sheet1!E1:G3', values: [[7, 8, 9], [10, 11, 12]] }
  ],
  
  bulkUpdate: [
    { range: 'Sheet1!B2', values: [['updated@example.com']] },
    { range: 'Sheet1!C2', values: [['971501111111']] },
    { range: 'Sheet1!B3', values: [['another@example.com']] }
  ]
};

/**
 * Helper function to create mock authentication service
 */
export function getMockAuthService() {
  return {
    getAuthClient: async () => ({
      auth: 'test-token'
    }),
    isAuthenticated: () => true,
    refreshToken: async () => true
  };
}

/**
 * Helper function to create mock Sheets API
 */
export function getMockSheetsAPI() {
  return {
    spreadsheets: {
      values: {
        get: async (params) => ({ data: mockSheetData.simple }),
        append: async (params) => mockAPIResponses.successAppend.data,
        update: async (params) => mockAPIResponses.successUpdate.data,
        batchUpdate: async (params) => ({ data: { responses: [] } })
      }
    }
  };
}

/**
 * Helper to create custom mock sheet data
 */
export function createMockSheetData(rows, columns = 3) {
  return {
    range: `Sheet1!A1:${String.fromCharCode(64 + columns)}${rows.length}`,
    majorDimension: 'ROWS',
    values: rows
  };
}

export default {
  mockSheetData,
  mockPhoneRows,
  mockSpreadsheetIds,
  mockAPIResponses,
  phoneValidationTests,
  performanceTestData,
  cacheScenarios,
  errorScenarios,
  legacyMigrationData,
  batchOperationData,
  getMockAuthService,
  getMockSheetsAPI,
  createMockSheetData
};
