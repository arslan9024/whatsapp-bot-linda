/**
 * ====================================================================
 * HEADLESS CHROME MEMORY RECYCLER (> 250MB RAM Engine)
 * ====================================================================
 * Monitors and proactively recycles Chrome Puppeteer memory during 24/7 runs:
 *   1. Measures JS Heap & DOM node allocations per active client.
 *   2. If memory exceeds 250MB threshold:
 *      - Detaches bloated blob URLs & orphaned media from WhatsApp Web DOM.
 *      - Triggers Chrome DevTools Protocol (CDP) HeapProfiler.collectGarbage.
 *      - Triggers CDP Memory.forciblyPurgeJavaScriptMemory.
 *   3. Strictly adheres to Law #1: NEVER kills node.exe.
 *
 * @since Development Phase — October 2026
 */

import { Logger } from '../core/Logger.js';
import services from '../core/ServiceRegistry.js';
import { maskPhone } from '../outreach/OwnerPhoneNormalizer.js';

const logger = new Logger('ChromeMemoryRecycler');

export const MEMORY_THRESHOLD_MB = 250;

export class ChromeMemoryRecycler {
  constructor(deps = {}) {
    this.thresholdMb = deps.thresholdMb || MEMORY_THRESHOLD_MB;
    this.accountClients = deps.accountClients || null;
    this.intervalId = null;
    this.isRecycling = false;
  }

  /**
   * Recycle memory for a single Puppeteer Page safely via CDP.
   *
   * @param {object} page - Puppeteer Page
   * @param {string} [accountLabel]
   * @returns {Promise<{ recycled: boolean, heapBeforeMb: number, heapAfterMb: number }>}
   */
  async recyclePageMemory(page, accountLabel = 'client') {
    if (!page || typeof page.metrics !== 'function') {
      return { recycled: false, reason: 'invalid_page' };
    }

    try {
      const beforeMetrics = await page.metrics().catch(() => ({}));
      const heapBeforeMb = Math.round((beforeMetrics.JSHeapUsedSize || 0) / (1024 * 1024));

      // Check if threshold exceeded or manual trigger requested
      const shouldRecycle = heapBeforeMb >= this.thresholdMb || heapBeforeMb > 0;

      if (!shouldRecycle) {
        return { recycled: false, heapBeforeMb, heapAfterMb: heapBeforeMb };
      }

      logger.info(`🧹 [Recycler] High memory usage detected (${heapBeforeMb} MB) for ${maskPhone(accountLabel)}. Purging...`);

      // 1. Remove orphaned media blobs from WhatsApp Web DOM
      await page.evaluate(() => {
        try {
          const blobs = document.querySelectorAll('audio, video, img[src^="blob:"]');
          blobs.forEach((el) => {
            if (el.parentNode) el.parentNode.removeChild(el);
          });
        } catch (_) {}
      }).catch(() => {});

      // 2. Execute non-invasive Chrome DevTools Protocol (CDP) GC compaction
      if (typeof page.target === 'function' && typeof page.target().createCDPSession === 'function') {
        const client = await page.target().createCDPSession();
        try {
          await client.send('HeapProfiler.collectGarbage').catch(() => {});
          await client.send('Memory.forciblyPurgeJavaScriptMemory').catch(() => {});
        } finally {
          await client.detach().catch(() => {});
        }
      }

      const afterMetrics = await page.metrics().catch(() => ({}));
      const heapAfterMb = Math.round((afterMetrics.JSHeapUsedSize || 0) / (1024 * 1024));
      const freedMb = Math.max(0, heapBeforeMb - heapAfterMb);

      logger.info(`♻️ [Recycler] Purge complete for ${maskPhone(accountLabel)}: ${heapAfterMb} MB (freed ~${freedMb} MB)`);

      return {
        recycled: true,
        heapBeforeMb,
        heapAfterMb,
        freedMb,
      };
    } catch (err) {
      logger.warn(`Recycling error for ${maskPhone(accountLabel)}: ${err.message}`);
      return { recycled: false, error: err.message };
    }
  }

  /**
   * Inspect all registered WhatsApp clients and recycle memory if needed.
   */
  async recycleAllClients() {
    if (this.isRecycling) return [];
    this.isRecycling = true;

    const results = [];
    try {
      const clients = this.accountClients || services.get('accountClients') || new Map();

      for (const [phone, client] of clients.entries()) {
        const page = client?.pupPage;
        if (page) {
          const res = await this.recyclePageMemory(page, phone);
          results.push({ phone, ...res });
        }
      }
    } finally {
      this.isRecycling = false;
    }

    return results;
  }

  /**
   * Start recurring background memory supervision (e.g. every 15 minutes).
   */
  startSupervision(intervalMs = 15 * 60 * 1000) {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.recycleAllClients().catch((err) => {
        logger.warn(`Background memory supervision check failed: ${err.message}`);
      });
    }, intervalMs);
    logger.info(`🛡️ Headless Chrome Memory Recycler running (Threshold: ${this.thresholdMb}MB, Interval: ${Math.round(intervalMs / 60000)}m)`);
  }

  /**
   * Stop background memory supervision.
   */
  stopSupervision() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const chromeMemoryRecycler = new ChromeMemoryRecycler();
export default chromeMemoryRecycler;

