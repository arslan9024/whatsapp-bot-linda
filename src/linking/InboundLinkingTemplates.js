/**
 * ====================================================================
 * INBOUND LINKING TEMPLATES & PROMISES
 * ====================================================================
 * User-facing messages and async helpers for WhatsApp self-service
 * device linking flows.
 *
 * Operating Lane: Architecture & Reliability / WhatsApp Client & Protocols
 *
 * @since Phase 32 — February 2026
 */

/**
 * Format message when a WhatsApp privacy ID (LID) is detected without phone mapping.
 */
export function formatPrivacyIdDetectedPrompt(lidDigits) {
  return (
    `🔒 *WhatsApp Privacy ID Detected*\n\n` +
    `Linda received your message via WhatsApp Privacy Addressing (ID: +${lidDigits}).\n\n` +
    `To link your device, please reply with your registered phone number, for example:\n` +
    `👉 *"Hi Linda, please add my device 0589969886"*\n\n` +
    `💡 *If this phone is not registered in the closed circle yet:*\n` +
    `From any authorized master phone, send Linda:\n` +
    `👉 \`add master <phone> [Name]\``
  );
}

/**
 * Format message for unauthorized sender.
 */
export function formatUnauthorizedMessage(senderPhone) {
  return (
    `🔒 *Unauthorized Device Request — Closed Circle*\n\n` +
    `Your phone number (${senderPhone}) is not registered in Linda's closed circle master list.\n\n` +
    `💡 *To add this device to the closed circle by message:*\n` +
    `From any authorized master phone, send Linda:\n` +
    `👉 \`add master ${senderPhone} [Name]\`\n` +
    `or\n` +
    `👉 \`add device ${senderPhone} [Name]\`\n\n` +
    `Once added, reply *"Hi Linda, add my device"* from this phone to link!`
  );
}

/**
 * Format confirmation message when an authorized master adds a device.
 */
export function formatDeviceAddedConfirmation(targetPhone, displayName) {
  const nameSuffix = displayName ? ` (${displayName})` : '';
  return (
    `✅ *Device Added to Closed Circle Master List!*\n\n` +
    `Phone: *${targetPhone}*${nameSuffix}\n` +
    `Role: Master Account (Authorized Closed Circle)\n\n` +
    `📲 *Next step to connect:*\n` +
    `From *${targetPhone}*, send Linda:\n` +
    `👉 *"Hi Linda, add my device"*\n\n` +
    `Linda will immediately generate and send your 8-character pairing code!`
  );
}

/**
 * Format message when primary master tries to link itself.
 */
export function formatPrimaryMasterSelfMessage(primaryMasterPhone) {
  return `ℹ️ Primary master (${primaryMasterPhone}) is already online as Linda's active host.`;
}

/**
 * Format message when device is already connected.
 */
export function formatAlreadyConnectedMessage(senderPhone) {
  return (
    `✅ *Device Already Connected*\n\n` +
    `Your device (${senderPhone}) is already online, linked, and active on Linda AI Assistant!`
  );
}

/**
 * Format message when a pairing request is already active.
 */
export function formatPairingInProgressMessage(senderPhone) {
  return (
    `⏳ *Pairing in Progress*\n\n` +
    `A pairing code request is already active for your device (${senderPhone}).\n` +
    `Please check previous messages for your code or wait a minute before retrying.`
  );
}

/**
 * Format immediate acknowledgement message.
 */
export function formatInitiatingLinkingMessage(senderPhone) {
  return (
    `⏳ *Initiating Device Linking*\n\n` +
    `Hello! Processing request to link your device (*${senderPhone}*)...\n` +
    `Starting WhatsApp pairing session. Your 8-character pairing code will arrive in a few seconds!`
  );
}

/**
 * Format pairing code message with instructions.
 */
export function formatPairingCodeInstructions(senderPhone, code) {
  return (
    `📲 *WhatsApp Pairing Code for ${senderPhone}:*\n\n` +
    `🔑 *${code}*\n\n` +
    `*Follow these steps on your phone:* \n` +
    `1️⃣ Open *WhatsApp* on this phone (${senderPhone})\n` +
    `2️⃣ Tap *Settings* (iPhone) or *⋮ Menu* (Android)\n` +
    `3️⃣ Tap *Linked Devices*\n` +
    `4️⃣ Tap *Link a device*\n` +
    `5️⃣ Tap *Link with phone number instead*\n` +
    `6️⃣ Enter the 8-character code: *${code}*\n\n` +
    `⏱️ _This code will expire in 2-3 minutes. Enter it now!_`
  );
}

/**
 * Format celebration confirmation message once linked.
 */
export function formatDeviceLinkedSuccess(senderPhone) {
  return (
    `🎉 *Device Successfully Linked!*\n\n` +
    `Your phone (*${senderPhone}*) is now connected and operational as a master account on Linda AI Assistant.\n\n` +
    `✅ Session: Saved & Protected\n` +
    `🚀 Status: Online & Active\n\n` +
    `✨ Thank you!`
  );
}

/**
 * Format error message.
 */
export function formatLinkingErrorMessage(errorMessage) {
  return (
    `⚠️ *Linking Request Encountered an Issue*\n\n` +
    `${errorMessage}\n\n` +
    `Please send *"add my device"* again when you are ready to retry.`
  );
}

/**
 * Await pairing code emission or failure from a new WhatsApp client.
 *
 * @param {object} newClient
 * @param {number} timeoutMs
 * @returns {Promise<string>}
 */
export function awaitPairingCode(newClient, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Pairing code timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
      }
    }, timeoutMs);

    newClient.once('code', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(code);
      }
    });

    newClient.once('auth_failure', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(new Error(`Authentication failure: ${err?.message || err}`));
      }
    });
  });
}

