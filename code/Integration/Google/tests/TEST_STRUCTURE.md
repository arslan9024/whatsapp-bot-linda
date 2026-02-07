# Week 2 Implementation Test Suite Skeleton

**Phase 2:** Google API Integration Implementation

**Created:** February 7, 2026  
**Status:** Skeleton Structure Ready

## Test Files Structure

- `SheetsService.test.js` - Sheet operations (read, write, append)
- `DataProcessingService.test.js` - Phone number processing and validation
- `Integration.test.js` - End-to-end Google API workflows
- `Migrations.test.js` - Legacy feature migration validation

## Test Coverage Goals

- Unit tests for all service classes
- Integration tests for service interactions
- Migration validation tests (legacy → new compatibility)
- Performance benchmarks (async vs sleep)
- Error handling and edge cases

---

## SheetsService.test.js

### What to Test

- Authentication and initialization
- Read sheet data
- Write data to sheet
- Append data to sheet
- Handle sheet errors
- Multiple sheet access
- Data validation

### Example Test Structure

```javascript
import { SheetsService } from '../SheetsService.js';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('SheetsService', () => {
  let service;

  beforeEach(async () => {
    service = new SheetsService({ /* test config */ });
    await service.initialize();
  });

  describe('readSheet', () => {
    it('should read sheet data successfully', async () => {
      const data = await service.readSheet('spreadsheetId', 'SheetName!A:Z');
      expect(data).toBeDefined();
      expect(data.values).toBeInstanceOf(Array);
    });

    it('should handle non-existent spreadsheet', async () => {
      expect(() => 
        service.readSheet('invalid-id', 'Sheet!A:A')
      ).rejects.toThrow();
    });
  });

  afterEach(async () => {
    await service.cleanup();
  });
});
```

### Test Groups to Implement

1. **SheetsService - Initialization**
   - should initialize with valid config
   - should create auth client successfully
   - should handle missing credentials
   - should validate sheet access

2. **SheetsService - readSheet()**
   - should read sheet data with valid range
   - should handle empty sheets
   - should validate range format
   - should return data in correct format
   - should handle sheet errors

3. **SheetsService - writeSheet()**
   - should write data to sheet successfully
   - should validate data format before write
   - should handle write errors
   - should update existing cells
   - should handle large data writes

4. **SheetsService - appendSheet()**
   - should append rows to sheet successfully
   - should handle multiple row appends
   - should validate append data
   - should fail on sheet errors

5. **SheetsService - Error Handling**
   - should handle network errors gracefully
   - should retry failed operations
   - should log errors properly
   - should recover from transient failures

---

## DataProcessingService.test.js

### What to Test

- Phone number extraction
- Phone number validation
- Phone number categorization
- De-duplication
- Formatting
- Batch processing
- Performance (async without sleep)

### Example Test Structure

```javascript
import { DataProcessingService, PhoneValidator } from '../DataProcessingService.js';
import { describe, it, expect, beforeEach } from 'vitest';

describe('DataProcessingService', () => {
  let service;

  beforeEach(async () => {
    service = new DataProcessingService();
    await service.initialize();
  });

  describe('extractPhoneNumbers', () => {
    it('should extract phone numbers from sheet rows', async () => {
      const rows = [
        { name: 'John', phone: '1234567890' },
        { name: 'Jane', phone: '0987654321' }
      ];
      const numbers = await service.extractPhoneNumbers(rows);
      expect(numbers).toHaveLength(2);
      expect(numbers).toContain('1234567890');
    });

    it('should handle mixed formats', async () => {
      const rows = [
        { phone: '+1 (555) 123-4567' },
        { phone: '555.123.4567' },
        { phone: '5551234567' }
      ];
      const numbers = await service.extractPhoneNumbers(rows);
      expect(numbers).toHaveLength(3);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      const valid = service.validatePhoneNumber('1234567890');
      expect(valid).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      const invalid = service.validatePhoneNumber('123');
      expect(invalid).toBe(false);
    });
  });

  describe('deduplicatePhones', () => {
    it('should remove duplicate phone numbers', () => {
      const phones = ['1234567890', '1234567890', '0987654321'];
      const unique = service.deduplicatePhones(phones);
      expect(unique).toHaveLength(2);
    });
  });

  describe('formatPhones', () => {
    it('should format phone numbers consistently', () => {
      const phones = ['+1 (555) 123-4567', '555.123.4567'];
      const formatted = service.formatPhones(phones);
      expect(formatted[0]).toBe(formatted[1]);
    });
  });
});
```

