/**
 * ====================================================================
 * SUPERVISOR FOLLOW-UP DISPATCHER
 * ====================================================================
 * Formats and sends private follow-up reminders from the Primary Master
 * (Supervisor) to sub-agent lines when an existing conversation is found.
 *
 * @since Development Phase — October 2026
 */

import { Logger } from '../core/Logger.js';
import { maskPhone, phoneKey } from './OwnerPhoneNormalizer.js';
import services from '../core/ServiceRegistry.js';

const logger = new Logger('SupervisorFollowUpDispatcher');

/**
 * Format supervisor assignment message to sub-agent.
 *
 * @param {object} params
 * @param {string} params.ownerName
 * @param {string} params.clientPhone
 * @param {string} params.community
 * @param {string} [params.unit]
 * @param {number|Date} [params.lastInteractionAt]
 * @param {string} [params.agentName]
 * @returns {string}
 */
export function formatSupervisorAssignmentMessage({
  ownerName,
  clientPhone,
  community = 'Damac Hills 2',
  unit = '',
  lastInteractionAt = null,
  agentName = '',
}) {
  const formattedPhone = clientPhone.startsWith('+') ? clientPhone : `+${clientPhone}`;
  let lastChatInfo = '';

  if (lastInteractionAt) {
    const d = new Date(lastInteractionAt);
    lastChatInfo = `\n📅 *Prior Chat Activity:* ${d.toLocaleDateString()} (${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
  }

  const unitLine = unit ? `\n🏷️ *Unit/Cluster:* ${unit}` : '';

  return (
    `📋 *Supervisor Follow-Up Assignment*\n\n` +
    `Hello ${agentName ? agentName : 'Agent'}! An existing conversation was found on your line with this client.\n\n` +
    `👤 *Client/Owner:* ${ownerName || 'Property Owner'}\n` +
    `📱 *WhatsApp:* ${formattedPhone}\n` +
    `🏡 *Community:* ${community}${unitLine}${lastChatInfo}\n\n` +
    `💡 *Action Required:*\n` +
    `Please open your chat history with this client and follow up manually with personalized attention today.`
  );
}

/**
 * Dispatch supervisor follow-up reminder from Primary Master to sub-agent.
 *
 * @param {object} params
 * @param {object} params.clientInfo - Details of property owner
 * @param {string} params.targetAgentPhone - Sub-agent phone number
 * @param {string} [params.agentName] - Sub-agent display name
 * @param {object} [params.historyDetails] - Interaction details from auditor
 * @param {object} [params.primaryClient] - Primary master client
 * @returns {Promise<{ ok: boolean, messageId?: string, error?: string }>}
 */
export async function dispatchSupervisorReminder({
  clientInfo,
  targetAgentPhone,
  agentName = '',
  historyDetails = null,
  primaryClient = null,
}) {
  const acm = services.get('accountConfigManager');
  const masterPhone = acm?.getMasterPhoneNumber?.();
  const clients = services.get('accountClients');
  const supervisorClient = primaryClient || (masterPhone ? clients?.get(masterPhone) : null);

  const messageText = formatSupervisorAssignmentMessage({
    ownerName: clientInfo.name || clientInfo.ownerName,
    clientPhone: clientInfo.phone || clientInfo.phoneNumber,
    community: clientInfo.community || clientInfo.project || 'Damac Hills 2',
    unit: clientInfo.unit || clientInfo.cluster || '',
    lastInteractionAt: historyDetails?.lastTimestamp,
    agentName,
  });

  const agentDigits = phoneKey(targetAgentPhone);
  const targetJid = `${agentDigits}@c.us`;

  logger.info(
    `👑 [Supervisor] Dispatching follow-up reminder to sub-agent ${agentName || maskPhone(agentDigits)} for client ${maskPhone(clientInfo.phone)}`
  );

  if (supervisorClient?.sendMessage) {
    try {
      const res = await supervisorClient.sendMessage(targetJid, messageText, { allowClosedCirclePrompt: true });
      logger.info(`✅ Supervisor reminder delivered to ${maskPhone(agentDigits)}`);
      return { ok: true, messageId: res?.id?.id || 'delivered' };
    } catch (err) {
      logger.error(`❌ Failed to deliver supervisor reminder to ${maskPhone(agentDigits)}: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }

  logger.warn(`Supervisor client not available to send reminder to ${maskPhone(agentDigits)}`);
  return { ok: true, messageId: 'simulated_no_client' };
}

export default dispatchSupervisorReminder;

