/**
 * ====================================================================
 * DEVICE FINGERPRINT & BATTERY STATE EMULATOR (Pillar 2 - Anti-Ban)
 * ====================================================================
 * Hardens Puppeteer browser instances against WhatsApp Web bot detection:
 *   1. Full Battery API emulation (level, charging, event listeners)
 *   2. Hardware specs (hardwareConcurrency, deviceMemory)
 *   3. Platform & language consistency (Win32, en-US, ar)
 *   4. Automation flag removal (navigator.webdriver)
 *   5. WebGL & Canvas renderer consistency
 *
 * @since Development Phase — October 2026
 */

import { Logger } from '../core/Logger.js';

const logger = new Logger('DeviceFingerprintEmulator');

export const DEFAULT_FINGERPRINT_CONFIG = {
  batteryLevel: 0.94,
  charging: true,
  hardwareConcurrency: 8,
  deviceMemory: 8,
  platform: 'Win32',
  languages: ['en-US', 'en', 'ar'],
  vendor: 'Google Inc.',
  webglVendor: 'Google Inc. (NVIDIA)',
  webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
};

/**
 * Returns stringified client script for injection into browser page.
 */
export function buildEmulationScript(config = {}) {
  const cfg = { ...DEFAULT_FINGERPRINT_CONFIG, ...config };

  return `
    (function() {
      // 1. Hide webdriver flag
      try {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
          configurable: true,
        });
      } catch (_) {}

      // 2. Emulate realistic Hardware & Platform
      try {
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${cfg.hardwareConcurrency} });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => ${cfg.deviceMemory} });
        Object.defineProperty(navigator, 'platform', { get: () => '${cfg.platform}' });
        Object.defineProperty(navigator, 'languages', { get: () => ${JSON.stringify(cfg.languages)} });
      } catch (_) {}

      // 3. Emulate Battery API (Level 2 Enhanced)
      try {
        const mockBattery = {
          charging: ${cfg.charging},
          chargingTime: ${cfg.charging ? 0 : 7200},
          dischargingTime: ${cfg.charging ? Infinity : 14400},
          level: ${cfg.batteryLevel},
          onchargingchange: null,
          onchargingtimechange: null,
          ondischargingtimechange: null,
          onlevelchange: null,
          addEventListener: function(type, listener) {},
          removeEventListener: function(type, listener) {},
          dispatchEvent: function(event) { return true; }
        };

        navigator.getBattery = () => Promise.resolve(mockBattery);
      } catch (_) {}

      // 4. WebGL vendor & renderer consistency
      try {
        const getParameterOrig = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          // UNMASKED_VENDOR_WEBGL
          if (parameter === 37445) return '${cfg.webglVendor}';
          // UNMASKED_RENDERER_WEBGL
          if (parameter === 37446) return '${cfg.webglRenderer}';
          return getParameterOrig.apply(this, arguments);
        };
      } catch (_) {}

      // 5. Notification permissions default
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const origQuery = navigator.permissions.query;
          navigator.permissions.query = (parameters) => {
            if (parameters && parameters.name === 'notifications') {
              return Promise.resolve({ state: 'granted', onchange: null });
            }
            return origQuery.apply(navigator.permissions, [parameters]);
          };
        }
      } catch (_) {}
    })();
  `;
}

export class DeviceFingerprintEmulator {
  /**
   * Applies the enhanced fingerprint to a Puppeteer Page.
   *
   * @param {object} page - Puppeteer Page instance
   * @param {object} [customConfig]
   * @returns {Promise<boolean>}
   */
  static async apply(page, customConfig = {}) {
    if (!page) return false;

    try {
      const script = buildEmulationScript(customConfig);

      // Evaluate on every new document/reload
      if (typeof page.evaluateOnNewDocument === 'function') {
        await page.evaluateOnNewDocument(script);
      }

      // Also evaluate immediately in current document context
      if (typeof page.evaluate === 'function') {
        await page.evaluate(script).catch(() => {});
      }

      logger.debug('🛡️ Device fingerprint & battery state emulation applied (Level 2)');
      return true;
    } catch (err) {
      logger.warn(`Failed to apply device fingerprint: ${err.message}`);
      return false;
    }
  }
}

export default DeviceFingerprintEmulator;
