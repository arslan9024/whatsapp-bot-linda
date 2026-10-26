import { scanText, mask, SECRET_PATTERNS } from '../../tools/scan-secrets.js';

describe('secret scanner', () => {
  // Built at runtime so this test file never contains a scannable literal.
  const fake = (...parts) => parts.join('');

  test('detects real-looking credentials and masks them', () => {
    const findings = scanText([
      fake('MONGODB_URI=mongodb+srv://', 'bot:', 'Sup3rS3cretVal', '@cluster.mongodb.net/db'),
      fake('GOOGLE_KEY=', 'AIza', 'SyA1234567890abcdefghijklmnopqrstuv'),
      fake('-----BEGIN ', 'PRIVATE KEY-----'),
      fake('DB_PASSWORD=', 'hunter22secret'),
    ].join('\n'), '.env');
    expect(findings.map(finding => finding.type)).toEqual(expect.arrayContaining([
      'MongoDB URI with password', 'Google API key', 'Private key', 'Password assignment',
    ]));
    for (const finding of findings) {
      expect(finding.preview).not.toContain('Sup3rS3cretVal');
      expect(finding.preview).not.toContain('hunter22secret');
    }
    expect(findings[0]).toEqual(expect.objectContaining({ file: '.env', line: 1 }));
  });

  test('ignores placeholders and environment references', () => {
    expect(scanText([
      fake('MONGODB_URI=mongodb+srv://', 'user:', 'password@cluster.mongodb.net/db'),
      fake('mongodb+srv://bot:', '<password>@cluster'),
      fake('DB_PASSWORD=', '${DB_PASSWORD}'),
      fake('const password = ', 'args[1];'),
      fake('"private_key": "-----BEGIN RSA ', 'PRIVATE KEY-----..."'),
    ].join('\n'))).toEqual([]);
  });

  test('exports patterns and a masking helper', () => {
    expect(SECRET_PATTERNS.length).toBeGreaterThan(5);
    const masked = mask(fake('mongodb://a:', 'secretvalue@host'));
    expect(masked).toContain('mongodb://a:***@');
    expect(masked).not.toContain('secretvalue');
  });
});
