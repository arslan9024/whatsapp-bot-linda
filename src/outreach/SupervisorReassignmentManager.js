/**
 * ====================================================================
 * SUPERVISOR REASSIGNMENT & TEAM BROADCAST MANAGER (Pillars 3, 4, 5)
 * ====================================================================
 * Empowers the Primary Master Supervisor to:
 *   1. Reassign pending follow-up leads between agents (Item 10)
 *   2. Broadcast team announcements to all sub-agent lines (Item 16)
 *   3. Provide Damac Hills 2 digital brochure & master plan links (Item 13)
 *
 * @since Development Phase — October 2026
 */

import { Logger } from '../core/Logger.js';
import services from '../core/ServiceRegistry.js';
import { maskPhone, phoneKey } from './OwnerPhoneNormalizer.js';
import { supervisorFollowUpTracker } from './SupervisorFollowUpTracker.js';
import { dispatchSupervisorReminder } from './SupervisorFollowUpDispatcher.js';

const logger = new Logger('SupervisorReassignmentManager');

export class SupervisorReassignmentManager {
  /**
   * Reassign a pending lead from one agent to another.
   */
  static async reassignLead({ clientPhone, newAgentPhone, newAgentName = '', reason = 'Supervisor Reassignment' } = {}) {
    const clientDigits = phoneKey(clientPhone);
    const targetAgentDigits = phoneKey(newAgentPhone);

    const pending = supervisorFollowUpTracker.getPendingAssignments();
    const existing = pending.find((p) => phoneKey(p.clientPhone) === clientDigits);

    if (!existing) {
      return {
        success: false,
        error: `No pending follow-up assignment found for client ${maskPhone(clientDigits)}`,
      };
    }

    // Mark previous assignment completed/reassigned
    supervisorFollowUpTracker.markCompleted(clientDigits, `Reassigned to ${newAgentName || targetAgentDigits}`);

    // Create new assignment
    const newRecord = supervisorFollowUpTracker.recordAssignment({
      ownerName: existing.ownerName,
      clientPhone: clientDigits,
      assignedAgentPhone: targetAgentDigits,
      agentName: newAgentName || `Agent ${maskPhone(targetAgentDigits)}`,
      community: existing.community || 'Damac Hills 2',
      unit: existing.unit || '',
    });

    // Dispatch fresh reminder to new agent line
    const dispatchResult = await dispatchSupervisorReminder({
      clientInfo: {
        name: existing.ownerName,
        phone: clientDigits,
        community: existing.community,
        unit: existing.unit,
      },
      targetAgentPhone: targetAgentDigits,
      agentName: newAgentName || targetAgentDigits,
      historyDetails: `Reassigned from ${existing.agentName}. Reason: ${reason}`,
    });

    logger.info(`🔄 Reassigned lead ${maskPhone(clientDigits)} to ${maskPhone(targetAgentDigits)}`);

    return {
      success: true,
      clientPhone: clientDigits,
      newAgentPhone: targetAgentDigits,
      newAgentName: newRecord.agentName,
      delivery: dispatchResult,
    };
  }

  /**
   * Broadcast an internal master announcement to all active sub-agent lines simultaneously.
   */
  static async broadcastToSubAgents(messageText, options = {}) {
    const clients = options.accountClients || services.get('accountClients') || new Map();
    const acm = options.accountConfigManager || services.get('accountConfigManager');
    const masterPhone = phoneKey(acm?.getMasterPhoneNumber?.() || '');

    const recipients = [];
    for (const [phone, client] of clients.entries()) {
      const digits = phoneKey(phone);
      // Skip supervisor / master itself
      if (digits === masterPhone) continue;
      recipients.push({ phone: digits, client });
    }

    if (recipients.length === 0) {
      return { success: false, reason: 'no_subagents_online', deliveredCount: 0 };
    }

    const broadcastBody = (
      `📢 *LINDA AI — TEAM ANNOUNCEMENT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👑 From: Primary Master Supervisor\n` +
      `📅 Date: ${new Date().toLocaleDateString('en-GB')}\n\n` +
      `${messageText.trim()}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 Internal dispatch to active real estate desk lines.`
    );

    let deliveredCount = 0;
    const errors = [];

    for (const { phone, client } of recipients) {
      try {
        if (options.dryRun) {
          deliveredCount++;
          continue;
        }
        await client.sendMessage(`${phone}@c.us`, broadcastBody);
        deliveredCount++;
        logger.info(`📢 Team announcement delivered to sub-agent ${maskPhone(phone)}`);
      } catch (err) {
        errors.push({ phone, error: err.message });
        logger.warn(`Failed to deliver announcement to ${maskPhone(phone)}: ${err.message}`);
      }
    }

    return {
      success: deliveredCount > 0,
      totalTargets: recipients.length,
      deliveredCount,
      errors,
    };
  }

  /**
   * Get official Damac Hills 2 digital brochure & master plan assets.
   */
  static getBrochureDetails() {
    return (
      `📄 *DAMAC HILLS 2 — DIGITAL BROCHURE & MASTER PLAN*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🌊 *Master Community Overview:*\n` +
      `• Total Area: 42 Million sq.ft.\n` +
      `• 5 Major Towns: Water Town, Sports Town, Down Town, Equestrian Town, Motor Town.\n\n` +
      `📥 *Official Asset Links:*\n` +
      `• Master Community Plan: https://damacproperties.com/en/communities/damac-hills-2\n` +
      `• Amenities Guide & Malibu Beach: https://damacproperties.com/damac-hills-2/amenities\n` +
      `• Cluster Maps: Available on request for Amazon, Victoria, Pacifica, Camellia, etc.\n\n` +
      `💡 Share this information directly with interested owners and buyers!`
    );
  }
}

export default SupervisorReassignmentManager;
