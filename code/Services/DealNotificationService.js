/**
 * Deal Notification Service
 * Sends notifications to relevant parties when deal events occur
 * Multi-persona notifications: buyer, seller, agent, tenant, landlord
 */

import { logger } from '../Integration/Google/utils/logger.js';

class DealNotificationService {
  constructor(config = {}) {
    this.whatsappClient = config.whatsappClient;  // WhatsApp client for sending messages
  }

  /**
   * Notify buyer that properties match was found
   */
  async notifyBuyerMatchFound(buyerPhone, matches) {
    try {
      if (!matches || matches.length === 0) return;

      let message = `🏠 Great news! Found ${matches.length} properties matching your preferences!\n\n`;
      
      matches.slice(0, 3).forEach((match, idx) => {
        const prop = match.property;
        message += `${idx + 1}. ${prop.type} in ${prop.location}\n` +
                  `   ${prop.bedrooms}BR | ${prop.sale.price} AED (${(match.score * 100).toFixed(0)}% match)\n\n`;
      });

      message += `Reply with property number to view details or schedule viewing!`;

      await this._sendWhatsAppMessage(buyerPhone, message);
      logger.info(`✅ Notification sent to buyer: ${buyerPhone}`);

    } catch (error) {
      logger.error(`❌ Error notifying buyer: ${error.message}`);
    }
  }

  /**
   * Notify buyer that offer was received by seller
   */
  async notifyBuyerOfferReceived(buyerPhone, propertyId, offeredPrice) {
    try {
      const message = `✅ Your offer of ${offeredPrice} AED for property ${propertyId} has been received!\n\n` +
                     `⏳ Waiting for seller response...`;

      await this._sendWhatsAppMessage(buyerPhone, message);
      logger.info(`✅ Notification sent: Offer received for ${buyerPhone}`);

    } catch (error) {
      logger.error(`❌ Error notifying buyer: ${error.message}`);
    }
  }

  /**
   * Notify tenant of matching apartments
   */
  async notifyTenantMatchFound(tenantPhone, matches) {
    try {
      if (!matches || matches.length === 0) return;

      let message = `🏠 Found ${matches.length} apartments matching your needs!\n\n`;
      
      matches.slice(0, 3).forEach((match, idx) => {
        const prop = match.property;
        message += `${idx + 1}. ${prop.bedroom}BR in ${prop.location}\n` +
                  `   ${prop.lease.monthlyRent} AED/month | Available ${prop.lease.availableFrom}\n` +
                  `   (${(match.score * 100).toFixed(0)}% match)\n\n`;
      });

      message += `Reply with number (1-${Math.min(3, matches.length)}) to view details!`;

      await this._sendWhatsAppMessage(tenantPhone, message);
      logger.info(`✅ Notification sent to tenant: ${tenantPhone}`);

    } catch (error) {
      logger.error(`❌ Error notifying tenant: ${error.message}`);
    }
  }

  /**
   * Notify seller of new inquiry
   */
  async notifySellerNewInquiry(sellerPhone, buyerName, propertyId, budget) {
    try {
      const message = `👤 New Inquiry!\n\n` +
                     `Buyer: ${buyerName}\n` +
                     `Property: ${propertyId}\n` +
                     `Budget: ${budget} AED\n\n` +
                     `🔗 Reply to schedule viewing or send property details!`;

      await this._sendWhatsAppMessage(sellerPhone, message);
      logger.info(`✅ Notification sent to seller: ${sellerPhone}`);

    } catch (error) {
      logger.error(`❌ Error notifying seller: ${error.message}`);
    }
  }

  /**
   * Notify agent of new inquiry
   */
  async notifyAgentNewInquiry(agentPhone, dealId, propertyId, clientName, matchScore) {
    try {
      const message = `📌 New Inquiry Created!\n\n` +
                     `Deal ID: ${dealId}\n` +
                     `Property: ${propertyId}\n` +
                     `Client: ${clientName}\n` +
                     `Match Score: ${(matchScore * 100).toFixed(0)}%\n\n` +
                     `!view-deal ${dealId}`;

      await this._sendWhatsAppMessage(agentPhone, message);
      logger.info(`✅ Notification sent to agent: ${agentPhone}`);

    } catch (error) {
      logger.error(`❌ Error notifying agent: ${error.message}`);
    }
  }

