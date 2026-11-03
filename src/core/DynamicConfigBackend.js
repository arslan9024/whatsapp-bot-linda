/**
 * @file DynamicConfigBackend.js
 * @description Manages runtime configuration settings (daily send quotas, working hours,
 * rate-limit parameters) editable from the Web UI Settings panel with strict schema validation.
 * Category: Core
 */

export class DynamicConfigBackend {
  constructor(initialSettings = {}) {
    this.settings = {
      dailyOutboundLimit: initialSettings.dailyOutboundLimit || 500,
      minJitterSeconds: initialSettings.minJitterSeconds || 4,
      maxJitterSeconds: initialSettings.maxJitterSeconds || 12,
      workingHoursStart: initialSettings.workingHoursStart ?? 9,
      workingHoursEnd: initialSettings.workingHoursEnd ?? 20,
      autoAntiBanEnabled: initialSettings.autoAntiBanEnabled ?? true
    };
  }

  /**
   * Retrieves current configuration object
   * @returns {Object}
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Validates and updates settings partially
   * @param {Object} patch
   * @returns {{ success: boolean, updated: Object }}
   */
  updateSettings(patch = {}) {
    if (patch.dailyOutboundLimit !== undefined) {
      this.settings.dailyOutboundLimit = Math.max(1, Math.min(2000, Number(patch.dailyOutboundLimit)));
    }
    if (patch.minJitterSeconds !== undefined) {
      this.settings.minJitterSeconds = Math.max(1, Number(patch.minJitterSeconds));
    }
    if (patch.maxJitterSeconds !== undefined) {
      this.settings.maxJitterSeconds = Math.max(this.settings.minJitterSeconds, Number(patch.maxJitterSeconds));
    }
    if (patch.workingHoursStart !== undefined) {
      this.settings.workingHoursStart = Math.max(0, Math.min(23, Number(patch.workingHoursStart)));
    }
    if (patch.workingHoursEnd !== undefined) {
      this.settings.workingHoursEnd = Math.max(0, Math.min(23, Number(patch.workingHoursEnd)));
    }
    if (patch.autoAntiBanEnabled !== undefined) {
      this.settings.autoAntiBanEnabled = Boolean(patch.autoAntiBanEnabled);
    }

    return {
      success: true,
      updated: { ...this.settings }
    };
  }
}

export default new DynamicConfigBackend();
