import { IncomingMessageDeduplicator } from '../../src/intelligence/IncomingMessageDeduplicator.js';
import { MultiSessionProxyTunnel } from '../../src/connection/MultiSessionProxyTunnel.js';
import { ChromiumProfileOptimizer, DEFAULT_OPTIMIZED_FLAGS } from '../../src/connection/ChromiumProfileOptimizer.js';
import { UserAgentRotator } from '../../src/connection/UserAgentRotator.js';
import { WebSocketReconnectionBackoff } from '../../src/connection/WebSocketReconnectionBackoff.js';

describe('Phase A Batch 1 Modules (Upgrades 1–5)', () => {
  describe('IncomingMessageDeduplicator (Upgrade 5)', () => {
    it('detects duplicate messages and passes fresh messages within TTL', () => {
      const dedup = new IncomingMessageDeduplicator({ ttlMs: 1000 });
      const msgId = 'false_971501234567@c.us_3EB0123456';

      expect(dedup.isDuplicate(msgId, '971501234567@c.us')).toBe(false);
      expect(dedup.isDuplicate(msgId, '971501234567@c.us')).toBe(true);
      expect(dedup.size()).toBe(1);
    });

    it('enforces maximum cache capacity limit', () => {
      const dedup = new IncomingMessageDeduplicator({ ttlMs: 5000, maxSize: 3 });
      dedup.isDuplicate('msg_1');
      dedup.isDuplicate('msg_2');
      dedup.isDuplicate('msg_3');
      dedup.isDuplicate('msg_4');

      expect(dedup.size()).toBe(3);
    });
  });

  describe('MultiSessionProxyTunnel (Upgrade 1)', () => {
    it('validates proxy URLs and generates Puppeteer proxy args', () => {
      const tunnel = new MultiSessionProxyTunnel();
      const validProxy = 'http://user:pass@192.168.1.1:8080';

      expect(tunnel.validateProxyUrl(validProxy)).toBe(true);
      expect(tunnel.validateProxyUrl('invalid-proxy')).toBe(false);

      tunnel.assignProxy('session_1', validProxy);
      expect(tunnel.getProxy('session_1')).toBe(validProxy);
      expect(tunnel.getPuppeteerProxyArgs('session_1')).toEqual([`--proxy-server=${validProxy}`]);
      expect(tunnel.getPuppeteerProxyArgs('unknown_session')).toEqual([]);
    });
  });

  describe('ChromiumProfileOptimizer (Upgrade 4)', () => {
    it('generates low-RAM Puppeteer args including max-old-space-size clamp', () => {
      const optimizer = new ChromiumProfileOptimizer({ maxMemoryMb: 384 });
      const args = optimizer.buildPuppeteerArgs({ proxyServer: 'http://proxy.test:8080' });

      expect(args).toContain('--js-flags=--max-old-space-size=384');
      expect(args).toContain('--proxy-server=http://proxy.test:8080');
      expect(args).toContain('--no-sandbox');
    });

    it('provides valid desktop user agents', () => {
      const optimizer = new ChromiumProfileOptimizer();
      expect(optimizer.getStableUserAgent('mac')).toContain('Macintosh');
      expect(optimizer.getStableUserAgent('win')).toContain('Windows NT');
    });
  });

  describe('UserAgentRotator (Upgrade 2)', () => {
    it('provides sticky deterministic profiles for the same session ID', () => {
      const rotator = new UserAgentRotator();
      const profile1 = rotator.getProfileForSession('PowerAgent');
      const profile2 = rotator.getProfileForSession('PowerAgent');

      expect(profile1.userAgent).toBe(profile2.userAgent);
      expect(profile1.platform).toBe(profile2.platform);
    });

    it('allows explicit rotation to an alternative browser profile', () => {
      const rotator = new UserAgentRotator();
      const initial = rotator.getProfileForSession('LindaBot');
      const rotated = rotator.rotate('LindaBot');

      expect(rotated).toBeDefined();
    });
  });

  describe('WebSocketReconnectionBackoff (Upgrade 3)', () => {
    it('calculates increasing backoff delay with jitter within max threshold', () => {
      const backoff = new WebSocketReconnectionBackoff({
        baseDelayMs: 500,
        maxDelayMs: 5000,
        factor: 2.0,
        jitterRatio: 0.1,
      });

      const delay1 = backoff.getNextDelay('session_test');
      const delay2 = backoff.getNextDelay('session_test');

      expect(delay1).toBeGreaterThanOrEqual(400);
      expect(delay2).toBeGreaterThan(delay1);
      expect(backoff.getAttempts('session_test')).toBe(2);

      backoff.reset('session_test');
      expect(backoff.getAttempts('session_test')).toBe(0);
    });
  });
});

