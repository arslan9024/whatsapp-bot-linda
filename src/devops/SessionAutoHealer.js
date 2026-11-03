/**
 * @file SessionAutoHealer.js
 * @description Automatically removes stale Chromium lock artifacts (SingletonLock,
 * SingletonCookie, SingletonSocket) preventing Puppeteer initialization hangs.
 * Category: Dev-ops / Tools
 */

export class SessionAutoHealer {
  constructor() {
    this.lockArtifacts = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'DevToolsActivePort'];
  }

  /**
   * Identifies stale lock files in a file manifest
   * @param {Array<string>} fileNames
   * @returns {Array<string>} Files safe to clear
   */
  detectStaleLocks(fileNames = []) {
    return fileNames.filter(name => {
      const baseName = name.split(/[/\\]/).pop();
      return this.lockArtifacts.includes(baseName);
    });
  }

  /**
   * Plans healing actions without deleting sacred session credentials
   * @param {string} sessionPath
   * @param {Array<string>} sessionFiles
   * @returns {{ safeToHeal: boolean, actions: Array<string> }}
   */
  planHealing(sessionPath, sessionFiles = []) {
    const stale = this.detectStaleLocks(sessionFiles);

    // Verify sacred session files are intact (e.g. IndexedDB or Local Storage)
    const hasCredentials = sessionFiles.some(f => /IndexedDB|Local Storage|Cookies/i.test(f));

    const actions = stale.map(file => `Remove lock artifact: ${file}`);
    if (stale.length === 0) {
      actions.push('No lock artifacts found; session clean.');
    }

    return {
      sessionPath,
      hasCredentials,
      staleLocksCount: stale.length,
      safeToHeal: true,
      actions
    };
  }
}

export default new SessionAutoHealer();
