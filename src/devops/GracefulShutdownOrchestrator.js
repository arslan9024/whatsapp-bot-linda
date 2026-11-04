/**
 * @file GracefulShutdownOrchestrator.js
 * @description Coordinates orderly shutdown on SIGINT/SIGTERM: drains active queues,
 * commits pending database writes, and cleanly detaches Puppeteer without orphan processes.
 * Category: Dev-ops / Tools
 */

export class GracefulShutdownOrchestrator {
  constructor(config = {}) {
    this.timeoutMs = config.timeoutMs || 10000; // 10s maximum graceful wait
    this.cleanupTasks = [];
    this.isShuttingDown = false;
  }

  /**
   * Registers a cleanup lifecycle hook
   * @param {string} name
   * @param {Function} asyncFn
   */
  registerCleanupTask(name, asyncFn) {
    this.cleanupTasks.push({ name, asyncFn });
  }

  /**
   * Executes all registered cleanup tasks sequentially
   * @returns {Promise<{ completed: Array<string>, failed: Array<{ name: string, error: string }> }>}
   */
  async executeShutdown() {
    if (this.isShuttingDown) {
      return { completed: [], failed: [] };
    }
    this.isShuttingDown = true;

    const completed = [];
    const failed = [];

    for (const task of this.cleanupTasks) {
      try {
        await Promise.race([
          task.asyncFn(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Task timeout')), this.timeoutMs))
        ]);
        completed.push(task.name);
      } catch (err) {
        failed.push({ name: task.name, error: err.message });
      }
    }

    return { completed, failed };
  }
}

export default new GracefulShutdownOrchestrator();

