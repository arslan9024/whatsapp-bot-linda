import path from 'node:path';
import mongoose from 'mongoose';
import whatsapp from 'whatsapp-web.js';
import CampaignWorkspace, {
  personalize,
  sendingDelay,
} from '../Services/CampaignWorkspace.js';
import ContactConsentService from '../Services/ContactConsentService.js';
import { campaignService } from '../Services/CampaignService.js';
import { campaignRateLimiter } from '../Services/CampaignRateLimiter.js';
import TerminalCampaignMenu from './TerminalCampaignMenu.js';

export function createTerminalCampaigns({
  accountClients,
  connectionManagers,
  accountConfigManager,
  googleSheetsManager,
  logBot,
}) {
  const accounts = () => {
    const configured = accountConfigManager?.getAllAccounts() || [];
    return [...accountClients.keys()].map(phone => ({
      phone,
      name:
        configured.find(account => account.phoneNumber === phone)
          ?.displayName || phone,
      active: connectionManagers.get(phone)?.state === 'CONNECTED',
    }));
  };
  const workspace = new CampaignWorkspace({
    directory: path.resolve('data', 'campaign-workspace'),
    accounts,
    log: message => logBot(message, 'error'),
    checkRecipient: async (campaign, contact) => {
      if (mongoose.connection.readyState !== 1) {
        return {
          allowed: false,
          pause: true,
          reason:
            'MongoDB is unavailable. Cannot check opt-outs or existing send limits.',
        };
      }
      const client = accountClients.get(campaign.accountPhone);
      if (!client || (await client.getState()) !== 'CONNECTED') {
        return {
          allowed: false,
          pause: true,
          reason:
            'Sending account is offline. Restore it in the terminal, then resume.',
        };
      }
      if (
        contact.optedOut ||
        (await ContactConsentService.getConsent(contact.phone))?.status ===
          'revoked'
      ) {
        return { allowed: false, reason: 'Recipient opted out.' };
      }
      const limit = await campaignRateLimiter.canSendMessage(
        campaign.id,
        campaign.accountPhone,
        10,
      );
      const messageCount = campaign.attachments.length
        ? campaign.attachments.length +
          (personalize(campaign.template, contact).length > 1024 ? 1 : 0)
        : 1;
      const remaining = Math.min(
        limit.campaignRemaining ?? Infinity,
        limit.accountRemaining ?? Infinity,
      );
      if (limit.allowed && remaining < messageCount) {
        return {
          allowed: false,
          pause: true,
          reason: `Recipient needs ${messageCount} messages, but only ${remaining} remain in the daily limits.`,
        };
      }
      return {
        allowed: limit.allowed,
        pause: !limit.allowed,
        reason: limit.reason,
      };
    },
    sendRecipient: async (campaign, contact, text, attachments) => {
      const client = accountClients.get(campaign.accountPhone);
      const messages = [];
      if (!attachments.length || text.length > 1024) {
        messages.push({ content: text });
      }
      attachments.forEach((file, index) =>
        messages.push({
          content: new whatsapp.MessageMedia(file.mime, file.data, file.name),
          options: {
            caption: index === 0 && text.length <= 1024 ? text : undefined,
            sendMediaAsDocument:
              !file.mime.startsWith('image/') &&
              !file.mime.startsWith('video/'),
          },
        }),
      );
      let attemptedDelivery = false;
      try {
        for (const [index, message] of messages.entries()) {
          if (index > 0) {
            await new Promise(resolve =>
              setTimeout(resolve, sendingDelay(campaign)),
            );
          }
          const limit = await campaignRateLimiter.canSendMessage(
            campaign.id,
            campaign.accountPhone,
            10,
          );
          if (!limit.allowed) {
            throw new Error(limit.reason || 'Sending limit reached.');
          }
          const reservation = await campaignService.reserveCampaignMessage(
            campaign.id,
            contact.phone,
            contact.name,
            text,
            campaign.accountPhone,
            index === 0 ? '' : `part-${index + 1}`,
          );
          if (!reservation.success) {
            throw new Error(reservation.error || 'Could not reserve message.');
          }
          if (reservation.duplicate) {
            if (index > 0) {
              throw new Error(
                'Existing attachment reservation. Partial delivery must be reviewed manually.',
              );
            }
            return {
              skipped: true,
              deliveryUnknown: true,
              reason:
                'Existing send reservation. Review history before a follow-up.',
            };
          }
          try {
            attemptedDelivery = true;
            const result = await client.sendMessage(
              `${contact.phone}@c.us`,
              message.content,
              message.options,
            );
            if (!result?.id) {
              throw new Error(
                'WhatsApp did not acknowledge the message. Review delivery manually.',
              );
            }
          } catch (error) {
            error.deliveryUnknown = true;
            campaignRateLimiter.recordOutcome(campaign.accountPhone, false);
            await campaignService.failReservedCampaignMessage(
              reservation.log.messageId,
              error.message,
            );
            throw error;
          }
          const recorded =
            await campaignService.completeReservedCampaignMessage(
              reservation.log.messageId,
            );
          if (!recorded.success) {
            const error = new Error(
              'Sent, but delivery log update failed. Do not resend without checking WhatsApp.',
            );
            error.deliveryUnknown = true;
            throw error;
          }
          campaignRateLimiter.recordOutcome(campaign.accountPhone, true);
        }
      } catch (error) {
        if (attemptedDelivery) {
          error.deliveryUnknown = true;
        }
        throw error;
      }
      return { skipped: false };
    },
  });
  workspace.initialize();
  return new TerminalCampaignMenu({
    workspace,
    readSheet: async (id, range) => {
      if (!googleSheetsManager?.sheetsAPI) {
        throw new Error(
          'Google Sheets is not initialized. Configure the existing Google service account first.',
        );
      }
      return googleSheetsManager.readSheet(id, range);
    },
  });
}
