/**
 * @file LeadVacationReallocator.js
 * @description Manages lead pipeline reassignments when brokers go on approved leave,
 * redirecting active prospects to designated covering buddies.
 * Category: Accounts
 */

export class LeadVacationReallocator {
  constructor() {
    this.vacationRegistry = new Map(); // agentId -> { startDate, endDate, coveringAgentId }
  }

  /**
   * Schedules a vacation window with a designated covering teammate
   * @param {string} agentId
   * @param {Object} details
   * @param {string} details.startDate - 'YYYY-MM-DD'
   * @param {string} details.endDate - 'YYYY-MM-DD'
   * @param {string} details.coveringAgentId
   */
  scheduleVacation(agentId, details) {
    this.vacationRegistry.set(agentId, {
      startDate: new Date(details.startDate),
      endDate: new Date(details.endDate),
      coveringAgentId: details.coveringAgentId || null
    });
  }

  /**
   * Checks whether an agent is currently on vacation
   * @param {string} agentId
   * @param {Date} [checkDate]
   * @returns {boolean}
   */
  isOnVacation(agentId, checkDate = new Date()) {
    const record = this.vacationRegistry.get(agentId);
    if (!record) return false;
    return checkDate >= record.startDate && checkDate <= record.endDate;
  }

  /**
   * Resolves the active routing target for an agent, redirecting to covering agent if on leave
   * @param {string} primaryAgentId
   * @param {Date} [checkDate]
   * @returns {{ effectiveAgentId: string, redirected: boolean, originalAgentId: string }}
   */
  resolveEffectiveAgent(primaryAgentId, checkDate = new Date()) {
    if (!this.isOnVacation(primaryAgentId, checkDate)) {
      return { effectiveAgentId: primaryAgentId, redirected: false, originalAgentId: primaryAgentId };
    }

    const record = this.vacationRegistry.get(primaryAgentId);
    const target = record.coveringAgentId || primaryAgentId;

    return {
      effectiveAgentId: target,
      redirected: target !== primaryAgentId,
      originalAgentId: primaryAgentId
    };
  }

  /**
   * Cancels or concludes a vacation period early
   * @param {string} agentId
   */
  concludeVacation(agentId) {
    this.vacationRegistry.delete(agentId);
  }
}

export default new LeadVacationReallocator();

