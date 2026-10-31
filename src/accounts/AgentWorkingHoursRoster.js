/**
 * ====================================================================
 * AGENT WORKING HOURS & ON-DUTY ROSTER MANAGER (Pillar 4 - Operations)
 * ====================================================================
 * Ensures incoming leads and follow-ups are routed only to available,
 * on-duty real estate agents based on working shifts and UAE business hours:
 *   - Default business hours: 09:00 to 19:00 (Asia/Dubai Timezone, UTC+4).
 *   - Working days: Monday through Saturday (Sunday off or on-call).
 *   - Round-robin load balancing amongst currently on-duty agents.
 *   - Automatic off-hours auto-responder suggestion:
 *       "Thank you for contacting us! Our property specialists are offline
 *        for the evening and will get back to you first thing at 9:00 AM."
 *
 * @since Development Phase — November 2026
 */

import { Logger } from '../core/Logger.js';
import { maskPhone, phoneKey } from '../outreach/OwnerPhoneNormalizer.js';

const logger = new Logger('AgentWorkingHoursRoster');

export const DEFAULT_SCHEDULE = {
  startHour: 9,    // 09:00 AM
  endHour: 19,     // 07:00 PM
  timeZone: 'Asia/Dubai',
  workingDays: [1, 2, 3, 4, 5, 6], // Monday (1) to Saturday (6)
};

export class AgentWorkingHoursRoster {
  constructor(options = {}) {
    this.schedule = { ...DEFAULT_SCHEDULE, ...options.schedule };
    this.agents = options.agents || []; // [{ phone, name, isOnLeave, lastAssignedAt }]
    this.roundRobinIndex = 0;
  }

  /**
   * Register or update an agent on the roster.
   *
   * @param {object} agent
   * @param {string} agent.phone
   * @param {string} agent.name
   * @param {boolean} [agent.isOnLeave]
   */
  registerAgent({ phone, name, isOnLeave = false }) {
    const key = phoneKey(phone);
    const existingIdx = this.agents.findIndex((a) => phoneKey(a.phone) === key);

    const agentData = {
      phone,
      name,
      isOnLeave,
      lastAssignedAt: existingIdx >= 0 ? this.agents[existingIdx].lastAssignedAt : null,
    };

    if (existingIdx >= 0) {
      this.agents[existingIdx] = agentData;
    } else {
      this.agents.push(agentData);
    }

    logger.debug(`Roster updated for agent: ${name} (${maskPhone(phone)})`);
  }

  /**
   * Check if current time is within UAE working hours.
   *
   * @param {Date} [now]
   * @returns {boolean}
   */
  isWorkingHours(now = new Date()) {
    // Format to Dubai time
    const dubaiDateStr = now.toLocaleString('en-US', { timeZone: this.schedule.timeZone });
    const dubaiDate = new Date(dubaiDateStr);

    const day = dubaiDate.getDay();
    const hour = dubaiDate.getHours();

    const isWorkDay = this.schedule.workingDays.includes(day);
    const isWorkHour = hour >= this.schedule.startHour && hour < this.schedule.endHour;

    return isWorkDay && isWorkHour;
  }

  /**
   * Get list of currently active and available agents.
   *
   * @returns {Array<object>}
   */
  getAvailableAgents() {
    return this.agents.filter((a) => !a.isOnLeave);
  }

  /**
   * Select next available on-duty agent using round-robin distribution.
   *
   * @param {Date} [now]
   * @returns {{ assigned: boolean, agent?: object, offHours?: boolean, autoReplyText?: string }}
   */
  getNextOnDutyAgent(now = new Date()) {
    const activeHours = this.isWorkingHours(now);
    const available = this.getAvailableAgents();

    if (!activeHours) {
      return {
        assigned: false,
        offHours: true,
        autoReplyText: 'Thank you for reaching out! Our property specialists are currently offline and will respond first thing tomorrow at 9:00 AM.',
      };
    }

    if (available.length === 0) {
      return {
        assigned: false,
        offHours: false,
        reason: 'no_agents_available',
      };
    }

    // Select round-robin
    const selected = available[this.roundRobinIndex % available.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % available.length;
    selected.lastAssignedAt = new Date().toISOString();

    logger.info(`🎯 Lead routed to agent: ${selected.name} (${maskPhone(selected.phone)})`);

    return {
      assigned: true,
      agent: selected,
      offHours: false,
    };
  }
}

export const agentWorkingHoursRoster = new AgentWorkingHoursRoster();
export default agentWorkingHoursRoster;

