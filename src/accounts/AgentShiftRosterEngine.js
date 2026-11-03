/**
 * @file AgentShiftRosterEngine.js
 * @description Manages human real estate brokers' working shifts, weekend rotas,
 * public holidays (UAE), and leave calendars to guarantee active routing.
 * Category: Accounts
 */

export class AgentShiftRosterEngine {
  constructor(config = {}) {
    this.agentsRoster = new Map();
    this.timezone = config.timezone || 'Asia/Dubai';
  }

  /**
   * Registers or updates an agent's working schedule
   * @param {string} agentId
   * @param {Object} schedule
   * @param {string} schedule.name
   * @param {number} schedule.startHour - e.g. 9 (09:00)
   * @param {number} schedule.endHour - e.g. 18 (18:00)
   * @param {Array<number>} schedule.workingDays - e.g. [1, 2, 3, 4, 5] (Mon-Fri)
   * @param {Array<string>} [schedule.leaves] - ISO Date strings
   */
  registerAgent(agentId, schedule) {
    this.agentsRoster.set(agentId, {
      agentId,
      name: schedule.name || agentId,
      startHour: schedule.startHour ?? 9,
      endHour: schedule.endHour ?? 18,
      workingDays: schedule.workingDays || [1, 2, 3, 4, 5],
      leaves: new Set(schedule.leaves || []),
      isOnDutyOverride: schedule.isOnDutyOverride ?? null
    });
  }

  /**
   * Checks if an agent is currently on shift and available for routing
   * @param {string} agentId
   * @param {Date} [targetDate]
   * @returns {boolean}
   */
  isAgentAvailable(agentId, targetDate = new Date()) {
    const agent = this.agentsRoster.get(agentId);
    if (!agent) return false;

    if (agent.isOnDutyOverride !== null) {
      return agent.isOnDutyOverride;
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    if (agent.leaves.has(dateStr)) {
      return false;
    }

    // Determine day of week in target timezone (default 0=Sun, 1=Mon ... 6=Sat)
    const dayOfWeek = targetDate.getDay();
    if (!agent.workingDays.includes(dayOfWeek)) {
      return false;
    }

    const currentHour = targetDate.getHours();
    return currentHour >= agent.startHour && currentHour < agent.endHour;
  }

  /**
   * Retrieves all agents currently on duty
   * @param {Date} [targetDate]
   * @returns {Array<Object>}
   */
  getAvailableAgents(targetDate = new Date()) {
    const available = [];
    for (const [id, agent] of this.agentsRoster.entries()) {
      if (this.isAgentAvailable(id, targetDate)) {
        available.push(agent);
      }
    }
    return available;
  }
}

export default new AgentShiftRosterEngine();
