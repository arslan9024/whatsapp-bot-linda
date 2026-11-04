/**
 * @file ZeroDowntimeHotReloadMesh.js
 * @description Refreshes in-memory prompt templates, rate limit thresholds, and brokerage rosters dynamically without terminating or restarting the Node.js process.
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class ZeroDowntimeHotReloadMesh {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.liveConfigs = new Map(Object.entries(options.initialConfig || {}));
    this.reloadCount = 0;
  }

  /**
   * Ingests updated configuration patch without restarting process.
   * @param {string} configKey
   * @param {any} newConfigValue
   * @returns {Object}
   */
  hotReloadConfig(configKey, newConfigValue) {
    const previous = this.liveConfigs.get(configKey);
    this.liveConfigs.set(configKey, newConfigValue);
    this.reloadCount++;

    return {
      configKey,
      reloadSequenceNumber: this.reloadCount,
      hasChanged: JSON.stringify(previous) !== JSON.stringify(newConfigValue),
      activeValue: newConfigValue,
      processUptimeSeconds: Math.round(process.uptime()),
      downtimeMs: 0,
      status: 'HOT_RELOAD_SUCCESSFUL_ZERO_RESTART'
    };
  }

  /**
   * Retrieves live active configuration.
   * @param {string} configKey
   * @returns {any}
   */
  getConfig(configKey) {
    return this.liveConfigs.get(configKey);
  }
}

export default new ZeroDowntimeHotReloadMesh();
