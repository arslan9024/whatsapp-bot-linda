/**
 * @file OneClickDiagnosticRunner.js
 * @description Triggers one-click diagnostic actions from Web UI buttons (doctor check,
 * safe browser cleanup, cache wipe) with strict command validation and execution tracking.
 * Category: Core
 */

export class OneClickDiagnosticRunner {
  constructor() {
    this.validActions = ['doctor', 'cleanup_browsers', 'clean_cache'];
    this.actionHistory = [];
  }

  /**
   * Plans and validates diagnostic execution
   * @param {string} actionName
   * @param {string} operator
   * @returns {{ allowed: boolean, taskId: string, actionName: string, status: string }}
   */
  dispatchAction(actionName, operator = 'admin') {
    if (!this.validActions.includes(actionName)) {
      throw new Error(`Invalid diagnostic action: "${actionName}". Allowed: ${this.validActions.join(', ')}`);
    }

    const taskId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      taskId,
      actionName,
      operator,
      dispatchedAt: new Date().toISOString(),
      status: 'DISPATCHED'
    };

    this.actionHistory.push(record);

    return {
      allowed: true,
      taskId,
      actionName,
      status: 'DISPATCHED'
    };
  }

  /**
   * Completes a task execution
   * @param {string} taskId
   * @param {boolean} success
   * @param {string} [output]
   */
  finishTask(taskId, success, output = '') {
    const task = this.actionHistory.find(t => t.taskId === taskId);
    if (task) {
      task.status = success ? 'SUCCESS' : 'FAILED';
      task.completedAt = new Date().toISOString();
      task.output = output;
    }
  }
}

export default new OneClickDiagnosticRunner();

