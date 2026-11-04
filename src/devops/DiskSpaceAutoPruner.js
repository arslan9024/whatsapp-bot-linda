/**
 * @file DiskSpaceAutoPruner.js
 * @description Identifies and schedules pruning for stale log files (> 14 days) and
 * temporary cached media (> 48 hours), strictly protecting sessions/ data.
 * Category: Dev-ops / Tools
 */

export class DiskSpaceAutoPruner {
  constructor(config = {}) {
    this.logRetentionDays = config.logRetentionDays || 14;
    this.tempMediaRetentionHours = config.tempMediaRetentionHours || 48;
  }

  /**
   * Identifies files eligible for pruning based on retention policies
   * @param {Array<{ path: string, type: 'log'|'media'|'session', mtimeMs: number, sizeBytes: number }>} files
   * @param {number} [currentTimeMs]
   * @returns {{ prunableFiles: Array<Object>, bytesReclaimable: number }}
   */
  evaluatePrunableFiles(files = [], currentTimeMs = Date.now()) {
    const logCutoff = currentTimeMs - (this.logRetentionDays * 24 * 60 * 60 * 1000);
    const mediaCutoff = currentTimeMs - (this.tempMediaRetentionHours * 60 * 60 * 1000);

    const prunable = [];
    let reclaimableBytes = 0;

    for (const file of files) {
      // Sacred rule: Never prune session files
      if (file.type === 'session' || file.path.includes('sessions/')) {
        continue;
      }

      let shouldPrune = false;
      if (file.type === 'log' && file.mtimeMs < logCutoff) {
        shouldPrune = true;
      } else if (file.type === 'media' && file.mtimeMs < mediaCutoff) {
        shouldPrune = true;
      }

      if (shouldPrune) {
        prunable.push(file);
        reclaimableBytes += (file.sizeBytes || 0);
      }
    }

    return {
      prunableFiles: prunable,
      count: prunable.length,
      bytesReclaimable: reclaimableBytes
    };
  }
}

export default new DiskSpaceAutoPruner();

