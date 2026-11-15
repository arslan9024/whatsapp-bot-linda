// @ts-nocheck
import { appendReraDisclaimer } from '../utils/reraDisclaimer.js';
import { computeHumanTypingDelayMs } from '../utils/humanPacing.js';

export async function sendMessageWithReport(validatedContact, WhatsAppBotClient, message) {
  let result = {};
  let SendReport;
  const safeMessage = typeof message === 'string' ? appendReraDisclaimer(message) : message;
  const delayMs = typeof safeMessage === 'string' ? Math.min(computeHumanTypingDelayMs(safeMessage.length), 1500) : 0;
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

  try {
    SendReport = await WhatsAppBotClient.sendMessage(validatedContact, safeMessage);
  } catch (error) {
    console.log(error);
  }

  return (result = {
    from: WhatsAppBotClient.authStrategy.clientId,
    to: validatedContact,
    SendReport,
  });
}
