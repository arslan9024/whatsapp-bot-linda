/**
 * ====================================================================
 * MASTER DEVICE ADDER (Inbound Closed Circle Expansion)
 * ====================================================================
 * Enables authorized master WhatsApp accounts to add new numbers to
 * the closed circle master list directly via WhatsApp messages.
 *
 * Supported command formats from authorized masters:
 *   - "add master +971505110636 [DisplayName]"
 *   - "add device +971505110636 [DisplayName]"
 *   - "add +971505110636 [DisplayName]"
 *   - "link master +971505110636 [DisplayName]"
 *   - "Hi Linda, please add device +971505110636 [DisplayName]"
 *
 * @since Development Phase — October 2026
 */

import services from '../core/ServiceRegistry.js';
import { normalizeDigits, extractPhonesFromText } from './InboundLinkingHelpers.js';
import { formatDeviceAddedConfirmation } from './InboundLinkingTemplates.js';

/**
 * Handle an authorized master requesting to add another device to the closed circle.
 *
 * @param {object} params
 * @param {object} params.msg - Incoming message
 * @param {string} params.senderPhone - Phone number of message sender
 * @param {object} params.accountConfig - Account config of sender
 * @param {object} params.acm - AccountConfigManager
 * @param {object} params.primaryClient - Primary client
 * @param {Function} params.sendWhatsAppMessage - Delivery function
 * @param {Function} params.logBot - Logger
 * @returns {Promise<boolean>} True if handled as a master device addition
 */
export async function handleMasterAddDeviceRequest({
  msg,
  senderPhone,
  accountConfig,
  acm,
  primaryClient,
  sendWhatsAppMessage,
  logBot,
}) {
  const isMaster = Boolean(accountConfig && ['primary', 'master'].includes(accountConfig.role));
  if (!isMaster) {
    return false;
  }

  const senderDigits = normalizeDigits(senderPhone);
  const extractedPhones = extractPhonesFromText(msg.body || '');
  const otherPhones = extractedPhones.filter(p => normalizeDigits(p) !== senderDigits);

  if (otherPhones.length === 0) {
    return false;
  }

  const targetPhone = otherPhones[0];
  const targetDigits = normalizeDigits(targetPhone);

  // Extract optional display name after the phone number
  let displayName = '';
  const bodyText = (msg.body || '').trim();
  const phoneIndex = bodyText.indexOf(targetPhone);
  if (phoneIndex !== -1) {
    displayName = bodyText.substring(phoneIndex + targetPhone.length).trim();
  }
  displayName = displayName || `Master - ${targetPhone}`;

  // Check if target is already in configuration
  const existing = acm.getAccountByPhone(targetPhone) ||
    acm.getAllAccounts?.().find(acc => normalizeDigits(acc.phoneNumber) === targetDigits);

  if (!existing) {
    logBot(`Master ${senderPhone} adding new device to closed circle: ${targetPhone} (${displayName})`, 'info');
    const addResult = await acm.addMasterAccount(targetPhone, displayName);
    if (!addResult.success && !addResult.error?.includes('already in use')) {
      logBot(`❌ Failed to add master account ${targetPhone}: ${addResult.error}`, 'error');
      await sendWhatsAppMessage(senderPhone, `❌ Failed to add ${targetPhone}: ${addResult.error}`, primaryClient, msg);
      return true;
    }

    services.get('closedCircleGuard')?.invalidateCache?.();
    logBot(`✅ Added ${targetPhone} (${displayName}) to closed circle master list`, 'success');
  } else {
    logBot(`ℹ️ ${targetPhone} already configured in master list (${existing.displayName || existing.name})`, 'info');
  }

  await sendWhatsAppMessage(
    senderPhone,
    formatDeviceAddedConfirmation(targetPhone, displayName),
    primaryClient,
    msg
  );
  return true;
}

export default handleMasterAddDeviceRequest;

