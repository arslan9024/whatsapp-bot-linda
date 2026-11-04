/**
 * @file ThemeTokenEngine.js
 * @description Provides design tokens and CSS color variables for dark/light mode
 * switching optimized for 24/7 operations room monitors and high contrast viewports.
 * Category: UI / Front-end
 */

export class ThemeTokenEngine {
  constructor() {
    this.themes = {
      dark: {
        bgPrimary: '#0f172a',
        bgSurface: '#1e293b',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        borderColor: '#334155',
        accentColor: '#3b82f6',
        successColor: '#10b981',
        warningColor: '#f59e0b',
        errorColor: '#ef4444'
      },
      light: {
        bgPrimary: '#f8fafc',
        bgSurface: '#ffffff',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        borderColor: '#e2e8f0',
        accentColor: '#2563eb',
        successColor: '#059669',
        warningColor: '#d97706',
        errorColor: '#dc2626'
      }
    };
  }

  /**
   * Retrieves theme token map
   * @param {'dark'|'light'} mode
   * @returns {Object}
   */
  getTokens(mode = 'dark') {
    return this.themes[mode] || this.themes.dark;
  }
}

export default new ThemeTokenEngine();

