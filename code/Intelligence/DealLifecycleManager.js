/**
 * Deal Lifecycle Manager
 * Tracks deals through all stages: match → interest → viewing → negotiation → agreement → closed
 * Also tracks rental and renewal lifecycles for tenancy contracts
 * 
 * Features:
 * - Create and manage sales and rental deals
 * - Track deal stages with timestamps
 * - Track contract expiry and renewal dates
 * - Handle offers and negotiations
 * - Calculate commissions
 * - Generate deal reports
 */

import { logger } from '../Integration/Google/utils/logger.js';
import fs from 'fs';

class DealLifecycleManager {
  constructor(config = {}) {
    this.deals = new Map();  // dealId → deal object
    this.dealsByProperty = new Map();  // propertyId → [dealIds]
    this.dealsByClient = new Map();  // clientId → [dealIds]
    this.dealsRegistryPath = config.dealsRegistryPath || './code/Data/deals-registry.json';
    this.stages = [
      'match_identified',
      'interest_expressed',
      'viewing_scheduled',
      'viewing_attended',
      'negotiation',
      'agreement_reached',
      'closed',
      // Rental/renewal stages
      'lease_initiated',
      'lease_active',
      'renewal_alert_sent',
      'renewal_negotiating',
      'lease_renewed',
      'lease_ended'
    ];
  }

