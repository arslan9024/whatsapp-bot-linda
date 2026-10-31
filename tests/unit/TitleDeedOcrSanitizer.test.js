import { TitleDeedOcrSanitizer } from '../../src/intelligence/TitleDeedOcrSanitizer.js';

describe('TitleDeedOcrSanitizer (Pillar 1 - Property Document Privacy & Extraction)', () => {
  it('redacts Emirates IDs, Passports, and IBANs while preserving property specs', () => {
    const rawDocumentText = `
      GOVERNMENT OF DUBAI - LAND DEPARTMENT
      TITLE DEED CERTIFICATE
      Owner Name: Mohammed Al Suwaidi
      Emirates ID: 784-1988-1234567-1
      Passport: N12345678
      IBAN: AE070330000000001234567
      Community: Damac Hills 2 (Akoya Oxygen)
      Villa No: V-402
      Plot No: 987-654
      Built-up Area: 2,450 sq ft
    `;

    const result = TitleDeedOcrSanitizer.sanitize(rawDocumentText);

    expect(result.redactedCount).toBeGreaterThanOrEqual(3);
    expect(result.sanitizedText).toContain('[REDACTED_EMIRATES_ID]');
    expect(result.sanitizedText).toContain('[REDACTED_PASSPORT]');
    expect(result.sanitizedText).toContain('[REDACTED_IBAN]');
    expect(result.sanitizedText).not.toContain('784-1988-1234567-1');
    expect(result.sanitizedText).not.toContain('N12345678');

    // Verify extracted property specs
    expect(result.propertyFacts.unitNumber).toBe('V-402');
    expect(result.propertyFacts.plotNumber).toBe('987-654');
    expect(result.propertyFacts.areaSqft).toBe(2450);
    expect(result.propertyFacts.community).toBe('Damac Hills 2');
  });

  it('handles empty or non-string input safely', () => {
    const result = TitleDeedOcrSanitizer.sanitize(null);

    expect(result.sanitizedText).toBe('');
    expect(result.redactedCount).toBe(0);
    expect(result.propertyFacts.unitNumber).toBeNull();
  });
});

