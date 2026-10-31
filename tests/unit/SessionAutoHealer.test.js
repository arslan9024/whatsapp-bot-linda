import fs from 'fs';
import path from 'path';
import { SessionAutoHealer } from '../../src/sessions/SessionAutoHealer.js';

describe('SessionAutoHealer (Pillar 6 - Corruption Auto-Recovery)', () => {
  const testDir = path.resolve('data', 'test-healer');
  const sessionsDir = path.join(testDir, 'sessions');

  beforeEach(() => {
    fs.mkdirSync(sessionsDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch (_) {}
    }
  });

  it('detects and clears dangling lock files cleanly', async () => {
    const clientId = 'test_device_1';
    const sessionPath = path.join(sessionsDir, `session-${clientId}`);
    fs.mkdirSync(sessionPath, { recursive: true });

    // Create mock lock files
    fs.writeFileSync(path.join(sessionPath, 'SingletonLock'), 'dummy_lock');
    fs.writeFileSync(path.join(sessionPath, 'SingletonCookie'), 'dummy_cookie');

    const healer = new SessionAutoHealer({ sessionsDir });

    const lockRes = healer.clearDanglingLocks(clientId);
    expect(lockRes.cleared).toBe(2);
    expect(lockRes.files).toContain('SingletonLock');
    expect(fs.existsSync(path.join(sessionPath, 'SingletonLock'))).toBe(false);

    const healRes = await healer.healSession(clientId);
    expect(healRes.healed).toBe(false); // No locks left, no backup needed
  });

  it('rolls back to latest encrypted backup when forceRestore is requested', async () => {
    const clientId = 'test_device_2';
    const sessionPath = path.join(sessionsDir, `session-${clientId}`);
    fs.mkdirSync(sessionPath, { recursive: true });

    const mockBackupManager = {
      listBackups: jest.fn().mockReturnValue([
        { fileName: 'sessions-backup-2026-11-01T00-00-00.enc', createdAt: '2026-11-01' },
      ]),
      restoreBackup: jest.fn().mockResolvedValue({ success: true, restoredFiles: 5 }),
    };

    const healer = new SessionAutoHealer({
      sessionsDir,
      backupManager: mockBackupManager,
    });

    const res = await healer.healSession(clientId, { forceRestore: true });
    expect(res.healed).toBe(true);
    expect(res.action).toBe('RESTORED_FROM_BACKUP');
    expect(res.backupUsed).toBe('sessions-backup-2026-11-01T00-00-00.enc');
    expect(mockBackupManager.restoreBackup).toHaveBeenCalledTimes(1);
  });

  it('correctly classifies known recoverable corruption errors', () => {
    const healer = new SessionAutoHealer({ sessionsDir });

    expect(healer.isRecoverableCorruption(new Error('Protocol error: Target closed'))).toBe(true);
    expect(healer.isRecoverableCorruption('Execution context was destroyed')).toBe(true);
    expect(healer.isRecoverableCorruption('Random syntax error')).toBe(false);
  });
});
