/**
 * @file HotReloadingManager.js
 * @description Dynamically hot-reloads message templates, price curves, and area configs
 * from disk without dropping active WhatsApp Web socket sessions or restarting node.
 * Category: Dev-ops / Tools
 */

export class HotReloadingManager {
  constructor() {
    this.reloadableModules = new Map(); // key -> { currentConfig, lastReloaded }
    this.reloadHooks = new Map(); // key -> Array<callback>
  }

  /**
   * Registers a hot-reloadable configuration module
   * @param {string} key - e.g. 'message_templates', 'area_prices'
   * @param {Object} initialConfig
   */
  registerModule(key, initialConfig) {
    this.reloadableModules.set(key, {
      config: initialConfig,
      lastReloaded: new Date().toISOString()
    });
  }

  /**
   * Attaches a listener invoked on module reload
   * @param {string} key
   * @param {Function} callback
   */
  onReload(key, callback) {
    if (!this.reloadHooks.has(key)) {
      this.reloadHooks.set(key, []);
    }
    this.reloadHooks.get(key).push(callback);
  }

  /**
   * Applies new config dynamically without server restart
   * @param {string} key
   * @param {Object} newConfig
   * @returns {{ success: boolean, reloadedAt: string }}
   */
  reload(key, newConfig) {
    const timestamp = new Date().toISOString();
    this.reloadableModules.set(key, {
      config: newConfig,
      lastReloaded: timestamp
    });

    const listeners = this.reloadHooks.get(key) || [];
    for (const fn of listeners) {
      try {
        fn(newConfig);
      } catch (err) {
        // Suppress callback error from breaking reload pipeline
      }
    }

    return { success: true, reloadedAt: timestamp };
  }

  /**
   * Retrieves active configuration for a module
   * @param {string} key
   * @returns {Object|null}
   */
  getConfig(key) {
    const entry = this.reloadableModules.get(key);
    return entry ? entry.config : null;
  }
}

export default new HotReloadingManager();

