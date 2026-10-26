/**
 * Deal Matching Engine
 * Finds optimal property matches for buyers/tenants
 * Uses DealScoringEngine for intelligent matching
 */

import { logger } from '../Integration/Google/utils/logger.js';
import DealScoringEngine from './DealScoringEngine.js';

class DealMatchingEngine {
  constructor(config = {}) {
    this.scoringEngine = new DealScoringEngine(config.scoringConfig);
    this.minScore = config.minScore || 0.75;
    this.maxResults = config.maxResults || 5;
  }

  /**
   * Find property matches for a buyer
   * @param {Object} client - Client/buyer object
   * @param {Array} properties - Array of properties to search
   * @param {Object} options - Search options (maxResults, minScore)
   * @returns {Array} Sorted matches with scores
   */
  async findBuyerMatches(client, properties, options = {}) {
    try {
      const maxResults = options.maxResults || this.maxResults;
      const minScore = options.minScore || this.minScore;

      const scored = properties
        .filter(p => p.forSale && p.sale?.status !== 'sold')
        .map(property => {
          const scoreResult = this.scoringEngine.scoreBuyerMatch(client, property);
          return {
            property: property,
            ...scoreResult
          };
        })
        .filter(m => m.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      logger.info(`✅ Found ${scored.length} matches for buyer ${client.name} (${client.phone})`);
      return scored;

    } catch (error) {
      logger.error(`❌ Error finding buyer matches: ${error.message}`);
      return [];
    }
  }

  /**
   * Find property matches for a tenant
   * @param {Object} client - Client/tenant object
   * @param {Array} properties - Array of properties to search
   * @param {Object} options - Search options (maxResults, minScore)
   * @returns {Array} Sorted matches with scores
   */
  async findTenantMatches(client, properties, options = {}) {
    try {
      const maxResults = options.maxResults || this.maxResults;
      const minScore = options.minScore || this.minScore;

      const scored = properties
        .filter(p => p.forLease && p.lease?.status !== 'leased')
        .map(property => {
          const scoreResult = this.scoringEngine.scoreTenantMatch(client, property);
          return {
            property: property,
            ...scoreResult
          };
        })
        .filter(m => m.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      logger.info(`✅ Found ${scored.length} matches for tenant ${client.name} (${client.phone})`);
      return scored;

    } catch (error) {
      logger.error(`❌ Error finding tenant matches: ${error.message}`);
      return [];
    }
  }

  /**
   * Find buyers for a property (reverse matching)
   * @param {Object} property - Property object
   * @param {Array} clients - Array of buyers/tenants
   * @returns {Array} Sorted buyer matches
   */
  async findClientsForProperty(property, clients, options = {}) {
    try {
      const maxResults = options.maxResults || this.maxResults;
      const minScore = options.minScore || this.minScore;

      const scored = clients
        .filter(c => {
          if (property.forSale && c.type === 'buyer') return true;
          if (property.forLease && c.type === 'tenant') return true;
          return false;
        })
        .map(client => {
          const method = client.type === 'buyer' 
            ? 'scoreBuyerMatch' 
            : 'scoreTenantMatch';
          const scoreResult = this.scoringEngine[method](client, property);
          return {
            client: client,
            ...scoreResult
          };
        })
        .filter(m => m.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      logger.info(`✅ Found ${scored.length} interested clients for property ${property.id}`);
      return scored;

    } catch (error) {
      logger.error(`❌ Error finding clients for property: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate match score between specific client and property
   */
  async scoreMatch(client, property) {
    try {
      let scoreResult;
      
      if (client.type === 'buyer') {
        scoreResult = this.scoringEngine.scoreBuyerMatch(client, property);
      } else if (client.type === 'tenant') {
        scoreResult = this.scoringEngine.scoreTenantMatch(client, property);
      } else {
        return { score: 0, confidence: 'error', message: 'Invalid client type' };
      }

      return scoreResult;

    } catch (error) {
      logger.error(`❌ Error scoring match: ${error.message}`);
      return { score: 0, confidence: 'error', error: error.message };
    }
  }

  /**
   * Format matches for display
   */
  formatMatchesForDisplay(matches, maxToShow = 5) {
    try {
      const message = matches.slice(0, maxToShow).map((match, idx) => {
        const prop = match.property;
        const type = prop.forSale ? 'Sale' : 'Lease';
        const price = prop.forSale 
          ? `${prop.sale.price} AED` 
          : `${prop.lease.monthlyRent} AED/month`;
        
        return `${idx + 1}. ${prop.type.toUpperCase()} in ${prop.location}` +
          ` | ${prop.bedrooms}BR | ${price} | ${(match.score * 100).toFixed(0)}% match`;
      });

      return message.join('\n');

    } catch (error) {
      logger.error(`❌ Error formatting matches: ${error.message}`);
      return '';
    }
  }
}

export default DealMatchingEngine;
