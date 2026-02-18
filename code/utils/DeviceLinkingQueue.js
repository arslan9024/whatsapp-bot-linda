/**
 * ====================================================================
 * DEVICE LINKING QUEUE MANAGER
 * ====================================================================
 * Manages multi-device linking with parallel processing support
 * 
 * Features:
 * - Queue management for multiple devices
 * - Parallel linking (configurable: 1-3 devices simultaneously)
 * - Priority queue (primary devices first)
 * - Skip/reorder capability
 * - Device status tracking
 * - Linking history with metrics
 * 
 * @since Phase 3+ - February 18, 2026
 */

import { SessionStateManager } from './SessionStateManager.js';

class DeviceLinkingQueue {
  constructor(logBotFn, sessionStateManager = null) {
    this.logBot = logBotFn || console.log;
    this.sessionStateManager = sessionStateManager || new SessionStateManager(logBotFn);
    this.queue = []; // Array of { phoneNumber, role, status, priority, attempts }
    this.activeLinks = new Map(); // Currently linking devices
    this.history = []; // Completed linking operations
    this.maxParallel = 2; // Max devices can link simultaneously
    this.isPaused = false;
  }

  /**
   * Add device to linking queue
   */
  async addToQueue(phoneNumber, options = {}) {
    try {
      // Check if already in queue or linked
      if (this.queue.find(d => d.phoneNumber === phoneNumber)) {
        this.logBot(`[Queue] Device already in queue: ${phoneNumber}`, 'warn');
        return false;
      }

      if (this.sessionStateManager.isDevicePreviouslyLinked(phoneNumber)) {
        this.logBot(`[Queue] Device already linked: ${phoneNumber}`, 'info');
        return false;
      }

      const device = {
        phoneNumber,
        displayName: options.displayName || phoneNumber,
        role: options.role || 'secondary',
        priority: options.priority || (options.role === 'primary' ? 1 : 2),
        status: 'pending',
        attempts: 0,
        addedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null
      };

      this.queue.push(device);
      // Sort by priority (lower number = higher priority)
      this.queue.sort((a, b) => a.priority - b.priority);

      this.logBot(`[Queue] ✅ Added to queue: ${phoneNumber} (Position: ${this.queue.indexOf(device) + 1}/${this.queue.length})`, 'success');
      return true;
    } catch (error) {
      this.logBot(`[Queue] Add error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Get next device to link
   */
  getNextDevice() {
    if (this.isPaused || this.activeLinks.size >= this.maxParallel) {
      return null;
    }

    const device = this.queue.find(d => d.status === 'pending');
    if (!device) return null;

    return device;
  }

  /**
   * Start linking a device
   */
  async startLinking(phoneNumber) {
    try {
      const device = this.queue.find(d => d.phoneNumber === phoneNumber);
      if (!device) {
        this.logBot(`[Queue] Device not found in queue: ${phoneNumber}`, 'error');
        return false;
      }

      device.status = 'linking';
      device.startedAt = new Date().toISOString();
      device.attempts++;

      this.activeLinks.set(phoneNumber, {
        startTime: Date.now(),
        attempts: device.attempts
      });

      const total = this.queue.length;
      const position = this.queue.indexOf(device) + 1;
      this.logBot(`[Queue] 🔗 Linking device ${position}/${total}: ${phoneNumber}`, 'success');
      this.displayQueueStatus();

      return true;
    } catch (error) {
      this.logBot(`[Queue] Start linking error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Mark device as successfully linked
   */
  async completeLinking(phoneNumber, metadata = {}) {
    try {
      const device = this.queue.find(d => d.phoneNumber === phoneNumber);
      if (!device) {
        this.logBot(`[Queue] Device not found: ${phoneNumber}`, 'warn');
        return false;
      }

      device.status = 'linked';
      device.completedAt = new Date().toISOString();

      const linkTime = this.activeLinks.get(phoneNumber);
      if (linkTime) {
        const duration = Date.now() - linkTime.startTime;
        this.logBot(`[Queue] ✅ Linked successfully: ${phoneNumber} (${duration / 1000}s)`, 'success');
      }

      this.activeLinks.delete(phoneNumber);

      // Save to history
      this.history.push({
        ...device,
        duration: linkTime ? Date.now() - linkTime.startTime : 0,
        metadata
      });

      this.displayQueueStatus();
      return true;
    } catch (error) {
      this.logBot(`[Queue] Complete linking error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Mark device as failed
   */
  async failLinking(phoneNumber, error) {
    try {
      const device = this.queue.find(d => d.phoneNumber === phoneNumber);
      if (!device) return false;

      if (device.attempts < 3) {
        device.status = 'pending'; // Retry
        this.logBot(`[Queue] ⚠️  Linking failed: ${phoneNumber}, retrying... (attempt ${device.attempts + 1}/3)`, 'warn');
      } else {
        device.status = 'failed';
        this.logBot(`[Queue] ❌ Linking failed after 3 attempts: ${phoneNumber}`, 'error');
      }

      this.activeLinks.delete(phoneNumber);
      this.displayQueueStatus();
      return true;
    } catch (error) {
      this.logBot(`[Queue] Fail linking error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Skip device in queue
   */
  skipDevice(phoneNumber) {
    const device = this.queue.find(d => d.phoneNumber === phoneNumber);
    if (!device) return false;

    device.status = 'skipped';
    this.activeLinks.delete(phoneNumber);
    this.logBot(`[Queue] ⏭️  Device skipped: ${phoneNumber}`, 'info');
    this.displayQueueStatus();
    return true;
  }

  /**
   * Pause linking operations
   */
  pauseLinking() {
    this.isPaused = true;
    this.logBot(`[Queue] ⏸️  Linking paused`, 'info');
  }

  /**
   * Resume linking operations
   */
  resumeLinking() {
    this.isPaused = false;
    this.logBot(`[Queue] ▶️  Linking resumed`, 'info');
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    const pending = this.queue.filter(d => d.status === 'pending').length;
    const linking = this.activeLinks.size;
    const linked = this.queue.filter(d => d.status === 'linked').length;
    const failed = this.queue.filter(d => d.status === 'failed').length;

    return {
      pending,
      linking,
      linked,
      failed,
      total: this.queue.length,
      successRate: this.queue.length > 0 ? ((linked / this.queue.length) * 100).toFixed(2) + '%' : 'N/A'
    };
  }

  /**
   * Display queue status in terminal
   */
  displayQueueStatus() {
    const status = this.getQueueStatus();

    console.log(`
╔════════════════════════════════════════════════════════╗
║          DEVICE LINKING QUEUE STATUS                   ║
╠════════════════════════════════════════════════════════╣
║  ⏳ Pending:  ${status.pending.toString().padEnd(5)} | 🔗 Linking: ${status.linking.toString().padEnd(2)} │
║  ✅ Linked:   ${status.linked.toString().padEnd(5)} | ❌ Failed:  ${status.failed.toString().padEnd(2)} │
║  📊 Success Rate: ${status.successRate.toString().padEnd(4)}                     │
║  📈 Total Queued: ${status.total.toString().padEnd(41)} │
╚════════════════════════════════════════════════════════╝
`);
  }

  /**
   * Get detailed queue view
   */
  getDetailedQueueView() {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`DEVICE LINKING QUEUE - DETAILED VIEW`);
    console.log(`${'═'.repeat(60)}\n`);

    this.queue.forEach((device, idx) => {
      const statusIcon = {
        pending: '⏳',
        linking: '🔗',
        linked: '✅',
        failed: '❌',
        skipped: '⏭️'
      }[device.status] || '❓';

      console.log(`${(idx + 1).toString().padEnd(2)} ${statusIcon} ${device.displayName.padEnd(30)} | ${device.role.padEnd(10)} | Attempts: ${device.attempts}`);
    });

    console.log(`\n${'═'.repeat(60)}\n`);
  }

  /**
   * Clear queue (reset)
   */
  clearQueue() {
    this.queue = [];
    this.activeLinks.clear();
    this.logBot(`[Queue] 🗑️  Queue cleared`, 'info');
  }

  /**
   * Get linking history (metrics)
   */
  getHistory() {
    return {
      totalLinked: this.history.filter(h => h.status === 'linked').length,
      totalFailed: this.history.filter(h => h.status === 'failed').length,
      avgLinkingTime: this.history.length > 0 
        ? (this.history.reduce((sum, h) => sum + (h.duration || 0), 0) / this.history.length / 1000).toFixed(2) + 's'
        : 'N/A',
      history: this.history
    };
  }

  /**
   * Export queue metrics
   */
  exportMetrics() {
    const status = this.getQueueStatus();
    const history = this.getHistory();

    return {
      timestamp: new Date().toISOString(),
      queue: status,
      history,
      activeLinks: Array.from(this.activeLinks.keys()),
      devices: this.queue.map(d => ({
        phoneNumber: d.phoneNumber,
        status: d.status,
        role: d.role,
        attempts: d.attempts,
        startedAt: d.startedAt,
        completedAt: d.completedAt
      }))
    };
  }
}

export { DeviceLinkingQueue };
export default DeviceLinkingQueue;
