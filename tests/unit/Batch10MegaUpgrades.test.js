/**
 * @file Batch10MegaUpgrades.test.js
 * @description Unit tests for Mega Batch 10 (Upgrades 126-140).
 */

import { IpRateLimiter } from '../../src/middleware/IpRateLimiter.js';
import { JwtTokenRotator } from '../../src/core/JwtTokenRotator.js';
import { SanitizedProcessLauncher } from '../../src/core/SanitizedProcessLauncher.js';
import { CspHeaderEnforcer } from '../../src/middleware/CspHeaderEnforcer.js';
import { SandboxedDocumentProcessor } from '../../src/intelligence/SandboxedDocumentProcessor.js';
import { MaliciousLinkDetector } from '../../src/security/MaliciousLinkDetector.js';
import { AuditTrailSigner } from '../../src/security/AuditTrailSigner.js';
import { SessionFingerprintBinder } from '../../src/security/SessionFingerprintBinder.js';
import { SecureEnvLoader } from '../../src/core/SecureEnvLoader.js';
import { DependencyVulnerabilityAuditor } from '../../src/security/DependencyVulnerabilityAuditor.js';
import { DatabaseTlsEnforcer } from '../../src/core/DatabaseTlsEnforcer.js';
import { TerminalSecretMasker } from '../../src/core/TerminalSecretMasker.js';
import { TamperEvidentSessionLocker } from '../../src/security/TamperEvidentSessionLocker.js';
import { EmergencyDataLockdownSwitch } from '../../src/security/EmergencyDataLockdownSwitch.js';
import { IpAllowlistGuard } from '../../src/middleware/IpAllowlistGuard.js';

