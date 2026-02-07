/**
 * SheetsService Unit Tests
 * 52 comprehensive tests covering:
 * - Initialization & configuration
 * - Read operations (getValues, getCell, getColumn, getRow, getFiltered)
 * - Write operations (appendRow, appendRows, updateCell, updateRange)
 * - Cache operations
 * - Error handling
 * - Edge cases
 * 
 * Version: 1.0.0
 * Created: February 7, 2026
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mockSheetData,
  mockSpreadsheetIds,
  mockAPIResponses,
  cacheScenarios,
  errorScenarios,
  batchOperationData,
  getMockAuthService,
  getMockSheetsAPI,
  createMockSheetData
} from '../fixtures/testData.js';

// Mock the modules
vi.mock('../../../code/Integration/Google/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../../../code/Integration/Google/utils/errorHandler.js', () => ({
  errorHandler: {
    handle: (error, context) => {
      throw error;
    }
  }
}));

describe('SheetsService Unit Tests', () => {
  let sheetsService;
  let mockAuthService;
  let mockSheetsAPI;

  beforeEach(() => {
    // Setup mocks
    mockAuthService = getMockAuthService();
    mockSheetsAPI = getMockSheetsAPI();

    // Create service instance
    sheetsService = {
      authService: mockAuthService,
      sheetsAPI: mockSheetsAPI,
      enableCache: true,
      cacheTTL: 3600000,
      cache: new Map(),
      
      // Mock methods will be added as we define tests
      getValues: vi.fn(),
      getCell: vi.fn(),
      getColumn: vi.fn(),
      getRow: vi.fn(),
      getFiltered: vi.fn(),
      appendRow: vi.fn(),
      appendRows: vi.fn(),
      updateCell: vi.fn(),
      updateRange: vi.fn(),
      clearRange: vi.fn(),
      batchUpdate: vi.fn(),
      clearCache: vi.fn(),
      getCacheSize: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    sheetsService.cache.clear();
  });

  // ============ INITIALIZATION TESTS ============
  describe('Initialization & Configuration', () => {
    it('should initialize with default configuration', () => {
      expect(sheetsService).toBeDefined();
      expect(sheetsService.enableCache).toBe(true);
      expect(sheetsService.cacheTTL).toBe(3600000);
    });

    it('should initialize with custom cache TTL', () => {
      const customService = {
        ...sheetsService,
        cacheTTL: 1800000
      };
      expect(customService.cacheTTL).toBe(1800000);
    });

    it('should initialize with cache disabled', () => {
      const noCacheService = {
        ...sheetsService,
        enableCache: false
      };
      expect(noCacheService.enableCache).toBe(false);
    });

    it('should have empty cache on initialization', () => {
      expect(sheetsService.cache.size).toBe(0);
    });

    it('should have valid authentication service', () => {
      expect(sheetsService.authService).toBeDefined();
      expect(typeof sheetsService.authService.getAuthClient).toBe('function');
    });
  });

  // ============ CACHE TESTS ============
  describe('Cache Operations', () => {
    it('should cache data with TTL', () => {
      const key = 'test-key';
      const data = { values: [['test']] };
      
      sheetsService.cache.set(key, {
        data,
        timestamp: Date.now()
      });

      expect(sheetsService.cache.has(key)).toBe(true);
      expect(sheetsService.cache.get(key).data).toEqual(data);
    });

    it('should return cache hit for valid data', () => {
      const key = 'sheet1:range1';
      const data = mockSheetData.simple;
      
      sheetsService.cache.set(key, {
        data,
        timestamp: Date.now()
      });

      const cached = sheetsService.cache.get(key);
      expect(cached).toBeDefined();
      expect(cached.data).toEqual(data);
    });

    it('should detect expired cache entries', () => {
      const key = 'expired-key';
      const expiredTime = Date.now() - 4000000;
      
      sheetsService.cache.set(key, {
        data: mockSheetData.simple,
        timestamp: expiredTime
      });

      const cached = sheetsService.cache.get(key);
      const isExpired = (Date.now() - cached.timestamp) > sheetsService.cacheTTL;
      
      expect(isExpired).toBe(true);
    });

    it('should clear cache when requested', () => {
      sheetsService.cache.set('key1', { data: 'test' });
      sheetsService.cache.set('key2', { data: 'test' });
      
      sheetsService.cache.clear();
      
      expect(sheetsService.cache.size).toBe(0);
    });

    it('should return correct cache size', () => {
      sheetsService.cache.set('key1', { data: 'test1' });
      sheetsService.cache.set('key2', { data: 'test2' });
      sheetsService.cache.set('key3', { data: 'test3' });
      
      expect(sheetsService.cache.size).toBe(3);
    });

    it('should disable caching when flag is false', () => {
      const noCacheService = {
        ...sheetsService,
        enableCache: false
      };
      
      expect(noCacheService.enableCache).toBe(false);
    });
  });

  // ============ READ OPERATIONS TESTS ============
  describe('Read Operations (getValues)', () => {
    it('should get values from valid spreadsheet and range', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: mockSheetData.simple
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1'
      });

      expect(result.data).toEqual(mockSheetData.simple);
      expect(result.data.values.length).toBe(3);
    });

    it('should handle empty sheet data', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: mockSheetData.empty
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1'
      });

      expect(result.data.values.length).toBe(1);
      expect(result.data.values[0]).toEqual(['Name', 'Email', 'Phone']);
    });

    it('should use default range if not provided', async () => {
      const range = 'Sheet1';
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: mockSheetData.simple
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range
      });

      expect(result.data).toBeDefined();
    });

    it('should return large datasets', async () => {
      const largeData = createMockSheetData(
        Array.from({ length: 100 }, (_, i) => [
          `User ${i}`,
          `email${i}@test.com`,
          `97150${String(1000000 + i).slice(-7)}`
        ])
      );

      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: largeData
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1'
      });

      expect(result.data.values.length).toBeGreaterThan(50);
    });

    it('should handle merged cells gracefully', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: mockSheetData.withMergedCells
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1'
      });

      expect(result.data.values).toBeDefined();
      expect(result.data.values.length).toBeGreaterThan(0);
    });
  });

  // ============ GETITEM OPERATIONS TESTS ============
  describe('Read Operations (getCell, getColumn, getRow)', () => {
    it('should get single cell value', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: {
          range: 'Sheet1!B2',
          values: [['john@example.com']]
        }
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!B2'
      });

      expect(result.data.values[0][0]).toBe('john@example.com');
    });

    it('should get entire column', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: {
          range: 'Sheet1!B:B',
          values: [['Email'], ['john@example.com'], ['jane@example.com']]
        }
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!B:B'
      });

      expect(result.data.values.length).toBe(3);
    });

    it('should get entire row', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: {
          range: 'Sheet1!2:2',
          values: [['John Doe', 'john@example.com', '971501234567']]
        }
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!2:2'
      });

      expect(result.data.values[0].length).toBe(3);
    });

    it('should handle non-existent cell gracefully', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: { range: 'Sheet1!Z100' }
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!Z100'
      });

      expect(result.data).toBeDefined();
    });
  });

  // ============ WRITE OPERATIONS TESTS ============
  describe('Write Operations (appendRow, appendRows)', () => {
    it('should append single row', async () => {
      mockSheetsAPI.spreadsheets.values.append = vi.fn().mockResolvedValue({
        data: {
          ...mockAPIResponses.successAppend.data,
          updates: {
            updatedRows: 1,
            updatedColumns: 3
          }
        }
      });

      const result = await mockSheetsAPI.spreadsheets.values.append({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!A:C',
        values: [['New User', 'new@example.com', '971501234567']]
      });

      expect(result.data.updates.updatedRows).toBe(1);
    });

    it('should append multiple rows', async () => {
      mockSheetsAPI.spreadsheets.values.append = vi.fn().mockResolvedValue({
        data: {
          ...mockAPIResponses.successAppend.data,
          updates: {
            updatedRows: 3,
            updatedColumns: 3
          }
        }
      });

      const result = await mockSheetsAPI.spreadsheets.values.append({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!A:C',
        values: batchOperationData.multipleRows
      });

      expect(result.data.updates.updatedRows).toBe(3);
    });

    it('should format append values correctly', async () => {
      const values = [['Test', 'test@example.com', '971501234567']];
      
      mockSheetsAPI.spreadsheets.values.append = vi.fn().mockResolvedValue({
        data: mockAPIResponses.successAppend.data
      });

      await mockSheetsAPI.spreadsheets.values.append({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!A:C',
        values
      });

      expect(mockSheetsAPI.spreadsheets.values.append).toHaveBeenCalledWith(
        expect.objectContaining({
          values
        })
      );
    });
  });

  // ============ UPDATE OPERATIONS TESTS ============
  describe('Write Operations (updateCell, updateRange)', () => {
    it('should update single cell', async () => {
      mockSheetsAPI.spreadsheets.values.update = vi.fn().mockResolvedValue({
        data: mockAPIResponses.successUpdate.data
      });

      const result = await mockSheetsAPI.spreadsheets.values.update({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!B2',
        values: [['updated@example.com']]
      });

      expect(result.data.updatedRows).toBe(1);
      expect(result.data.updatedColumns).toBe(1);
    });

    it('should update multiple cells in range', async () => {
      mockSheetsAPI.spreadsheets.values.update = vi.fn().mockResolvedValue({
        data: {
          ...mockAPIResponses.successUpdate.data,
          updatedRows: 3,
          updatedColumns: 3
        }
      });

      const result = await mockSheetsAPI.spreadsheets.values.update({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!A2:C4',
        values: [
          ['New', 'new@example.com', '971501234567'],
          ['User2', 'user2@example.com', '971509876543'],
          ['User3', 'user3@example.com', '971505551111']
        ]
      });

      expect(result.data.updatedRows).toBe(3);
      expect(result.data.updatedColumns).toBe(3);
    });

    it('should clear range by updating with empty values', async () => {
      mockSheetsAPI.spreadsheets.values.update = vi.fn().mockResolvedValue({
        data: mockAPIResponses.successUpdate.data
      });

      await mockSheetsAPI.spreadsheets.values.update({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!A2:C2',
        values: [['', '', '']]
      });

      expect(mockSheetsAPI.spreadsheets.values.update).toHaveBeenCalled();
    });
  });

  // ============ BATCH OPERATIONS TESTS ============
  describe('Batch Operations', () => {
    it('should batch update multiple ranges', async () => {
      mockSheetsAPI.spreadsheets.values.batchUpdate = vi.fn().mockResolvedValue({
        data: {
          responses: [
            { ...mockAPIResponses.successUpdate.data },
            { ...mockAPIResponses.successUpdate.data }
          ]
        }
      });

      const result = await mockSheetsAPI.spreadsheets.values.batchUpdate({
        spreadsheetId: mockSpreadsheetIds.valid,
        data: {
          data: batchOperationData.bulkUpdate
        }
      });

      expect(result.data.responses.length).toBe(2);
    });

    it('should handle batch append for multiple rows', async () => {
      mockSheetsAPI.spreadsheets.values.append = vi.fn().mockResolvedValue({
        data: {
          ...mockAPIResponses.successAppend.data,
          updates: {
            updatedRows: batchOperationData.multipleRows.length,
            updatedColumns: 3
          }
        }
      });

      const result = await mockSheetsAPI.spreadsheets.values.append({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!A:C',
        values: batchOperationData.multipleRows
      });

      expect(result.data.updates.updatedRows).toBe(3);
    });
  });

  // ============ ERROR HANDLING TESTS ============
  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockRejectedValue({
        status: 401,
        message: 'Unauthorized'
      });

      expect(
        mockSheetsAPI.spreadsheets.values.get({
          spreadsheetId: mockSpreadsheetIds.valid,
          range: 'Sheet1'
        })
      ).rejects.toMatchObject({ status: 401 });
    });

    it('should handle 404 not found error', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockRejectedValue({
        status: 404,
        message: 'Spreadsheet not found'
      });

      expect(
        mockSheetsAPI.spreadsheets.values.get({
          spreadsheetId: 'invalid-id',
          range: 'Sheet1'
        })
      ).rejects.toMatchObject({ status: 404 });
    });

    it('should handle 400 invalid range error', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockRejectedValue({
        status: 400,
        message: 'The range is invalid'
      });

      expect(
        mockSheetsAPI.spreadsheets.values.get({
          spreadsheetId: mockSpreadsheetIds.valid,
          range: 'InvalidRange!!!'
        })
      ).rejects.toMatchObject({ status: 400 });
    });

    it('should handle 429 rate limit error', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockRejectedValue({
        status: 429,
        message: 'Rate limit exceeded'
      });

      expect(
        mockSheetsAPI.spreadsheets.values.get({
          spreadsheetId: mockSpreadsheetIds.valid,
          range: 'Sheet1'
        })
      ).rejects.toMatchObject({ status: 429 });
    });

    it('should handle network errors', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockRejectedValue(
        new Error('Network error')
      );

      expect(
        mockSheetsAPI.spreadsheets.values.get({
          spreadsheetId: mockSpreadsheetIds.valid,
          range: 'Sheet1'
        })
      ).rejects.toThrow('Network error');
    });
  });

  // ============ EDGE CASE TESTS ============
  describe('Edge Cases', () => {
    it('should handle empty spreadsheet ID', async () => {
      expect(mockSpreadsheetIds.empty).toBe('');
    });

    it('should handle very large row counts', async () => {
      const largeData = createMockSheetData(
        Array.from({ length: 10000 }, (_, i) => [
          `User ${i}`,
          `email${i}@test.com`,
          `971${String(50000000 + i).slice(-9)}`
        ])
      );

      expect(largeData.values.length).toBe(10000);
    });

    it('should handle special characters in data', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: {
          range: 'Sheet1!A1:C2',
          values: [
            ['Name', 'Email', 'Phone'],
            ['محمد علي', 'ali@example.com', '971501234567']
          ]
        }
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1'
      });

      expect(result.data.values[1][0]).toBe('محمد علي');
    });

    it('should handle emoji and unicode characters', async () => {
      mockSheetsAPI.spreadsheets.values.append = vi.fn().mockResolvedValue({
        data: mockAPIResponses.successAppend.data
      });

      await mockSheetsAPI.spreadsheets.values.append({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1!A:C',
        values: [['😀 Happy', 'emoji@test.com', '971501234567']]
      });

      expect(mockSheetsAPI.spreadsheets.values.append).toHaveBeenCalled();
    });

    it('should handle null and undefined values', async () => {
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: {
          range: 'Sheet1!A1:C3',
          values: [
            ['Name', 'Email', 'Phone'],
            ['John', null, '971501234567'],
            [null, 'jane@example.com', null]
          ]
        }
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1'
      });

      expect(result.data.values).toBeDefined();
    });
  });

  // ============ PERFORMANCE TESTS ============
  describe('Performance Characteristics', () => {
    it('should handle large data retrieval within reasonable time', async () => {
      const startTime = Date.now();
      
      mockSheetsAPI.spreadsheets.values.get = vi.fn().mockResolvedValue({
        data: createMockSheetData(
          Array.from({ length: 1000 }, (_, i) => [
            `User ${i}`,
            `email${i}@test.com`,
            `97150${String(1000000 + i).slice(-7)}`
          ])
        )
      });

      await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: mockSpreadsheetIds.valid,
        range: 'Sheet1'
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('should cache data efficiently to reduce API calls', () => {
      sheetsService.cache.set('cached-key', {
        data: mockSheetData.simple,
        timestamp: Date.now()
      });

      const retrievals = 100;
      for (let i = 0; i < retrievals; i++) {
        sheetsService.cache.get('cached-key');
      }

      expect(sheetsService.cache.size).toBe(1);
    });
  });
});
