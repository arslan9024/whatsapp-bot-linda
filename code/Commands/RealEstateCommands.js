/**
 * Real Estate Commands
 * Commands for buyers, sellers, tenants, landlords, and agents
 * 
 * Personas:
 * - Buyer: search properties, make offers, schedule viewings
 * - Seller: list properties, view inquiries
 * - Tenant: search rentals, apply for lease
 * - Landlord: list properties for lease, manage tenants
 * - Agent: manage deals, track commissions
 */

import { logger } from '../Integration/Google/utils/logger.js';

class RealEstateCommands {
  constructor(config = {}) {
    this.personaEngine = config.personaDetectionEngine;
    this.propertyEngine = config.propertyEngine;
    this.clientEngine = config.clientEngine;
    this.dealMatchingEngine = config.dealMatchingEngine;
    this.dealLifecycleManager = config.dealLifecycleManager;
    this.agentDealManager = config.agentDealManager;
  }

  /**
   * !i-am-buyer command
   * Register user as buyer
   */
  async handleBuyerRegistration(msg, args = []) {
    try {
      const phoneNumber = msg.from;
      
      // Parse args: !i-am-buyer [minBudget] [maxBudget] [location] [bedrooms]
      const minBudget = parseInt(args[0]) || 500000;
      const maxBudget = parseInt(args[1]) || 2000000;
      const location = args[2] || 'Dubai';
      const bedrooms = parseInt(args[3]) || 3;

      // Create buyer client
      const buyer = await this.clientEngine.addBuyer(phoneNumber, {
        name: msg.contact?.name || 'Buyer',
        minBudget: minBudget,
        maxBudget: maxBudget,
        preferredLocations: [location],
        bedrooms: { min: 2, preferred: bedrooms },
        currency: 'AED'
      });

      if (!buyer) {
        return `❌ Failed to register as buyer. Try again.`;
      }

      // Set persona
      await this.personaEngine.setPersonaRole(phoneNumber, 'buyer', {
        name: buyer.name,
        budget: maxBudget
      });

      return `✅ Welcome, Buyer! 🏠\n\nYour preferences:\n` +
             `Budget: ${minBudget} - ${maxBudget} AED\n` +
             `Location: ${location}\n` +
             `Bedrooms: ${bedrooms}\n\n` +
             `Use: !find-properties to search or describe what you're looking for!`;

    } catch (error) {
      logger.error(`❌ Error in buyer registration: ${error.message}`);
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * !i-am-seller command
   * Register user as seller
   */
  async handleSellerRegistration(msg, args = []) {
    try {
      const phoneNumber = msg.from;

      // Set persona
      await this.personaEngine.setPersonaRole(phoneNumber, 'seller', {
        name: msg.contact?.name || 'Seller'
      });

      return `✅ Welcome, Property Seller! 🏡\n\n` +
             `Use: !list-property to add your property for sale\n` +
             `Format: !list-property villa Dubai-Hills 3 2500000\n` +
             `(type location bedrooms price)`;

    } catch (error) {
      logger.error(`❌ Error in seller registration: ${error.message}`);
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * !i-am-tenant command
   * Register user as tenant
   */
  async handleTenantRegistration(msg, args = []) {
    try {
      const phoneNumber = msg.from;

      const monthlyBudget = parseInt(args[0]) || 7000;
      const location = args[1] || 'Dubai';
      const bedrooms = parseInt(args[2]) || 2;

      const tenant = await this.clientEngine.addTenant(phoneNumber, {
        name: msg.contact?.name || 'Tenant',
        monthlyRent: monthlyBudget,
        preferredLocations: [location],
        bedrooms: { min: 1, preferred: bedrooms }
      });

      if (!tenant) {
        return `❌ Failed to register as tenant. Try again.`;
      }

      await this.personaEngine.setPersonaRole(phoneNumber, 'tenant', {
        name: tenant.name,
        budget: monthlyBudget
      });

      return `✅ Welcome, Tenant! 🔑\n\nYour preferences:\n` +
             `Monthly Budget: ${monthlyBudget} AED\n` +
             `Location: ${location}\n` +
             `Bedrooms: ${bedrooms}\n\n` +
             `Use: !find-apartments to search!`;

    } catch (error) {
      logger.error(`❌ Error in tenant registration: ${error.message}`);
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * !i-am-agent command
   * Register user as agent
   */
  async handleAgentRegistration(msg, args = []) {
    try {
      const phoneNumber = msg.from;
      const agency = args[0] || 'Independent';
      const commission = parseInt(args[1]) || 5;

      const persona = await this.personaEngine.setPersonaRole(phoneNumber, 'agent', {
        name: msg.contact?.name || 'Agent',
        agency: agency,
        commission: `${commission}%`
      });

      if (!persona) {
        return `❌ Failed to register as agent. Try again.`;
      }

      // Register in agent deal manager
      const agent = this.agentDealManager.registerAgent(
        persona.id,
        persona.name,
        agency,
        commission
      );

      return `✅ Welcome, Agent! 🎯\n\n` +
             `Agency: ${agency}\n` +
             `Commission Rate: ${commission}%\n\n` +
             `Use: !list-property to add listings\n` +
             `Use: !my-deals to view active deals\n` +
             `Use: !commission-status for earnings`;

    } catch (error) {
      logger.error(`❌ Error in agent registration: ${error.message}`);
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * !find-properties command
   * Find properties matching buyer preferences
   */
  async handleFindProperties(msg, args = []) {
    try {
      const phoneNumber = msg.from;
      const client = this.clientEngine.getClientByPhone(phoneNumber);

      if (!client || client.type !== 'buyer') {
        return `❌ You must register as buyer first: !i-am-buyer [minBudget] [maxBudget] [location] [bedrooms]`;
      }

      // Find matches
      const allProperties = this.propertyEngine.getAllProperties();
      const matches = await this.dealMatchingEngine.findBuyerMatches(client, allProperties, {
        maxResults: 5,
        minScore: 0.7
      });

      if (matches.length === 0) {
        return `❌ No properties match your criteria. Try adjusting your preferences.`;
      }

      // Format response
      let response = `🏠 Found ${matches.length} matching properties:\n\n`;
      
      matches.forEach((match, idx) => {
        const prop = match.property;
        response += `${idx + 1}. ${prop.type.toUpperCase()} - ${prop.location}\n` +
                   `   ${prop.bedrooms}BR | ${prop.area} | ${prop.sale.price} AED\n` +
                   `   ✅ ${(match.score * 100).toFixed(0)}% match\n\n`;
      });

      response += `Reply with property number (1-${matches.length}) to view details or schedule viewing!`;

      return response;

    } catch (error) {
      logger.error(`❌ Error finding properties: ${error.message}`);
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * !my-deals command
   * View active deals for buyer/tenant or agent
   */
  async handleMyDeals(msg, args = []) {
    try {
      const phoneNumber = msg.from;
      const client = this.clientEngine.getClientByPhone(phoneNumber);
      const persona = this.personaEngine.getPersona(phoneNumber);

      if (!client && !persona) {
        return `❌ Please register first: !i-am-buyer, !i-am-seller, !i-am-tenant, !i-am-agent, or !i-am-landlord`;
      }

      let deals = [];
      if (client) {
        deals = this.dealLifecycleManager.getDealsForClient(client.id) || [];
      } else if (persona && persona.primaryRole === 'agent') {
        deals = this.dealLifecycleManager.getActiveDeals()
          .filter(d => d.agentId === persona.id) || [];
      }

      if (deals.length === 0) {
        return `📭 No active deals yet.`;
      }

      let response = `📊 Your Active Deals (${deals.length}):\n\n`;
      
      deals.forEach((deal, idx) => {
        const prop = deal.propertyId;  // Would need property lookup
        response += `${idx + 1}. Deal ${deal.id}\n` +
                   `   Stage: ${deal.stage}\n` +
                   `   Status: ${deal.status}\n\n`;
      });

      return response;

    } catch (error) {
      logger.error(`❌ Error getting deals: ${error.message}`);
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * !make-offer command
   * Submit price offer for a property
   */
  async handleMakeOffer(msg, args = []) {
    try {
      const propertyId = args[0];
      const offeredPrice = parseInt(args[1]);

      if (!propertyId || !offeredPrice) {
        return `❌ Usage: !make-offer [propertyId] [price]\nExample: !make-offer prop-001 2300000`;
      }

      const property = this.propertyEngine.getProperty(propertyId);
      if (!property) {
        return `❌ Property not found: ${propertyId}`;
      }

      // Create deal if doesn't exist
      const phoneNumber = msg.from;
      const client = this.clientEngine.getClientByPhone(phoneNumber);

      if (!client || client.type !== 'buyer') {
        return `❌ Only buyers can make offers. Register: !i-am-buyer`;
      }

      let deal = this.dealLifecycleManager.getDealsForClient(client.id)
        .find(d => d.propertyId === propertyId);

      if (!deal) {
        deal = await this.dealLifecycleManager.createDeal(client.id, propertyId);
      }

      const offer = await this.dealLifecycleManager.submitOffer(deal.id, offeredPrice, {
        offeredBy: 'buyer',
        notes: `Offer from ${client.name}`
      });

      if (!offer) {
        return `❌ Failed to submit offer. Try again.`;
      }

      return `✅ Offer Submitted! 🎉\n\n` +
             `Property: ${propertyId}\n` +
             `Your Offer: ${offeredPrice} AED\n` +
             `Original Price: ${property.sale.price} AED\n` +
             `Difference: ${property.sale.price - offeredPrice} AED\n\n` +
             `⏳ Waiting for seller response...`;

    } catch (error) {
      logger.error(`❌ Error making offer: ${error.message}`);
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * !schedule-viewing command
   * Schedule property viewing
   */
  async handleScheduleViewing(msg, args = []) {
    try {
      const propertyId = args[0];
      const viewingTime = args[1] || 'ASAP';

      if (!propertyId) {
        return `❌ Usage: !schedule-viewing [propertyId] [time]\nExample: !schedule-viewing prop-001 "tomorrow 3pm"`;
      }

      const property = this.propertyEngine.getProperty(propertyId);
      if (!property) {
        return `❌ Property not found: ${propertyId}`;
      }

      return `✅ Viewing Requested 📅\n\n` +
             `Property: ${property.address}\n` +
             `Requested Time: ${viewingTime}\n\n` +
             `⏳ Agent will confirm availability...`;

    } catch (error) {
      logger.error(`❌ Error scheduling viewing: ${error.message}`);
      return `❌ Error: ${error.message}`;
    }
  }
}

export default RealEstateCommands;