  /**
   * Initialize engine
   */
  async initialize() {
    try {
      if (fs.existsSync(this.dealsRegistryPath)) {
        const data = JSON.parse(fs.readFileSync(this.dealsRegistryPath, 'utf8'));
        data.deals.forEach(d => {
          this.deals.set(d.id, d);
          
          if (!this.dealsbyProperty.has(d.propertyId)) {
            this.dealsbyProperty.set(d.propertyId, []);
          }
          this.dealsbyProperty.get(d.propertyId).push(d.id);
          
          if (!this.dealsByClient.has(d.clientId)) {
            this.dealsByClient.set(d.clientId, []);
          }
          this.dealsByClient.get(d.clientId).push(d.id);
        });
        logger.info(`✅ Deal Lifecycle Manager initialized with ${data.deals.length} deals`);
      } else {
        logger.warn(`⚠️ Deals registry not found, starting fresh`);
      }
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize DealLifecycleManager: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new deal
   */
  async createDeal(clientId, propertyId, agentId = null, matchScore = 0) {
    try {
      const dealId = `deal-${Date.now()}`;

      const deal = {
        id: dealId,
        clientId: clientId,
        propertyId: propertyId,
        agentId: agentId,
        matchScore: matchScore,

        timeline: {
          matchIdentified: new Date().toISOString(),
          interestExpressed: null,
          viewingScheduled: null,
          viewingAttended: null,
          viewingFeedback: null,
          negotiationStarted: null,
          finalOffer: null,
          agreementReached: null,
          expectedClosure: null,
          closed: null
        },

        financial: {
          askingPrice: null,
          finalPrice: null,
          agentCommission: null,
          agentCommissionPercent: null,
          status: 'pending'  // pending, offered, agreed, closed
        },

        // Contract tracking (for rental deals)
        contractMetadata: {
          contractId: null,
          contractType: 'sales',  // 'sales' or 'lease'
          contractSignedDate: null,
          contractExpiryDate: null,
          renewalEligibleDate: null,
          renewalReminderSentDate: null,
          daysUntilExpiry: null
        },

        offers: [],  // Track all offers/counter-offers
        notes: [],  // Timeline notes

        stage: 'match_identified',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      this.deals.set(dealId, deal);
      
      // Index by property
      if (!this.dealsbyProperty.has(propertyId)) {
        this.dealsbyProperty.set(propertyId, []);
      }
      this.dealsbyProperty.get(propertyId).push(dealId);
      
      // Index by client
      if (!this.dealsByClient.has(clientId)) {
        this.dealsByClient.set(clientId, []);
      }
      this.dealsByClient.get(clientId).push(dealId);

      await this._persistDeals();

      logger.info(`✅ Deal created: ${dealId} (Client: ${clientId}, Property: ${propertyId})`);
      return deal;

    } catch (error) {
      logger.error(`❌ Error creating deal: ${error.message}`);
      return null;
    }
  }

  /**
   * Move deal to next stage
   */
  async progressDealStage(dealId, nextStage, details = {}) {
    try {
      const deal = this.deals.get(dealId);
      if (!deal) {
        logger.warn(`⚠️ Deal not found: ${dealId}`);
        return null;
      }

      const currentIdx = this.stages.indexOf(deal.stage);
      const nextIdx = this.stages.indexOf(nextStage);

      if (nextIdx <= currentIdx) {
        logger.warn(`⚠️ Cannot go backwards in deal stages: ${deal.stage} → ${nextStage}`);
        return null;
      }

      // Update timeline
      switch (nextStage) {
        case 'interest_expressed':
          deal.timeline.interestExpressed = new Date().toISOString();
          break;
        case 'viewing_scheduled':
          deal.timeline.viewingScheduled = details.viewingTime || new Date().toISOString();
          break;
        case 'viewing_attended':
          deal.timeline.viewingAttended = new Date().toISOString();
          deal.timeline.viewingFeedback = details.feedback || '';
          break;
        case 'negotiation':
          deal.timeline.negotiationStarted = new Date().toISOString();
          break;
        case 'agreement_reached':
          deal.timeline.agreementReached = new Date().toISOString();
          deal.timeline.finalOffer = details.finalPrice;
          deal.financial.finalPrice = details.finalPrice;
          deal.financial.status = 'agreed';
          break;
        case 'closed':
          deal.timeline.closed = new Date().toISOString();
          deal.status = 'closed';
          deal.financial.status = 'closed';
          break;
      }

      deal.stage = nextStage;
      deal.lastUpdated = new Date().toISOString();

      if (details.note) {
        deal.notes.push({
          timestamp: new Date().toISOString(),
          note: details.note,
          stage: nextStage
        });
      }

      await this._persistDeals();

      logger.info(`✅ Deal progressed: ${dealId} → ${nextStage}`);
      return deal;

    } catch (error) {
      logger.error(`❌ Error progressing deal: ${error.message}`);
      return null;
    }
  }

  /**
   * Submit offer for deal
   */
  async submitOffer(dealId, offeredPrice, offerDetails = {}) {
    try {
      const deal = this.deals.get(dealId);
      if (!deal) {
        logger.warn(`⚠️ Deal not found: ${dealId}`);
        return null;
      }

      const offer = {
        offerId: `offer-${Date.now()}`,
        offeredPrice: offeredPrice,
        offeredBy: offerDetails.offeredBy || 'buyer',  // buyer or seller counter-offer
        offeredAt: new Date().toISOString(),
        status: 'pending',  // pending, accepted, rejected, countered
        notes: offerDetails.notes || ''
      };

      if (!deal.offers) deal.offers = [];
      deal.offers.push(offer);

      // Move to negotiation if not already there
      if (deal.stage === 'interest_expressed' || deal.stage === 'viewing_attended') {
        await this.progressDealStage(dealId, 'negotiation', {
          note: `Offer submitted: ${offeredPrice} AED`
        });
      }

      deal.financial.finalPrice = offeredPrice;  // Update tentative price
      deal.lastUpdated = new Date().toISOString();

      await this._persistDeals();

      logger.info(`✅ Offer submitted for deal ${dealId}: ${offeredPrice} AED`);
      return offer;

    } catch (error) {
      logger.error(`❌ Error submitting offer: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate agent commission
   */
  calculateCommission(dealId, commissionPercent = 5) {
    try {
      const deal = this.deals.get(dealId);
      if (!deal) {
        logger.warn(`⚠️ Deal not found: ${dealId}`);
        return null;
      }

      const finalPrice = deal.financial.finalPrice || deal.financial.askingPrice;
      if (!finalPrice) {
        return null;
      }

      const commission = (finalPrice * commissionPercent) / 100;

      deal.financial.agentCommission = commission;
      deal.financial.agentCommissionPercent = commissionPercent;

      return {
        dealId: dealId,
        finalPrice: finalPrice,
        commissionPercent: commissionPercent,
        commission: parseFloat(commission.toFixed(2))
      };

    } catch (error) {
      logger.error(`❌ Error calculating commission: ${error.message}`);
      return null;
    }
  }

  /**
   * Update contract expiry information for a deal (for rental/lease agreements)
   */
  async updateContractExpiry(dealId, contractMetadata) {
    try {
      const deal = this.deals.get(dealId);
      if (!deal) {
        logger.warn(`⚠️ Deal not found: ${dealId}`);
        return null;
      }

      // Update contract metadata
      deal.contractMetadata.contractId = contractMetadata.contractId || deal.contractMetadata.contractId;
      deal.contractMetadata.contractType = contractMetadata.contractType || deal.contractMetadata.contractType;
      deal.contractMetadata.contractSignedDate = contractMetadata.contractSignedDate || deal.contractMetadata.contractSignedDate;
      deal.contractMetadata.contractExpiryDate = contractMetadata.contractExpiryDate;

      // Calculate renewal eligible date (100 days before expiry)
      if (contractMetadata.contractExpiryDate) {
        const expiryDate = new Date(contractMetadata.contractExpiryDate);
        const renewalEligibleDate = new Date(expiryDate.getTime() - 100 * 24 * 60 * 60 * 1000);
        deal.contractMetadata.renewalEligibleDate = renewalEligibleDate.toISOString();

        // Calculate days until expiry
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        deal.contractMetadata.daysUntilExpiry = daysUntilExpiry;
      }

      deal.lastUpdated = new Date().toISOString();
      await this._persistDeals();

      logger.info(`✅ Contract expiry updated for deal: ${dealId}, Expires: ${contractMetadata.contractExpiryDate}`);
      return deal;

    } catch (error) {
      logger.error(`❌ Error updating contract expiry: ${error.message}`);
      return null;
    }
  }

  /**
   * Get deal by ID
   */
  getDeal(dealId) {
    return this.deals.get(dealId);
  }

  /**
   * Get all deals for property
   */
  getDealsForProperty(propertyId) {
    const dealIds = this.dealsbyProperty.get(propertyId) || [];
    return dealIds.map(id => this.deals.get(id)).filter(d => d);
  }

  /**
   * Get all deals for client
   */
  getDealsForClient(clientId) {
    const dealIds = this.dealsByClient.get(clientId) || [];
    return dealIds.map(id => this.deals.get(id)).filter(d => d);
  }

  /**
   * Get active deals
   */
  getActiveDeals() {
    return Array.from(this.deals.values()).filter(d => d.status === 'active');
  }

  /**
   * Get closed deals
   */
  getClosedDeals() {
    return Array.from(this.deals.values()).filter(d => d.status === 'closed');
  }

  /**
   * Get deals by stage
   */
  getDealsByStage(stage) {
    return Array.from(this.deals.values()).filter(d => d.stage === stage);
  }

  /**
   * Get all deals
   */
  getAllDeals() {
    return Array.from(this.deals.values());
  }

  /**
   * Persist deals to file
   * @private
   */
  async _persistDeals() {
    try {
      const data = {
        deals: Array.from(this.deals.values()),
        totalDeals: this.deals.size,
        activeDeals: this.getActiveDeals().length,
        closedDeals: this.getClosedDeals().length,
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      fs.writeFileSync(this.dealsRegistryPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(`❌ Failed to persist deals: ${error.message}`);
    }
  }
}

export default DealLifecycleManager;