### Test Groups to Implement

1. **DataProcessingService - Initialization**
   - should initialize successfully
   - should load phone validators
   - should prepare for processing

2. **DataProcessingService - extractPhoneNumbers()**
   - should extract from single column
   - should extract from multiple columns
   - should handle various formats (E.164, international, national)
   - should skip invalid numbers
   - should work with 100+ rows without sleep delays

3. **DataProcessingService - validatePhoneNumber()**
   - should validate E.164 format
   - should validate international format
   - should validate country-specific formats
   - should reject invalid numbers
   - should handle edge cases

4. **DataProcessingService - deduplicatePhones()**
   - should remove exact duplicates
   - should handle normalized duplicates
   - should preserve order
   - should handle empty arrays

5. **DataProcessingService - formatPhones()**
   - should convert to E.164 format
   - should convert to international format
   - should convert to national format
   - should handle country codes

6. **DataProcessingService - Batch Processing**
   - should process 100 rows in <500ms
   - should process 1000 rows in <3000ms
   - should use async/await (no sleep delays)
   - should handle parallel processing

7. **DataProcessingService - Error Handling**
   - should handle missing columns gracefully
   - should handle malformed data
   - should log errors properly
   - should not stop on single row failure

---

## Integration.test.js

### What to Test

- End-to-end flows combining services
- DataProcessingService + SheetsService interactions
- Legacy feature parity
- Performance with real Google Sheets

### Example Test Structure

```javascript
import { DataProcessingService } from '../DataProcessingService.js';
import { SheetsService } from '../SheetsService.js';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Google API Integration', () => {
  let sheets;
  let processor;

  beforeEach(async () => {
    sheets = new SheetsService();
    processor = new DataProcessingService();
    await sheets.initialize();
    await processor.initialize();
  });

  describe('Full Workflow', () => {
    it('should read, process, and write data end-to-end', async () => {
      // Read raw data
      const rawData = await sheets.readSheet('sheetId', 'Data!A:D');
      // Process phone numbers
      const processed = await processor.processRow(rawData.values[0]);
      // Write results
      await sheets.appendRow('resultId', 'Results!A:D', processed);
      // Verify
      const written = await sheets.readSheet('resultId', 'Results!A:A');
      expect(written.values).toBeDefined();
    });
  });
});
```

---

## Migrations.test.js

### What to Test

- Legacy code still works with new services
- Feature parity between old and new
- Data transformation accuracy
- Performance improvements validated

### Example Test Structure

```javascript
import { legacyProcessPhoneNumbers } from '../../legacy/legacy.js';
import { DataProcessingService } from '../DataProcessingService.js';
import { describe, it, expect } from 'vitest';

describe('Migration Validation', () => {
  it('should produce same output as legacy code', async () => {
    const input = ['1234567890', '0987654321'];
    const legacyOutput = legacyProcessPhoneNumbers(input);
    
    const service = new DataProcessingService();
    const newOutput = await service.processPhones(input);
    
    expect(newOutput).toEqual(legacyOutput);
  });

  it('should be faster than legacy code', async () => {
    const input = Array(1000).fill('1234567890');
    
    const legacyStart = performance.now();
    legacyProcessPhoneNumbers(input);
    const legacyTime = performance.now() - legacyStart;
    
    const service = new DataProcessingService();
    const newStart = performance.now();
    await service.processPhones(input);
    const newTime = performance.now() - newStart;
    
    expect(newTime).toBeLessThan(legacyTime);
  });
});
```

---

## Running the Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test SheetsService.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Performance Benchmarks

Expected performance improvements:
- 100 rows: 2.5s → <500ms (5x faster)
- 1,000 rows: 25s → <3s (8x faster)
- 10,000 rows: 250s → <30s (8x faster)

Key optimizations:
- Async/await processing (no sleep delays)
- Parallel operations where possible
- Map-based O(1) lookups
- Batched API calls

---

## Next Steps

1. Create actual test files from this skeleton
2. Implement 50+ tests for SheetsService
3. Implement 70+ tests for DataProcessingService
4. Implement 30+ integration tests
5. Implement 40+ migration validation tests
6. Run performance benchmarks
7. Tag release v0.2.0-week2

