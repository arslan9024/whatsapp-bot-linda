/**
 * @file MultiChannelSlaEscalationTimer.js
 * @description Tracks speed-to-lead response times, triggering automated supervisory escalations if hot portal leads remain unanswered past SLA thresholds.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class MultiChannelSlaEscalationTimer {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.slaThresholdSeconds = options.slaThresholdSeconds || 180; // 3-minute SLA for hot inbound leads
  }

  /**
   * Evaluates response latency against team SLA.
   * @param {Object} leadStatus
   * @param {string} leadStatus.leadId
   * @param {number} leadStatus.inboundTimestampMs
   * @param {number} [leadStatus.firstResponseTimestampMs]
   * @param {string} leadStatus.assignedAgentName
   * @returns {Object}
   */
  checkSlaBreach(leadStatus) {
    const now = Date.now();
    const respondedAt = leadStatus.firstResponseTimestampMs || now;
    const elapsedSeconds = Math.round((respondedAt - leadStatus.inboundTimestampMs) / 1000);
    const hasBreached = elapsedSeconds > this.slaThresholdSeconds && !leadStatus.firstResponseTimestampMs;

    return {
      leadId: leadStatus.leadId,
      assignedAgent: leadStatus.assignedAgentName,
      elapsedSeconds,
      slaLimitSeconds: this.slaThresholdSeconds,
      hasBreachedSla: hasBreached,
      status: hasBreached ? 'CRITICAL_SLA_BREACH' : (leadStatus.firstResponseTimestampMs ? 'RESOLVED_WITHIN_SLA' : 'WITHIN_SLA_WINDOW'),
      managerAlertPayload: hasBreached ? {
        urgency: 'HIGH_PRIORITY_REASSIGNMENT',
        alertText: `🚨 SLA Alert: Hot lead ${leadStatus.leadId} assigned to ${leadStatus.assignedAgentName} has waited ${Math.round(elapsedSeconds / 60)} minutes without response. Auto-escalating to Managing Director.`
      } : null
    };
  }
}

export default new MultiChannelSlaEscalationTimer();
