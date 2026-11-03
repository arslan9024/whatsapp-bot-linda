/**
 * @file AgentWorkloadCapGuard.js
 * @description Prevents broker overload by enforcing maximum concurrent active lead
 * capacity caps (e.g. max 25 active prospects per broker) in routing logic.
 * Category: Accounts
 */

export class AgentWorkloadCapGuard {
  constructor(config = {}) {
    this.defaultMaxLeads = config.defaultMaxLeads || 25;
    this.agentLoad = new Map(); // agentId -> { activeCount, maxCapacity }
  }

  /**
   * Sets custom capacity limit for a broker
   * @param {string} agentId
   * @param {number} maxCapacity
   */
  setCapacity(agentId, maxCapacity) {
    const existing = this.agentLoad.get(agentId) || { activeCount: 0 };
    this.agentLoad.set(agentId, {
      activeCount: existing.activeCount,
      maxCapacity: Math.max(1, maxCapacity)
    });
  }

  /**
   * Checks if an agent has capacity to accept another lead
   * @param {string} agentId
   * @returns {boolean}
   */
  hasCapacity(agentId) {
    const data = this.agentLoad.get(agentId) || { activeCount: 0, maxCapacity: this.defaultMaxLeads };
    return data.activeCount < data.maxCapacity;
  }

  /**
   * Increments active lead count upon assignment
   * @param {string} agentId
   * @returns {boolean}
   */
  assignLead(agentId) {
    if (!this.hasCapacity(agentId)) {
      return false;
    }
    const data = this.agentLoad.get(agentId) || { activeCount: 0, maxCapacity: this.defaultMaxLeads };
    data.activeCount++;
    this.agentLoad.set(agentId, data);
    return true;
  }

  /**
   * Decrements active count upon deal closure, rejection, or reassignment
   * @param {string} agentId
   */
  releaseLead(agentId) {
    const data = this.agentLoad.get(agentId);
    if (data && data.activeCount > 0) {
      data.activeCount--;
      this.agentLoad.set(agentId, data);
    }
  }

  /**
   * Filters an agent pool to only those with available capacity
   * @param {Array<string>} agentIds
   * @returns {Array<string>}
   */
  filterAvailableAgents(agentIds = []) {
    return agentIds.filter(id => this.hasCapacity(id));
  }
}

export default new AgentWorkloadCapGuard();

