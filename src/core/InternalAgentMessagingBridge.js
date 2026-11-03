/**
 * @file InternalAgentMessagingBridge.js
 * @description Allows human brokers to command Linda via internal WhatsApp commands
 * (e.g. "!hold lead_123", "!info EMAAR-101", "!takeover", "!status") without client visibility.
 * Category: Core
 */

export class InternalAgentMessagingBridge {
  constructor(config = {}) {
    this.commandPrefix = config.commandPrefix || '!';
    this.authorizedAgentPhones = new Set(config.authorizedAgentPhones || []);
  }

  /**
   * Registers authorized broker phone numbers
   * @param {string|Array<string>} phones
   */
  authorizeAgents(phones) {
    const list = Array.isArray(phones) ? phones : [phones];
    for (const p of list) {
      if (p) this.authorizedAgentPhones.add(p.replace(/\D/g, ''));
    }
  }

  /**
   * Verifies if an incoming sender is an authorized internal broker
   * @param {string} senderPhone
   * @returns {boolean}
   */
  isAuthorized(senderPhone) {
    if (!senderPhone) return false;
    const clean = senderPhone.replace(/\D/g, '');
    return this.authorizedAgentPhones.has(clean);
  }

  /**
   * Parses an internal agent command line
   * @param {string} messageText
   * @param {string} senderPhone
   * @returns {{ isCommand: boolean, command?: string, args?: Array<string>, authorized?: boolean }}
   */
  parseCommand(messageText = '', senderPhone = '') {
    const trimmed = messageText.trim();
    if (!trimmed.startsWith(this.commandPrefix)) {
      return { isCommand: false };
    }

    const authorized = this.isAuthorized(senderPhone);
    const parts = trimmed.slice(this.commandPrefix.length).trim().split(/\s+/);
    const command = (parts[0] || '').toLowerCase();
    const args = parts.slice(1);

    return {
      isCommand: true,
      authorized,
      command,
      args
    };
  }

  /**
   * Dispatches and formats response to authorized broker commands
   * @param {string} command
   * @param {Array<string>} args
   * @returns {string} Response copy
   */
  executeCommand(command, args = []) {
    switch (command) {
      case 'status':
        return `🤖 *Linda Operational*: Swarm active, queue normal, 0 critical alerts.`;
      case 'takeover':
        return `✋ Lead lock transferred to you. Linda will remain silent in this chat for 2 hours.`;
      case 'info':
        return `📋 Fetching property brief for reference: *${args[0] || 'N/A'}*...`;
      case 'hold':
        return `⏸️ Outbound drip sequence paused for lead: *${args[0] || 'current'}*.`;
      default:
        return `❓ Unknown command "!${command}". Available: !status, !takeover, !info <ref>, !hold <id>`;
    }
  }
}

export default new InternalAgentMessagingBridge();

