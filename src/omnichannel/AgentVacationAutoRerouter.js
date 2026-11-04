/**
 * @file AgentVacationAutoRerouter.js
 * @description Automatically detects out-of-office agent statuses, temporarily bypassing their queue and delegating inbound client communications to an active co-broker.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class AgentVacationAutoRerouter {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.outOfOfficeRoster = new Map(options.initialOoo || []);
  }

  /**
   * Sets vacation status for an agent.
   * @param {string} agentId
   * @param {string} backupAgentId
   * @param {string} resumeDate (YYYY-MM-DD)
   */
  setOutOfOffice(agentId, backupAgentId, resumeDate) {
    this.outOfOfficeRoster.set(agentId, { backupAgentId, resumeDate });
  }

  /**
   * Clears out-of-office status.
   * @param {string} agentId
   */
  clearOutOfOffice(agentId) {
    this.outOfOfficeRoster.delete(agentId);
  }

  /**
   * Resolves active recipient for lead delivery.
   * @param {string} targetAgentId
   * @returns {Object}
   */
  resolveActiveAgent(targetAgentId) {
    const ooo = this.outOfOfficeRoster.get(targetAgentId);

    if (ooo) {
      return {
        originalAgentId: targetAgentId,
        isOutOfOffice: true,
        effectiveAgentId: ooo.backupAgentId,
        resumeDate: ooo.resumeDate,
        delegationNotice: `Agent ${targetAgentId} is out-of-office until ${ooo.resumeDate}. Inbound lead auto-delegated to backup agent ${ooo.backupAgentId}.`
      };
    }

    return {
      originalAgentId: targetAgentId,
      isOutOfOffice: false,
      effectiveAgentId: targetAgentId,
      delegationNotice: null
    };
  }
}

export default new AgentVacationAutoRerouter();
