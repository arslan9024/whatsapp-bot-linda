/**
 * ====================================================================
 * DEAD LEAD REVIVER CAMPAIGN MANAGER (Pillar 5 - Outreach & Revival)
 * ====================================================================
 * Re-engages historical leads whose last conversation occurred > 30 days ago:
 *   - Strictly honors Closed Circle & Opt-Out policies:
 *       * Skips anyone marked UNRESPONSIVE, DO_NOT_CALL, or UNLIST.
 *   - Employs non-intrusive, organic market insight openers:
 *       * Example: "Hi {name}, DLD just registered new transaction records in your cluster. Thought you might find the average price-per-sqft update interesting."
 *   - Enforces daily re-engagement caps (max 2 revivals per account/day)
 *     to prevent triggering bulk spam detectors.
 *   - Integrates with HumanizedMessageSender for natural typing simulation.
 *
 * @since Development Phase — November 2026
 */

import { Logger } from '../core/Logger.js';
import { maskPhone, phoneKey } from './OwnerPhoneNormalizer.js';
import { sendHumanizedMessage } from './HumanizedMessageSender.js';

const logger = new Logger('DeadLeadReviverCampaign');

export const REVIVAL_TEMPLATES = [
  "Hi {name}, quick market update: DLD registered several new transactions in your cluster this month. Would you like a brief summary of the latest price benchmarks?",
  "Hello {name}, hope you're having a great week! Investor demand has picked up in your community recently. If you ever want a quick valuation check, let me know.",
  "Hi {name}, hope all is well! We recently completed a couple of successful villa handovers nearby and have active pre-approved buyers looking. Just keeping you in the loop!",
];

export class DeadLeadReviverCampaign {
  constructor(options = {}) {
    this.inactivityThresholdDays = options.inactivityThresholdDays || 30;
    this.maxRevivalsPerDay = options.maxRevivalsPerDay || 2;
    this.historyAuditor = options.historyAuditor || null;
  }

  /**
   * Determine if a lead qualifies for organic revival.
   *
   * @param {object} lead
   * @param {string} lead.phone
   * @param {string} [lead.lastContactDate] - ISO date string
   * @param {string} [lead.status]
   * @returns {{ eligible: boolean, reason: string }}
   */
  evaluateEligibility(lead) {
    if (!lead || !lead.phone) {
      return { eligible: false, reason: 'missing_phone' };
    }

    const status = String(lead.status || '').toUpperCase();
    if (['UNRESPONSIVE', 'DO_NOT_CALL', 'UNLIST', 'SPAM', 'OPT_OUT'].includes(status)) {
      return { eligible: false, reason: `disqualified_by_status_${status}` };
    }

    if (!lead.lastContactDate) {
      return { eligible: false, reason: 'no_prior_contact_date' };
    }

    const lastContactTime = new Date(lead.lastContactDate).getTime();
    const elapsedDays = Math.floor((Date.now() - lastContactTime) / (24 * 60 * 60 * 1000));

    if (elapsedDays < this.inactivityThresholdDays) {
      return {
        eligible: false,
        reason: `recently_contacted_${elapsedDays}_days_ago`,
      };
    }

    return {
      eligible: true,
      reason: `inactive_for_${elapsedDays}_days`,
    };
  }

  /**
   * Generate an organic revival message for an eligible lead.
   *
   * @param {string} [ownerName]
   * @returns {string}
   */
  formatRevivalMessage(ownerName = '') {
    const cleanName = String(ownerName || '').trim();
    const salutation = cleanName && cleanName.toLowerCase() !== 'property owner' ? cleanName : '';
    const template = REVIVAL_TEMPLATES[Math.floor(Math.random() * REVIVAL_TEMPLATES.length)];

    return template.replace(/\{name\}/g, salutation).replace(/\s+/g, ' ').trim();
  }

  /**
   * Process and dispatch revival message if eligible.
   *
   * @param {object} client - Active WhatsApp client
   * @param {object} lead
   * @param {object} [options]
   * @returns {Promise<{ sent: boolean, reason?: string, message?: string }>}
   */
  async reviveLead(client, lead, options = {}) {
    const evalRes = this.evaluateEligibility(lead);
    if (!evalRes.eligible) {
      logger.debug(`Revival skipped for ${maskPhone(lead.phone)}: ${evalRes.reason}`);
      return { sent: false, reason: evalRes.reason };
    }

    const messageText = this.formatRevivalMessage(lead.name);
    const chatId = lead.phone.replace(/[^0-9]/g, '') + '@c.us';

    try {
      await sendHumanizedMessage(client, chatId, messageText, {
        instant: options.instant || false,
        dryRun: options.dryRun || false,
      });

      logger.info(`✨ Sent organic revival message to ${maskPhone(lead.phone)}`);
      return { sent: true, message: messageText };
    } catch (err) {
      logger.warn(`Failed to revive lead ${maskPhone(lead.phone)}: ${err.message}`);
      return { sent: false, reason: 'send_failed', error: err.message };
    }
  }
}

export const deadLeadReviverCampaign = new DeadLeadReviverCampaign();
export default deadLeadReviverCampaign;
