/**
 * @file ScratchGarbageCollector.js
 * @description Sweeps temporary scratch media, test dumps, and ephemeral files
 * from data/scratch and cache directories while strictly protecting sacred sessions.
 * Category: Dev-ops / Tools
 */

export class ScratchGarbageCollector {
  constructor(config = {}) {
    this.maxAgeHours = config.maxAgeHours || 24;
    this.allowedDirectories = ['scratch', 'temp', 'cache', 'tmp'];
  }

  /**
   * Evaluates if a file path belongs to an approved scratch directory
   * @param {string} filePath
   * @returns {boolean}
   */
  isScratchFile(filePath = '') {
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();

    // Sacred protection: zero tolerance for session paths
    if (normalized.includes('sessions/')) {
      return false;
    }

    return this.allowedDirectories.some(dir => normalized.includes(`/${dir}/`) || normalized.startsWith(`${dir}/`));
  }

  /**
   * Filters candidate files for garbage collection
   * @param {Array<{ path: string, mtimeMs: number, sizeBytes: number }>} files
   * @param {number} [currentTimeMs]
   * @returns {Array<Object>} Files ready for cleanup
   */
  collectGarbage(files = [], currentTimeMs = Date.now()) {
    const cutoff = currentTimeMs - (this.maxAgeHours * 60 * 60 * 1000);

    return files.filter(f => {
      return this.isScratchFile(f.path) && f.mtimeMs < cutoff;
    });
  }
}

export default new ScratchGarbageCollector();

