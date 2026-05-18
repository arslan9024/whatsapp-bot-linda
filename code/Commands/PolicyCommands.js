/**
 * ====================================================================
 * POLICY COMPLIANCE COMMANDS
 * ====================================================================
 * WhatsApp bot commands for managing and auditing policy compliance.
 *
 * Commands:
 *   !policy check <phone>      - Check opt-in/out status of a contact
 *   !policy optin <phone>      - Manually record opt-in
 *   !policy optout <phone>     - Manually record opt-out
 *   !policy report             - Full compliance statistics report
 *   !policy help               - Show all policy commands
 *   !compliance audit [n]      - Show last N audit log entries (default 20)
 *   !compliance campaign       - Show campaign pre-flight audit guide
 *   !compliance stats          - Show compliance statistics
 *
 * @since Wave-3 Policy Upgrade — May 2026
 * @see code/Services/PolicyComplianceService.js
 */

import policyCompliance from '../Services/PolicyComplianceService.js';
import { Logger } from '../utils/Logger.js';

const log = new Logger('PolicyCommands');

export class PolicyCommands {
  constructor(logBotFn) {
    this.logBot = logBotFn || console.log;
  }

  /**
   * Route !policy sub-commands.
   * @param {string}   subCommand - e.g. 'check', 'optin', 'optout', 'report', 'help'
   * @param {string[]} args       - Remaining args
   * @param {object}   msg        - whatsapp-web.js Message object
   * @returns {Promise<string>}   Reply text
   */
  async handlePolicy(subCommand, args, msg) {
    switch ((subCommand || '').toLowerCase()) {
      case 'check':
        return this._checkStatus(args[0], msg);
      case 'optin':
        return this._recordOptIn(args[0], msg);
      case 'optout':
        return this._recordOptOut(args[0], msg);
      case 'report':
        return policyCompliance.report();
      case 'help':
      default:
        return this._helpText();
    }
  }

  /**
   * Route !compliance sub-commands.
   * @param {string}   subCommand
   * @param {string[]} args
   * @param {object}   msg
   * @returns {Promise<string>}
   */
  async handleCompliance(subCommand, args, msg) {
    switch ((subCommand || '').toLowerCase()) {
      case 'audit':
        return policyCompliance.auditLog(parseInt(args[0]) || 20);
      case 'stats':
        return this._statsText();
      case 'campaign':
        return this._campaignGuide();
      default:
        return this._complianceHelp();
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Sub-handlers
  // ─────────────────────────────────────────────────────────────────

  _checkStatus(phone, msg) {
    const target = phone || msg?.from;
    if (!target) return '❌ Usage: !policy check <phone>';

    const status = policyCompliance.getStatus(target);
    const icon   = status === 'opted_in'  ? '✅' :
                   status === 'opted_out' ? '🛑' : '❓';
    return `${icon} *${target}*\nCompliance status: \`${status}\``;
  }

  async _recordOptIn(phone, msg) {
    const target = phone || msg?.from;
    if (!target) return '❌ Usage: !policy optin <phone>';

    await policyCompliance.recordOptIn(target, `manual_command:${msg?.from || 'terminal'}`);
    log.info(`Manual opt-in recorded for ${target} by ${msg?.from}`);
    return `✅ Opt-in recorded for *${target}*`;
  }

  async _recordOptOut(phone, msg) {
    const target = phone || msg?.from;
    if (!target) return '❌ Usage: !policy optout <phone>';

    await policyCompliance.recordOptOut(target, `manual_command:${msg?.from || 'terminal'}`);
    log.warn(`Manual opt-out recorded for ${target} by ${msg?.from}`);
    return `🛑 Opt-out recorded for *${target}*. No further messages will be sent.`;
  }

  _statsText() {
    const s = policyCompliance.stats();
    return [
      '📊 *Compliance Stats*',
      `━━━━━━━━━━━━━━━━━━━━`,
      `Contacts tracked : ${s.totalTracked}`,
      `Messages allowed : ${s.allowed}`,
      `Messages blocked : ${s.blocked}`,
      `Opt-ins          : ${s.optIns}`,
      `Opt-outs         : ${s.optOuts}`,
      `Audit entries    : ${s.auditEntries}`,
    ].join('\n');
  }

  _campaignGuide() {
    return [
      '📋 *Campaign Pre-Flight Checklist*',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Before running any bulk campaign:`,
      `  1. Verify every contact has explicit opt-in`,
      `  2. Run !compliance audit to review recent opt-outs`,
      `  3. Remove opted-out contacts from your list`,
      `  4. Include opt-out instructions in your message`,
      `  5. Respect rate limits (60 msgs/min, 200/hr)`,
      `  6. Do NOT send unsolicited promotional content`,
      ``,
      `Use !policy report for a full status breakdown.`,
    ].join('\n');
  }

  _helpText() {
    return [
      '🛡️  *Policy Commands*',
      `━━━━━━━━━━━━━━━━━━━`,
      `!policy check <phone>   — Check opt-in/out status`,
      `!policy optin <phone>   — Record opt-in`,
      `!policy optout <phone>  — Record opt-out`,
      `!policy report          — Full compliance report`,
      `!compliance audit [n]   — Last N audit entries`,
      `!compliance stats       — Quick stats`,
      `!compliance campaign    — Campaign checklist`,
    ].join('\n');
  }

  _complianceHelp() {
    return [
      '📋 *Compliance Commands*',
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `!compliance audit [n]   — Show last N audit log entries`,
      `!compliance stats       — Compliance statistics`,
      `!compliance campaign    — Campaign pre-flight guide`,
      ``,
      `See also: !policy help`,
    ].join('\n');
  }
}

export default PolicyCommands;
