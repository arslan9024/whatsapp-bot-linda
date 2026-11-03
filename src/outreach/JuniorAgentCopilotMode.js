/**
 * @file JuniorAgentCopilotMode.js
 * @description Copilot approval gate requiring senior broker or team leader sign-off
 * on WhatsApp offers or proposals composed by junior brokers.
 * Category: Outreach
 */

export class JuniorAgentCopilotMode {
  constructor() {
    this.juniorAgents = new Set();
    this.pendingApprovals = new Map(); // proposalId -> proposalObject
  }

  /**
   * Registers an agent as junior requiring supervisor sign-off
   * @param {string} agentId
   */
  registerJuniorAgent(agentId) {
    this.juniorAgents.add(agentId);
  }

  /**
   * Checks if an agent is in copilot supervised mode
   * @param {string} agentId
   * @returns {boolean}
   */
  isSupervised(agentId) {
    return this.juniorAgents.has(agentId);
  }

  /**
   * Submits an outgoing proposal draft for senior approval
   * @param {Object} proposal
   * @param {string} proposal.agentId
   * @param {string} proposal.clientJid
   * @param {string} proposal.proposedMessage
   * @returns {{ requiresApproval: boolean, proposalId?: string }}
   */
  submitForDispatch(proposal) {
    if (!this.isSupervised(proposal.agentId)) {
      return { requiresApproval: false };
    }

    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.pendingApprovals.set(proposalId, {
      ...proposal,
      proposalId,
      status: 'pending',
      submittedAt: new Date().toISOString()
    });

    return {
      requiresApproval: true,
      proposalId
    };
  }

  /**
   * Approves or rejects a proposal
   * @param {string} proposalId
   * @param {string} approverId
   * @param {boolean} approved
   * @returns {Object|null}
   */
  reviewProposal(proposalId, approverId, approved) {
    const item = this.pendingApprovals.get(proposalId);
    if (!item) return null;

    item.status = approved ? 'approved' : 'rejected';
    item.reviewedBy = approverId;
    item.reviewedAt = new Date().toISOString();

    return item;
  }
}

export default new JuniorAgentCopilotMode();