describe('Mega Batch 10 (Upgrades 126–140) Test Suite', () => {
  // Upgrade 126
  test('Upgrade 126: IpRateLimiter tracks sliding window and blocks excessive requests', () => {
    const limiter = new IpRateLimiter({ windowMs: 1000, maxRequests: 2 });
    const ip = '192.168.1.100';

    expect(limiter.check(ip).allowed).toBe(true);
    expect(limiter.check(ip).allowed).toBe(true);
    expect(limiter.check(ip).allowed).toBe(false);
  });

  // Upgrade 127
  test('Upgrade 127: JwtTokenRotator creates, verifies, and revokes tokens', () => {
    const rotator = new JwtTokenRotator({ secret: 'test_secret_key_32_characters_ok!' });
    const pair = rotator.issueTokenPair('user_admin_1', 'admin');

    expect(pair.accessToken).toBeDefined();
    expect(pair.refreshToken).toBeDefined();

    const verified = rotator.verifyAccessToken(pair.accessToken);
    expect(verified.valid).toBe(true);
    expect(verified.payload.userId).toBe('user_admin_1');

    rotator.revokeToken(pair.accessToken);
    expect(rotator.verifyAccessToken(pair.accessToken).valid).toBe(false);
  });

  // Upgrade 128
  test('Upgrade 128: SanitizedProcessLauncher whitelists scripts and prevents shell injection', () => {
    const launcher = new SanitizedProcessLauncher();
    expect(launcher.isScriptAllowed('tools/doctor.js')).toBe(true);
    expect(launcher.isScriptAllowed('rm -rf /')).toBe(false);

    expect(() => launcher.prepareExecution('malicious.js')).toThrow();

    const plan = launcher.prepareExecution('tools/doctor.js', ['--verbose; drop table']);
    expect(plan.shell).toBe(false);
    expect(plan.args.some(a => a.includes('drop table'))).toBe(false);
  });

  // Upgrade 129
  test('Upgrade 129: CspHeaderEnforcer returns hardened security headers', () => {
    const enforcer = new CspHeaderEnforcer();
    const headers = enforcer.getSecurityHeaders({ isProduction: true });

    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Strict-Transport-Security']).toBeDefined();
  });

  // Upgrade 130
  test('Upgrade 130: SandboxedDocumentProcessor validates PDF headers and rejects scripts', () => {
    const processor = new SandboxedDocumentProcessor({ maxFileSizeMb: 1 });

    const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Brochure) >>\nendobj');
    expect(processor.validateDocument(validPdf, 'brochure.pdf').safe).toBe(true);

    const maliciousPdf = Buffer.from('%PDF-1.4\n<< /Type /Action /S /JavaScript /JS (app.alert(1)) >>');
    expect(processor.validateDocument(maliciousPdf, 'brochure.pdf').safe).toBe(false);

    const forgedPdf = Buffer.from('NOT_A_PDF_HEADER');
    expect(processor.validateDocument(forgedPdf, 'fake.pdf').safe).toBe(false);
  });

  // Upgrade 131
  test('Upgrade 131: MaliciousLinkDetector detects IP grabbers and phishing hosts', () => {
    const detector = new MaliciousLinkDetector();

    const safeRes = detector.scanMessage('Check our portfolio at https://botlinda.ai/villas');
    expect(safeRes.hasThreat).toBe(false);

    const threatRes = detector.scanMessage('Click here to see photos https://grabify.link/ABC123');
    expect(threatRes.hasThreat).toBe(true);
    expect(threatRes.threats[0].riskLevel).toBe('HIGH');
  });

  // Upgrade 132
  test('Upgrade 132: AuditTrailSigner signs audit events and validates cryptographic chain', () => {
    const signer = new AuditTrailSigner('test_audit_secret');
    signer.recordAction({ actor: 'admin', action: 'PASSWORD_RESET' });
    signer.recordAction({ actor: 'agent', action: 'LEAD_EXPORT' });

    const verify = signer.verifyChainIntegrity();
    expect(verify.intact).toBe(true);
    expect(verify.verifiedEntries).toBe(2);
  });

  // Upgrade 133
  test('Upgrade 133: SessionFingerprintBinder binds requests to browser and IP subnet', () => {
    const binder = new SessionFingerprintBinder();
    const mockReq = {
      headers: { 'user-agent': 'Chrome/120', 'accept-language': 'en-US' },
      ip: '192.168.1.50'
    };

    const fp = binder.generateFingerprint(mockReq);
    expect(fp).toBeDefined();

    expect(binder.validateSession(mockReq, fp).valid).toBe(true);

    // Tampered UA
    const tamperedReq = { ...mockReq, headers: { 'user-agent': 'Firefox/115' } };
    expect(binder.validateSession(tamperedReq, fp).valid).toBe(false);
  });

  // Upgrade 134
  test('Upgrade 134: SecureEnvLoader rejects placeholder credentials and detects missing keys', () => {
    const loader = new SecureEnvLoader();

    const invalidEnv = { STRIPE_KEY: 'changeme', MONGO_URI: 'your_key_here' };
    const check = loader.validateEnvironment(['STRIPE_KEY', 'MONGO_URI', 'MISSING_KEY'], invalidEnv);
    expect(check.valid).toBe(false);
    expect(check.errors.length).toBe(3);
  });

  // Upgrade 135
  test('Upgrade 135: DependencyVulnerabilityAuditor flags wildcard dependencies', () => {
    const auditor = new DependencyVulnerabilityAuditor();

    const safeDeps = { express: '^5.0.0', dotenv: '^16.0.0' };
    expect(auditor.auditDependencies(safeDeps).secure).toBe(true);

    const unsafeDeps = { lodash: '*', attacker: 'https://evil.com/pkg.tgz' };
    const check = auditor.auditDependencies(unsafeDeps);
    expect(check.secure).toBe(false);
    expect(check.findings.length).toBe(2);
  });

  // Upgrade 136
  test('Upgrade 136: DatabaseTlsEnforcer checks and injects TLS on connection URIs', () => {
    const enforcer = new DatabaseTlsEnforcer();

    const srvCheck = enforcer.enforceMongoTls('mongodb+srv://user:pass@cluster0.net/db', true);
    expect(srvCheck.secure).toBe(true);

    const plainCheck = enforcer.enforceMongoTls('mongodb://user:pass@127.0.0.1:27017/db', true);
    expect(plainCheck.enforcedUri).toContain('tls=true');
    expect(plainCheck.warnings.length).toBeGreaterThan(0);
  });

  // Upgrade 137
  test('Upgrade 137: TerminalSecretMasker strips credentials and bearer tokens from terminal output', () => {
    const masker = new TerminalSecretMasker();

    const raw = 'Connected with Bearer eyJhbGciOiJIUzI1NiJ9.test and password="mySecretPassword123"';
    const masked = masker.maskLine(raw);
    expect(masked).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(masked).not.toContain('mySecretPassword123');
    expect(masked).toContain('[***PROTECTED_SECRET***]');
  });

  // Upgrade 138
  test('Upgrade 138: TamperEvidentSessionLocker detects baseline divergence in sessions directory', () => {
    const locker = new TamperEvidentSessionLocker();
    const sessionFiles = [{ path: 'Default/Cookies', size: 1024, mtime: 1000 }];

    locker.registerSessionBaseline('session_linda', sessionFiles);
    expect(locker.verifySessionIntegrity('session_linda', sessionFiles).intact).toBe(true);

    // Simulated rogue modification
    const alteredFiles = [{ path: 'Default/Cookies', size: 2048, mtime: 2000 }];
    expect(locker.verifySessionIntegrity('session_linda', alteredFiles).intact).toBe(false);
  });

  // Upgrade 139
  test('Upgrade 139: EmergencyDataLockdownSwitch halts execution on lockdown and restores on release', () => {
    const lockdown = new EmergencyDataLockdownSwitch();
    expect(lockdown.assertOperatingState()).toBe(true);

    lockdown.engageLockdown('admin', 'DDoS anomaly');
    expect(lockdown.isLockedDown).toBe(true);
    expect(() => lockdown.assertOperatingState()).toThrow(/EMERGENCY LOCKDOWN/);

    lockdown.disengageLockdown('admin');
    expect(lockdown.isLockedDown).toBe(false);
    expect(lockdown.assertOperatingState()).toBe(true);
  });

  // Upgrade 140
  test('Upgrade 140: IpAllowlistGuard permits authorized IPs and subnets, rejecting public IPs', () => {
    const guard = new IpAllowlistGuard({
      allowedIps: ['127.0.0.1', '10.0.0.5'],
      allowedSubnets: ['192.168.1.']
    });

    expect(guard.isAllowed('127.0.0.1')).toBe(true);
    expect(guard.isAllowed('192.168.1.25')).toBe(true);
    expect(guard.isAllowed('8.8.8.8')).toBe(false);
  });
});

