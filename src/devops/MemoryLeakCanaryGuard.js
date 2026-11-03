/**
 * @file MemoryLeakCanaryGuard.js
 * @description Monitors process RSS, Heap Used, and V8 memory limits.
 * Emits warnings and canary alerts before out-of-memory (OOM) fatal crashes.
 * Category: Dev-ops / Tools
 */

export class MemoryLeakCanaryGuard {
  constructor(config = {}) {
    this.heapThresholdPercent = config.heapThresholdPercent || 85;
    this.rssLimitMb = config.rssLimitMb || 1500; // 1.5 GB ceiling
  }

  /**
   * Evaluates memory snapshot
   * @param {Object} [memoryUsage] - defaults to process.memoryUsage()
   * @returns {{ status: 'OK'|'WARNING'|'CRITICAL', heapUsedMb: number, rssMb: number, heapPercent: number, recommendation: string }}
   */
  evaluateMemory(memoryUsage = process.memoryUsage()) {
    const heapUsedMb = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMb = Math.round(memoryUsage.rss / 1024 / 1024);

    const heapPercent = Math.round((heapUsedMb / (heapTotalMb || 1)) * 100);

    let status = 'OK';
    let recommendation = 'Memory levels healthy.';

    if (heapPercent >= this.heapThresholdPercent || rssMb >= this.rssLimitMb) {
      status = 'CRITICAL';
      recommendation = 'Heap or RSS threshold breached. Flush media buffers and recycle idle sessions.';
    } else if (heapPercent >= this.heapThresholdPercent - 15) {
      status = 'WARNING';
      recommendation = 'Elevated memory consumption detected. Running garbage collection advisory.';
    }

    return {
      status,
      heapUsedMb,
      rssMb,
      heapPercent,
      recommendation
    };
  }
}

export default new MemoryLeakCanaryGuard();
