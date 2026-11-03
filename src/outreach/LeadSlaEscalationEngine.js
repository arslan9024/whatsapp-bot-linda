/**
 * @file LeadSlaEscalationEngine.js
 * @description Monitors lead handoff response SLA timers (15m warning, 30m reassignment).
 * Automatically triggers manager alerts and reassigns dormant leads.
 * Category: Outreach
 */

export class LeadSlaEscalationEngine {
  constructor(config = {}) {
    this.warningThresholdMs = (config.warningMinutes || 15) * 60 * 1000;
    this.reassignThresholdMs = (config.reassignMinutes || 30) * 60 * 1000;
    this.trackedHandoffs = new Map(); // leadId -> handoffRecord
  }

  /**
   * Tracks a newly handed-off lead
   * @param {string} leadId
   * @param {Object} details
   * @param {string} details.agentId
   * @param {string} details.clientPhone
   * @param {string} [details.leadTier] - 'VIP' | 'STANDARD'
   */
  trackHandoff(leadId, details) {
    this.trackedHandoffs.set(leadId, {
      leadId,
      agentId: details.agentId,
      clientPhone: details.clientPhone,
      leadTier: details.leadTier || 'STANDARD',
      handoffTime: Date.now(),
      status: 'pending', // 'pending' | 'acknowledged' | 'reassigned'
      warningIssued: false
    });
  }

  /**
   * Marks a handoff as acknowledged/contacted by the agent
   * @param {string} leadId
   */
  acknowledgeLead(leadId) {
    const record = this.trackedHandoffs.get(leadId);
    if (record) {
      record.status = 'acknowledged';
      record.acknowledgedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Evaluates all pending leads against SLA thresholds
   * @param {number} [currentTimeMs]
   * @returns {{ warnings: Array<Object>, reassignments: Array<Object> }}
   */
  evaluateSlaBreaches(currentTimeMs = Date.now()) {
    const warnings = [];
    const reassignments = [];

    for (const [leadId, rec] of this.trackedHandoffs.entries()) {
      if (rec.status !== 'pending') continue;

      const elapsed = currentTimeMs - rec.handoffTime;

      if (elapsed >= this.reassignThresholdMs) {
        rec.status = 'reassigned';
        reassignments.push({
          leadId,
          previousAgentId: rec.agentId,
          elapsedMinutes: Math.round(elapsed / 60000),
          tier: rec.leadTier
        });
      } else if (elapsed >= this.warningThresholdMs && !rec.warningIssued) {
        rec.warningIssued = true;
        warnings.push({
          leadId,
          agentId: rec.agentId,
          elapsedMinutes: Math.round(elapsed / 60000),
          tier: rec.leadTier
        });
      }
    }

    return { warnings, reassignments };
  }
}

export default new LeadSlaEscalationEngine();
