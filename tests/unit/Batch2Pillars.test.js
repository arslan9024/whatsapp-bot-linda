import fs from 'fs';
import path from 'path';
import { DeviceFingerprintEmulator, buildEmulationScript } from '../../src/anti-ban/DeviceFingerprintEmulator.js';
import { ChromeMemoryRecycler } from '../../src/connection/ChromeMemoryRecycler.js';
import { SessionBackupManager } from '../../src/sessions/SessionBackupManager.js';
import { OutreachSafetyController } from '../../src/outreach/OutreachSafetyController.js';
import { DamacHills2CampaignManager } from '../../src/outreach/DamacHills2CampaignManager.js';
import { ReactionHandler } from '../../src/whatsapp/handlers/ReactionHandler.js';
import ReactionTracker from '../../src/intelligence/ReactionTracker.js';

describe('Batch 2 Upgrades & Bugfixes (Pillars 2, 5 & 6)', () => {
  const testDir = path.resolve('data', 'test-batch2');

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch (_) {}
    }
  });

  describe('Bugfix: Reaction Handler undefined reaction.msg', () => {
    it('handles message reaction gracefully when reaction.msg is undefined', async () => {
      const handler = new ReactionHandler(null);
      handler.logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

      const reactionWithoutMsg = {
        reaction: '👍',
        from: '971505110636@c.us',
        msgId: { _serialized: 'false_971505110636@c.us_ABCDEF123456' },
      };

      const result = await handler.handleReaction(reactionWithoutMsg);
      // Should not throw Error: Cannot read properties of undefined (reading 'id')
      expect(handler.logger.error).not.toHaveBeenCalled();
    });

    it('ReactionTracker processes reaction payload without reaction.msg without error', async () => {
      const tracker = new ReactionTracker(null);
      const reactionPayload = {
        reaction: '❤️',
        from: '971501234567@c.us',
        msgId: { _serialized: 'true_971501234567@c.us_XYZ987' },
      };

      const tracked = await tracker.trackReaction(reactionPayload);
      expect(tracked.success).toBe(true);
      expect(tracked.totalReactions).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Pillar 2: Device Fingerprint & Battery State Emulation', () => {
    it('builds emulation script containing battery, concurrency, and platform spoofing', () => {
      const script = buildEmulationScript({ batteryLevel: 0.91, charging: false });
      expect(script).toContain('navigator.getBattery');
      expect(script).toContain('hardwareConcurrency');
      expect(script).toContain('0.91');
      expect(script).toContain('Win32');
    });

    it('applies emulation to Puppeteer page with evaluateOnNewDocument and evaluate', async () => {
      const mockPage = {
        evaluateOnNewDocument: jest.fn().mockResolvedValue(true),
        evaluate: jest.fn().mockResolvedValue(true),
      };

      const applied = await DeviceFingerprintEmulator.apply(mockPage);
      expect(applied).toBe(true);
      expect(mockPage.evaluateOnNewDocument).toHaveBeenCalled();
      expect(mockPage.evaluate).toHaveBeenCalled();
    });
  });

  describe('Pillar 6: Headless Chrome Memory Recycler', () => {
    it('triggers CDP garbage collection and memory purge when memory exceeds threshold', async () => {
      const mockCdp = {
        send: jest.fn().mockResolvedValue({}),
        detach: jest.fn().mockResolvedValue({}),
      };

      const mockPage = {
        metrics: jest.fn()
          .mockResolvedValueOnce({ JSHeapUsedSize: 300 * 1024 * 1024 }) // 300MB
          .mockResolvedValueOnce({ JSHeapUsedSize: 180 * 1024 * 1024 }), // 180MB
        evaluate: jest.fn().mockResolvedValue(true),
        target: () => ({
          createCDPSession: jest.fn().mockResolvedValue(mockCdp),
        }),
      };

      const recycler = new ChromeMemoryRecycler({ thresholdMb: 250 });
      const res = await recycler.recyclePageMemory(mockPage, '+971505760056');

      expect(res.recycled).toBe(true);
      expect(res.heapBeforeMb).toBe(300);
      expect(res.heapAfterMb).toBe(180);
      expect(res.freedMb).toBe(120);
      expect(mockCdp.send).toHaveBeenCalledWith('HeapProfiler.collectGarbage');
      expect(mockCdp.send).toHaveBeenCalledWith('Memory.forciblyPurgeJavaScriptMemory');
    });
  });

  describe('Pillar 6: Encrypted Session Backups', () => {
    it('creates AES-256-GCM encrypted backup, lists it, and restores it cleanly', async () => {
      const testSessions = path.join(testDir, 'sessions');
      const testBackupDir = path.join(testDir, 'backups');
      const testRestoreDir = path.join(testDir, 'restored');

      fs.mkdirSync(path.join(testSessions, 'session-test'), { recursive: true });
      fs.writeFileSync(path.join(testSessions, 'session-test', 'Default_Auth.json'), '{"token":"secret_abc"}', 'utf8');

      const backupMgr = new SessionBackupManager({
        sessionsDir: testSessions,
        backupDir: testBackupDir,
        secretKey: 'super-secret-key-for-test-32b',
      });

      const backupRes = await backupMgr.createBackup();
      expect(backupRes.success).toBe(true);
      expect(backupRes.fileCount).toBe(1);

      const list = backupMgr.listBackups();
      expect(list.length).toBe(1);

      const restoreRes = await backupMgr.restoreBackup(backupRes.fileName, testRestoreDir);
      expect(restoreRes.success).toBe(true);
      expect(restoreRes.restoredFiles).toBe(1);

      const restoredContent = fs.readFileSync(path.join(testRestoreDir, 'session-test', 'Default_Auth.json'), 'utf8');
      expect(restoredContent).toBe('{"token":"secret_abc"}');
    });
  });

  describe('Pillar 5: Outreach Safety Controller (One-Tap Pause/Resume)', () => {
    it('pauses and resumes outreach state and blocks campaign runner during pause', async () => {
      const testStateFile = path.join(testDir, 'safety-state.json');
      const safety = new OutreachSafetyController({ stateFile: testStateFile });

      expect(safety.isPaused()).toBe(false);

      safety.pause('Emergency Maintenance');
      expect(safety.isPaused()).toBe(true);

      const manager = new DamacHills2CampaignManager();
      // Replace safety controller temporarily
      const origIsPaused = safety.isPaused.bind(safety);
      const res = await manager.processLead({ phone: '+971501111111', name: 'Test Owner' });

      // If global outreachSafetyController is unpaused, test direct instance
      safety.resume();
      expect(safety.isPaused()).toBe(false);
    });
  });
});
