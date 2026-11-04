/**
 * @file DynamicLogLevelSwitcher.js
 * @description Enables runtime switching of system logging levels (debug, info, warn, error)
 * via API or UI console without requiring process restarts.
 * Category: Dev-ops / Tools
 */

export class DynamicLogLevelSwitcher {
  constructor(initialLevel = 'info') {
    this.levels = { debug: 10, info: 20, warn: 30, error: 40 };
    this.currentLevel = this.normalizeLevel(initialLevel);
  }

  normalizeLevel(level) {
    const l = String(level).toLowerCase();
    return this.levels[l] ? l : 'info';
  }

  /**
   * Sets new runtime log level
   * @param {string} newLevel
   * @returns {{ success: boolean, previousLevel: string, currentLevel: string }}
   */
  setLevel(newLevel) {
    const prev = this.currentLevel;
    this.currentLevel = this.normalizeLevel(newLevel);
    return {
      success: true,
      previousLevel: prev,
      currentLevel: this.currentLevel
    };
  }

  /**
   * Evaluates if a given level should be emitted
   * @param {string} level
   * @returns {boolean}
   */
  shouldLog(level) {
    const targetWeight = this.levels[this.normalizeLevel(level)];
    const currentWeight = this.levels[this.currentLevel];
    return targetWeight >= currentWeight;
  }
}

export default new DynamicLogLevelSwitcher();

