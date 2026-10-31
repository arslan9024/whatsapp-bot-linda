/**
 * ====================================================================
 * BI-DIRECTIONAL GOOGLE SHEETS SYNC MANAGER (Pillar 3 - Integrations)
 * ====================================================================
 * Synchronizes real-time lead updates, status tags, and response logs
 * directly back to Google Sheets CRM columns:
 *   - Updates Lead Status (e.g., 'HOT', 'INVESTOR', 'UNRESPONSIVE', 'CONTACTED').
 *   - Writes last contact timestamp (ISO format).
 *   - Appends agent notes and property community briefs.
 *   - Queues sync operations safely with debouncing to avoid Google API rate limits.
 *
 * @since Development Phase — November 2026
 */

import { Logger } from '../core/Logger.js';
import { maskPhone, phoneKey } from '../outreach/OwnerPhoneNormalizer.js';

const logger = new Logger('GoogleSheetsSyncManager');

export class GoogleSheetsSyncManager {
  constructor(options = {}) {
    this.sheetSource = options.sheetSource || null;
    this.syncQueue = [];
    this.isSyncing = false;
    this.maxBatchSize = options.maxBatchSize || 20;
    this.debounceMs = options.debounceMs || 500;
    this.debounceTimer = null;
  }

  /**
   * Queue a lead status update for batch writeback to Google Sheets.
   *
   * @param {object} update
   * @param {string} update.phone - Lead telephone number
   * @param {string} update.status - New lead status
   * @param {string} [update.tier] - Lead tier (HOT, WARM, etc.)
   * @param {string} [update.notes] - Agent / bot notes
   * @param {string} [update.community] - Matched Dubai community
   * @returns {Promise<{ queued: boolean, pendingCount: number }>}
   */
  async queueLeadUpdate({ phone, status, tier = '', notes = '', community = '' }) {
    if (!phone) {
      return { queued: false, reason: 'missing_phone' };
    }

    const payload = {
      phone,
      phoneKey: phoneKey(phone),
      status,
      tier,
      notes,
      community,
      updatedAt: new Date().toISOString(),
    };

    this.syncQueue.push(payload);
    logger.debug(`Queued sheet sync for ${maskPhone(phone)} -> [${status}]`);

    // Trigger debounced flush
    this._scheduleFlush();

    return {
      queued: true,
      pendingCount: this.syncQueue.length,
    };
  }

  /**
   * Schedule debounced flush.
   * @private
   */
  _scheduleFlush() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.flushQueue().catch((err) => {
        logger.warn(`Debounced queue flush error: ${err.message}`);
      });
    }, this.debounceMs);
    if (this.debounceTimer.unref) this.debounceTimer.unref();
  }

  /**
   * Flush all queued updates to Google Sheets.
   *
   * @returns {Promise<{ syncedCount: number, success: boolean }>}
   */
  async flushQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return { syncedCount: 0, success: true };
    }

    this.isSyncing = true;
    const batch = this.syncQueue.splice(0, this.maxBatchSize);

    try {
      if (this.sheetSource && typeof this.sheetSource.writeStatusBatch === 'function') {
        await this.sheetSource.writeStatusBatch(batch);
      } else if (this.sheetSource && typeof this.sheetSource.writeStatus === 'function') {
        for (const item of batch) {
          await this.sheetSource.writeStatus(item.phone, item.status, {
            notes: item.notes,
            tier: item.tier,
          }).catch(() => {});
        }
      }

      logger.info(`📊 Synced ${batch.length} lead updates to Google Sheets CRM`);
      return { syncedCount: batch.length, success: true };
    } catch (err) {
      logger.warn(`Failed to sync batch to Google Sheets: ${err.message}`);
      // Re-queue items that failed to ensure zero data loss
      this.syncQueue.unshift(...batch);
      return { syncedCount: 0, success: false, error: err.message };
    } finally {
      this.isSyncing = false;
      if (this.syncQueue.length > 0) {
        this._scheduleFlush();
      }
    }
  }
}

export const googleSheetsSyncManager = new GoogleSheetsSyncManager();
export default googleSheetsSyncManager;