  /**
   * Notify agent of new offer
   */
  async notifyAgentNewOffer(agentPhone, dealId, offeredPrice, originalPrice) {
    try {
      const difference = originalPrice - offeredPrice;
      const percent = ((difference / originalPrice) * 100).toFixed(1);

      const message = `💰 New Offer!\n\n` +
                     `Deal: ${dealId}\n` +
                     `Offer: ${offeredPrice} AED\n` +
                     `Original: ${originalPrice} AED\n` +
                     `Difference: -${difference} AED (-${percent}%)\n\n` +
                     `Action: !accept-offer ${dealId} or !counter-offer ${dealId} ${offeredPrice}`;

      await this._sendWhatsAppMessage(agentPhone, message);
      logger.info(`✅ Notification sent to agent: New offer for ${dealId}`);

    } catch (error) {
      logger.error(`❌ Error notifying agent: ${error.message}`);
    }
  }

  /**
   * Notify all parties of deal closure
   */
  async notifyDealClosed(deal, dealDetails = {}) {
    try {
      // Notify buyer
      if (dealDetails.buyerPhone) {
        const buyerMsg = `🎉 Congratulations!\n\n` +
                        `Your property purchase is complete!\n` +
                        `Property: ${dealDetails.propertyAddress}\n` +
                        `Final Price: ${deal.financial.finalPrice} AED\n\n` +
                        `Thank you for using Linda! 🙏`;

        await this._sendWhatsAppMessage(dealDetails.buyerPhone, buyerMsg);
      }

      // Notify seller
      if (dealDetails.sellerPhone) {
        const sellerMsg = `🎉 Deal Closed!\n\n` +
                         `Property has been sold!\n` +
                         `Buyer: ${dealDetails.buyerName}\n` +
                         `Final Price: ${deal.financial.finalPrice} AED\n\n` +
                         `Commission will be processed shortly.`;

        await this._sendWhatsAppMessage(dealDetails.sellerPhone, sellerMsg);
      }

      // Notify agent -Commission
      if (dealDetails.agentPhone) {
        const commission = deal.financial.agentCommission || 0;
        const agentMsg = `✅ Deal Closed!\n\n` +
                        `Deal ID: ${deal.id}\n` +
                        `Property Sold: ${dealDetails.propertyAddress}\n` +
                        `Sale Price: ${deal.financial.finalPrice} AED\n` +
                        `Your Commission: ${commission} AED (${deal.financial.agentCommissionPercent}%)\n\n` +
                        `Status: Agreed (Pending Payment)`;

        await this._sendWhatsAppMessage(dealDetails.agentPhone, agentMsg);
      }

      logger.info(`✅ Closure notifications sent for deal: ${deal.id}`);

    } catch (error) {
      logger.error(`❌ Error sending closure notifications: ${error.message}`);
    }
  }

  /**
   * Notify agent of commission payment
   */
  async notifyAgentCommissionPaid(agentPhone, dealId, amount) {
    try {
      const message = `💳 Commission Payment!\n\n` +
                     `Amount: ${amount} AED\n` +
                     `Deal: ${dealId}\n` +
                     `Status: ✅ PAID\n\n` +
                     `Thank you for closing this deal! 🎯`;

      await this._sendWhatsAppMessage(agentPhone, message);
      logger.info(`✅ Commission payment notification sent to agent: ${agentPhone}`);

    } catch (error) {
      logger.error(`❌ Error notifying agent: ${error.message}`);
    }
  }

  /**
   * Send WhatsApp message
   * @private
   */
  async _sendWhatsAppMessage(phoneNumber, message) {
    try {
      if (this.whatsappClient) {
        const chat = await this.whatsappClient.getChatById(phoneNumber);
        if (chat) {
          await chat.sendMessage(message);
          return true;
        }
      }
      logger.warn(`⚠️ Could not send message to ${phoneNumber}: client not available`);
      return false;

    } catch (error) {
      logger.error(`❌ Error sending WhatsApp message: ${error.message}`);
      return false;
    }
  }
}

export default DealNotificationService;
