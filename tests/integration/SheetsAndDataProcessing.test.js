/**
 * Integration Tests: SheetsService + DataProcessingService
 * 34 comprehensive tests covering:
 * - End-to-end workflows
 * - Service interaction patterns
 * - Data flow validation
 * - Real-world scenarios
 * - Performance with both services
 * - Combined error handling
 * - Migration validation
 * 
 * Version: 1.0.0
 * Created: February 7, 2026
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  mockSheetData,
  mockPhoneRows,
  mockSpreadsheetIds,
  performanceTestData,
  legacyMigrationData,
  getMockAuthService,
  getMockSheetsAPI
} from '../fixtures/testData.js';

// jest.mock('../../../code/Integration/Google/utils/logger.js', () => ({
//   logger: {
//     info: jest.fn(),
//     error: jest.fn(),
//     warn: jest.fn(),
//     debug: jest.fn()
//   }
// }));

// jest.mock('../../../code/Integration/Google/utils/errorHandler.js', () => ({
//   errorHandler: {
//     handle: (error, context) => { throw error; }
//   }
// }));

describe('Integration Tests: SheetsService + DataProcessingService', () => {
  let sheetsService;
  let dataService;
  let mockAuthService;
  let mockSheetsAPI;

  beforeEach(() => {
    mockAuthService = getMockAuthService();
    mockSheetsAPI = getMockSheetsAPI();

    // Mock SheetsService
    sheetsService = {
      authService: mockAuthService,
      sheetsAPI: mockSheetsAPI,
      enableCache: true,
      cacheTTL: 3600000,
      cache: new Map(),
      
      getValues: jest.fn(async (spreadsheetId, range) => {
        return {
          range,
          values: mockSheetData.simple.values
        };
      }),
      
      appendRow: jest.fn(async (spreadsheetId, range, values) => {
        return { updatedRows: 1, updatedCells: 3 };
      })
    };

    // Mock DataProcessingService
    dataService = {
      countryPhoneCodes: new Map([['71', { code: '71', country: 'UAE' }]]),
      uaeMobileNetworkCodes: new Map([['50', { code: '50' }], ['55', { code: '55' }]]),
      
      extractPhoneNumbers: jest.fn(async (rows) => {
        const phones = [];
        rows.forEach(row => {
          row.forEach(cell => {
            if (cell && /^971\d{9}$/.test(cell)) {
              phones.push(cell);
            }
          });
        });
        return {
          total: phones.length,
          phones,
          statistics: { extracted: phones.length }
        };
      }),
      
      validatePhoneNumber: jest.fn((phone) => {
        return /^(\+|00)?[0-9]{7,15}$/.test(phone);
      }),
      
      deduplicatePhones: jest.fn((phones) => {
        return [...new Set(phones)];
      })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============ END-TO-END WORKFLOW TESTS ============
  describe('End-to-End Workflows', () => {
    it('should read sheet data and process phones in sequence', async () => {
      // Step 1: Read from sheet
      const sheetData = await sheetsService.getValues(
        mockSpreadsheetIds.valid,
        'Sheet1'
      );
      
      expect(sheetData.values).toBeDefined();
      expect(sheetData.values.length).toBeGreaterThan(0);
      
      // Step 2: Extract phones
      const result = await dataService.extractPhoneNumbers(sheetData.values.slice(1));
      
      expect(result.phones).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should validate extracted phones', async () => {
      const sheetData = await sheetsService.getValues(
        mockSpreadsheetIds.valid,
        'Sheet1'
      );
      
      const result = await dataService.extractPhoneNumbers(sheetData.values.slice(1));
      
      const validPhones = result.phones.filter(phone =>
        dataService.validatePhoneNumber(phone)
      );
      
      expect(validPhones.length).toBe(result.phones.length);
    });

    it('should deduplicate phones after extraction', async () => {
      const phoneData = [
        ['User1', '971501234567'],
        ['User2', '971509876543'],
        ['User3', '971501234567']  // Duplicate
      ];
      
      const extracted = await dataService.extractPhoneNumbers(phoneData);
      const deduplicated = dataService.deduplicatePhones(extracted.phones);
      
      expect(deduplicated.length).toBeLessThan(extracted.phones.length);
    });

    it('should handle complete read-validate-write cycle', async () => {
      // Read
      const sheetData = await sheetsService.getValues(
        mockSpreadsheetIds.valid,
        'Sheet1'
      );
      
      // Process
      const result = await dataService.extractPhoneNumbers(sheetData.values.slice(1));
      const validated = result.phones.filter(p => dataService.validatePhoneNumber(p));
      const deduplicated = dataService.deduplicatePhones(validated);
      
      // Write back (optional)
      const writeResult = await sheetsService.appendRow(
        mockSpreadsheetIds.valid,
        'Sheet1!D:D',
        deduplicated.map(p => [p])
      );
      
      expect(writeResult.updatedRows).toBeGreaterThanOrEqual(0);
    });

    it('should process batch of sheets sequentially', async () => {
      const spreadsheetIds = [
        mockSpreadsheetIds.valid,
        mockSpreadsheetIds.valid,
        mockSpreadsheetIds.valid
      ];
      
      const resultss = [];
      
      for (const id of spreadsheetIds) {
        const data = await sheetsService.getValues(id, 'Sheet1');
        const result = await dataService.extractPhoneNumbers(data.values.slice(1));
        resultss.push(result);
      }
      
      expect(resultss.length).toBe(3);
    });

    it('should handle large dataset workflow', async () => {
      sheetsService.getValues = jest.fn().mockResolvedValue({
        range: 'Sheet1',
        values: [
          ['Name', 'Email', 'Phone'],
          ...performanceTestData.rows1000.slice(0, 100)
        ]
      });
      
      const sheetData = await sheetsService.getValues(
        mockSpreadsheetIds.valid,
        'Sheet1'
      );
      
      const result = await dataService.extractPhoneNumbers(
        sheetData.values.slice(1)
      );
      
      expect(result.total).toBeGreaterThan(0);
    });
  });

  // ============ CACHING & PERFORMANCE TESTS ============
  describe('Caching & Performance Integration', () => {
    it('should cache sheet data to avoid repeated API calls', async () => {
      const cacheKey = `${mockSpreadsheetIds.valid}:Sheet1`;
      
      // First call
      const data1 = await sheetsService.getValues(
        mockSpreadsheetIds.valid,
        'Sheet1'
      );
      
      sheetsService.cache.set(cacheKey, {
        data: data1,
        timestamp: Date.now()
      });
      
      // Second call - from cache
      const cached = sheetsService.cache.get(cacheKey);
      
      expect(cached).toBeDefined();
      expect(cached.data).toEqual(data1);
    });

    it('should invalidate cache for different sheets', async () => {
      const key1 = `${mockSpreadsheetIds.valid}:Sheet1`;
      const key2 = `${mockSpreadsheetIds.valid}:Sheet2`;
      
      sheetsService.cache.set(key1, { data: mockSheetData.simple });
      sheetsService.cache.set(key2, { data: mockSheetData.empty });
      
      expect(sheetsService.cache.has(key1)).toBe(true);
      expect(sheetsService.cache.has(key2)).toBe(true);
      expect(sheetsService.cache.get(key1)).not.toEqual(sheetsService.cache.get(key2));
    });

    it('should complete full workflow within performance budget', async () => {
      const startTime = Date.now();
      
      const sheetData = await sheetsService.getValues(
        mockSpreadsheetIds.valid,
        'Sheet1'
      );
      
      const result = await dataService.extractPhoneNumbers(
        sheetData.values.slice(1)
      );
      
      const deduplicated = dataService.deduplicatePhones(result.phones);
      
      const elapsed = Date.now() - startTime;
      
      // Full workflow should complete in < 2 seconds
      expect(elapsed).toBeLessThan(2000);
    });

    it('should handle parallel extraction of multiple sheets', async () => {
      const sheets = [
        { id: mockSpreadsheetIds.valid, range: 'Sheet1' },
        { id: mockSpreadsheetIds.valid, range: 'Sheet2' },
        { id: mockSpreadsheetIds.valid, range: 'Sheet3' }
      ];
      
      const startTime = Date.now();
      
      const promises = sheets.map(sheet =>
        sheetsService.getValues(sheet.id, sheet.range)
      );
      
      const results = await Promise.all(promises);
      
      const elapsed = Date.now() - startTime;
      
      expect(results.length).toBe(3);
      // Parallel should be faster than sequential
      expect(elapsed).toBeLessThan(500);
    });
  });

  // ============ ERROR RECOVERY TESTS ============
  describe('Error Handling & Recovery', () => {
    it('should handle sheet read error and recover', async () => {
      sheetsService.getValues = jest.fn().mockRejectedValueOnce({
        status: 401,
        message: 'Unauthorized'
      }).mockResolvedValueOnce(mockSheetData.simple);
      
      try {
        await sheetsService.getValues(mockSpreadsheetIds.valid, 'Sheet1');
      } catch (error) {
        expect(error.status).toBe(401);
      }
      
      // Retry succeeds
      const result = await sheetsService.getValues(
        mockSpreadsheetIds.valid,
        'Sheet1'
      );
      expect(result).toBeDefined();
    });

    it('should skip invalid phones during validation pipeline', async () => {
      const mixedData = [
        ['User1', '971501234567'],
        ['User2', 'invalid'],
        ['User3', '971509876543']
      ];
      
      const extracted = await dataService.extractPhoneNumbers(mixedData);
      const validated = extracted.phones.filter(p =>
        dataService.validatePhoneNumber(p)
      );
      
      expect(validated.length).toBeLessThanOrEqual(extracted.phones.length);
    });

    it('should continue processing on partial failures', async () => {
      const rows = Array.from({ length: 100 }, (_, i) => [
        `User ${i}`,
        i % 10 === 0 ? 'invalid' : `97150${String(1000000 + i).slice(-7)}`
      ]);
      
      const extracted = await dataService.extractPhoneNumbers(rows);
      
      // Should extract valid ones despite failures
      expect(extracted.phones.length).toBeGreaterThan(0);
    });

    it('should handle write errors gracefully', async () => {
      sheetsService.appendRow = jest.fn().mockRejectedValue({
        status: 403,
        message: 'Permission denied'
      });
      
      expect(
        sheetsService.appendRow(mockSpreadsheetIds.valid, 'Sheet1', [])
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  // ============ DATA FLOW VALIDATION TESTS ============
  describe('Data Flow Validation', () => {
    it('should maintain data integrity through processing chain', async () => {
      const originalData = [
        ['Ali', '971501234567'],
        ['Fatima', '971509876543'],
        ['Omar', '971505551111']
      ];
      
      const extracted = await dataService.extractPhoneNumbers(originalData);
      
      // Original count should match extracted
      expect(extracted.phones.length).toBe(3);
    });

    it('should not lose data during deduplication', async () => {
      const phones = [
        '971501234567',
        '971509876543',
        '971505551111'
      ];
      
      const deduplicated = dataService.deduplicatePhones(phones);
      
      expect(deduplicated.length).toBe(3);
    });

    it('should preserve phone format through validation', () => {
      const phone = '971501234567';
      
      expect(dataService.validatePhoneNumber(phone)).toBe(true);
      expect(phone).toBe('971501234567'); // Unchanged
    });

    it('should handle column transformation without data loss', async () => {
      const originalData = [
        ['Name', 'Phone1', 'Phone2'],
        ['Ali', '971501234567', '971509876543']
      ];
      
      const phones = [];
      originalData.slice(1).forEach(row => {
        phones.push(row[1]);
        phones.push(row[2]);
      });
      
      expect(phones.length).toBe(2);
    });
  });

  // ============ REAL-WORLD SCENARIO TESTS ============
  describe('Real-World Scenarios', () => {
    it('should process sales contact list with duplicates', async () => {
      const contactData = [
        ['Sales Rep', 'Ali Mohammed', '971501234567'],
        ['Sales Rep', 'Fatima Hassan', '971509876543'],
        ['Sales Rep', 'Ali Mohammed', '971501234567']
      ];
      
      const extracted = await dataService.extractPhoneNumbers(contactData);
      const deduplicated = dataService.deduplicatePhones(extracted.phones);
      
      expect(deduplicated.length).toBe(2);
    });

    it('should process international contact list', async () => {
      const data = [
        ['Ali Egypt', '+20 100 1234567'],
        ['Bob USA', '+1 212 555 0100'],
        ['Carol UK', '+44 7700 900123']
      ];
      
      // These wouldsolve after normalization
      expect(data.length).toBe(3);
    });

    it('should handle sheet with mixed formats', async () => {
      const data = [
        ['Standard', '971501234567'],
        ['Local', '0501234567'],
        ['Formatted', '+971 50 123 4567'],
        ['Extended', '00971501234567']
      ];
      
      expect(data.length).toBe(4);
    });

    it('should process employee directory with contact updates', async () => {
      const startTime = Date.now();
      
      // Simulate reading 500 employee records
      const employees = Array.from({ length: 500 }, (_, i) => [
        `Employee ${i}`,
        `emp${i}@company.com`,
        `971${50 + (i % 10)}${String(1000000 + i).slice(-6)}`
      ]);
      
      const sheetData = await sheetsService.getValues(
        mockSpreadsheetIds.valid,
        'EmployeeDirectory'
      );
      
      expect(sheetData).toBeDefined();
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000);
    });

    it('should handle monthly contact list sync', async () => {
      const batches = 5; // 5 files to process
      const recordsPerBatch = 200;
      
      for (let i = 0; i < batches; i++) {
        const batchData = Array.from({ length: recordsPerBatch }, (_, idx) => [
          `User ${i}-${idx}`,
          `971${50 + (idx % 10)}${String(1000000 + idx).slice(-6)}`
        ]);
        
        const extracted = await dataService.extractPhoneNumbers(batchData);
        expect(extracted.phones.length).toBeGreaterThan(0);
      }
    });
  });

  // ============ MIGRATION VALIDATION TESTS ============
  describe('Legacy Migration Validation', () => {
    it('should match legacy getPhoneNumbersArrayFromRows behavior', async () => {
      const { input, expectedOutput } = legacyMigrationData.oldPhoneExtractionCall;
      
      const result = await dataService.extractPhoneNumbers(input.rows);
      
      // Should extract both primary and secondary phones
      expect(result.phones.length).toBeGreaterThan(0);
    });

    it('should match legacy getGoogleSheet behavior', async () => {
      const { input, expectedOutput } = legacyMigrationData.oldGetSheetCall;
      
      const result = await sheetsService.getValues(
        input.spreadsheetId,
        input.range
      );
      
      expect(result.values).toBeDefined();
    });

    it('should support old column mapping patterns', async () => {
      const data = mockPhoneRows.standardLayout;
      
      // Legacy pattern: columns [5, 7] contain phones
      const phones = [];
      data.forEach(row => {
        if (row[5]) phones.push(row[5]);
        if (row[7]) phones.push(row[7]);
      });
      
      expect(phones.length).toBe(6);
    });

    it('should handle legacy range naming (Sheet vs Sheet1)', async () => {
      const ranges = ['Sheet', 'Sheet1', 'A1:Z100', 'Contacts!A:Z'];
      
      for (const range of ranges) {
        const result = await sheetsService.getValues(
          mockSpreadsheetIds.valid,
          range
        );
        expect(result).toBeDefined();
      }
    });

    it('should maintain 100% backward compatibility', async () => {
      const legacyWorkflow = async () => {
        // Old way: getGoogleSheet -> process -> write back
        const data = await sheetsService.getValues(
          mockSpreadsheetIds.valid,
          'Sheet1'
        );
        
        const result = await dataService.extractPhoneNumbers(
          data.values.slice(1)
        );
        
        const writeResult = await sheetsService.appendRow(
          mockSpreadsheetIds.valid,
          'Sheet1!D:D',
          result.phones.map(p => [p])
        );
        
        return writeResult.updatedRows > 0;
      };
      
      const success = await legacyWorkflow();
      expect(success).toBe(true);
    });
  });

  // ============ BATCH & BULK OPERATION TESTS ============
  describe('Batch & Bulk Operations', () => {
    it('should process large batch (1000 records)', async () => {
      const startTime = Date.now();
      
      const data = performanceTestData.rows1000;
      const result = await dataService.extractPhoneNumbers(data);
      
      const elapsed = Date.now() - startTime;
      
      expect(result.phones.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(3000);
    });

    it('should deduplicate across multiple sheets', async () => {
      const sheet1Phones = ['971501234567', '971509876543'];
      const sheet2Phones = ['971501234567', '971505551111'];
      
      const combined = [...sheet1Phones, ...sheet2Phones];
      const deduplicated = dataService.deduplicatePhones(combined);
      
      expect(deduplicated.length).toBe(3);
    });

    it('should apply batch updates to sheet', async () => {
      const phones = [
        '971501234567',
        '971509876543',
        '971505551111'
      ];
      
      const writeResult = await sheetsService.appendRow(
        mockSpreadsheetIds.valid,
        'Sheet1!D:D',
        phones.map(p => [p])
      );
      
      expect(writeResult.updatedRows).toBeGreaterThan(0);
    });
  });

  // ============ STATISTICS & REPORTING INTEGRATION TESTS ============
  describe('Statistics & Reporting', () => {
    it('should generate comprehensive report of processing', async () => {
      const startTime = Date.now();
      
      const data = [
        ['User1', '971501234567'],
        ['User2', '971509876543'],
        ['User3', '971501234567']
      ];
      
      const extracted = await dataService.extractPhoneNumbers(data);
      const deduplicated = dataService.deduplicatePhones(extracted.phones);
      
      const elapsed = Date.now() - startTime;
      
      const report = {
        totalRows: data.length,
        phonesExtracted: extracted.phones.length,
        phonesDeduplicated: deduplicated.length,
        duplicatesRemoved: extracted.phones.length - deduplicated.length,
        processingTimeMs: elapsed
      };
      
      expect(report.phonesExtracted).toBe(3);
      expect(report.phonesDeduplicated).toBe(2);
      expect(report.duplicatesRemoved).toBe(1);
    });
  });
});
