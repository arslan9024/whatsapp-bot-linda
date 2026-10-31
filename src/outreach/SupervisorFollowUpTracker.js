/**
 * ====================================================================
 * SUPERVISOR FOLLOW-UP TRACKER (24-Hour SLA Monitor)
 * ====================================================================
 * Tracks leads assigned by the Primary Master to junior real estate agents.
 * Monitored by the supervisor to ensure leads are followed up promptly.
 *
 * @since Development Phase — October 2026
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../core/Logger.js';
import { phoneKey, maskPhone } from './OwnerPhoneNormalizer.js';

const logger = new Logger('SupervisorFollowUpTracker');

export class SupervisorFollowUpTracker {
  constructor(filePath = path.resolve('data', 'outreach', 'pending-followups.json')) {
    this.filePath = filePath;
    this.slaHours = 24;
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf8')) || [];
      }
    } catch (_) {
      /* fallback */
    }
    return [];
  }

  save(items) {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), 'utf8');
    } catch (err) {
      logger.warn(`Failed to save pending followups: ${err.message}`);
    }
  }

  /**
   * Record a new follow-up assignment.
   */
  recordAssignment({
    ownerName,
    clientPhone,
    assignedAgentPhone,
    agentName = '',
    community = 'Damac Hills 2',
    unit = '',
  }) {
    const list = this.load();
    const cleanClient = phoneKey(clientPhone);

    // Update existing or add new
    const existingIdx = list.findIndex((i) => phoneKey(i.clientPhone) === cleanClient);
    const entry = {
      id: `flw_${Date.now()}_${cleanClient}`,
      ownerName: ownerName || 'Property Owner',
      clientPhone: `+${cleanClient}`,
      assignedAgentPhone: assignedAgentPhone ? `+${phoneKey(assignedAgentPhone)}` : '',
      agentName: agentName || 'Assigned Agent',
      community,
      unit,
      assignedAt: Date.now(),
      status: 'pending',
    };

    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...entry };
    } else {
      list.push(entry);
    }

    this.save(list);
    logger.info(`Assigned follow-up recorded for client ${maskPhone(cleanClient)} to ${agentName}`);
    return entry;
  }

  /**
   * Mark a lead as completed (followed up).
   */
  markCompleted(clientPhone) {
    const list = this.load();
    const cleanClient = phoneKey(clientPhone);
    let found = false;

    for (const item of list) {
      if (phoneKey(item.clientPhone) === cleanClient) {
        item.status = 'completed';
        item.completedAt = Date.now();
        found = true;
      }
    }

    if (found) {
      this.save(list);
    }
    return found;
  }

  /**
   * Get all currently pending assignments with SLA flags.
   */
  getPendingAssignments() {
    const list = this.load();
    const now = Date.now();
    const slaMs = this.slaHours * 60 * 60 * 1000;

    return list
      .filter((i) => i.status === 'pending')
      .map((item) => {
        const elapsedMs = now - item.assignedAt;
        const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));
        const isOverdue = elapsedMs > slaMs;

        return {
          ...item,
          elapsedHours,
          isOverdue,
          slaLabel: isOverdue ? `⚠️ OVERDUE (${elapsedHours}h)` : `⏳ ${elapsedHours}h / 24h`,
        };
      })
      .sort((a, b) => b.assignedAt - a.assignedAt);
  }
}

export const supervisorFollowUpTracker = new SupervisorFollowUpTracker();
export default supervisorFollowUpTracker;
