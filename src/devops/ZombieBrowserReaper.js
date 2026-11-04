/**
 * @file ZombieBrowserReaper.js
 * @description Scans for and terminates orphaned Chrome/Chromium headless instances.
 * MANDATORY SAFETY LAW: Kills ONLY chrome.exe / chromium.exe; NEVER touches node.exe.
 * Category: Dev-ops / Tools
 */

export class ZombieBrowserReaper {
  constructor(config = {}) {
    this.safeProcessNames = ['chrome.exe', 'chromium.exe', 'chrome', 'chromium', 'google-chrome'];
    this.strictlyForbiddenTargets = ['node.exe', 'node', 'npm', 'nodemon', 'pwsh.exe', 'bash'];
  }

  /**
   * Asserts whether a process candidate is safe for termination
   * @param {string} processName
   * @returns {boolean}
   */
  isSafeToReap(processName) {
    if (!processName || typeof processName !== 'string') return false;
    const lower = processName.trim().toLowerCase();

    // Zero tolerance: reject any node runtime process
    if (this.strictlyForbiddenTargets.some(f => lower === f || lower.startsWith(f))) {
      return false;
    }

    // Must explicitly match known browser binaries
    return this.safeProcessNames.some(s => lower === s || lower.endsWith(s));
  }

  /**
   * Generates safe OS termination command string
   * @param {string} osPlatform - 'win32' | 'linux' | 'darwin'
   * @returns {string} Safe kill command targeting strictly Chrome/Chromium
   */
  getReapCommand(osPlatform = process.platform) {
    if (osPlatform === 'win32') {
      return 'taskkill /F /IM chrome.exe /IM chromium.exe /T';
    }
    return 'pkill -f "(chrome|chromium)" || true';
  }

  /**
   * Filters a process list to only safe browser instances
   * @param {Array<{ pid: number, name: string, memoryMb?: number }>} processes
   * @returns {Array<{ pid: number, name: string }>} Safe termination list
   */
  filterSafeZombieProcesses(processes = []) {
    return processes.filter(p => this.isSafeToReap(p.name));
  }
}

export default new ZombieBrowserReaper();

