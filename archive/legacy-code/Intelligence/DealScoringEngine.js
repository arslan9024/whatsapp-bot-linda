/**
 * Deal Scoring Engine
 * Calculates match score between buyers/tenants and properties
 * 
 * Features:
 * - Score properties against buyer/tenant preferences
 * - Weighted scoring system
 * - Confidence levels
 * - Reason-based transparency
 */

import { logger } from '../Integration/Google/utils/logger.js';

class DealScoringEngine {
  constructor(config = {}) {
    this.weights = config.weights || {
      budget: 0.3,
      location: 0.3,
      bedrooms: 0.2,
      features: 0.2
    };
    this.minScore = config.minConfidenceScore || 0.75;
  }

  /**
   * Score buyer-property match
   */
  scoreBuyerMatch(client, property) {
    try {
      if (!property.forSale) {
        return { score: 0, reasons: [], confidence: 'invalid', message: 'Property not for sale' };
      }

      const scores = {
        budget: this._scoreBudget(client, property),
        location: this._scoreLocation(client, property),
        bedrooms: this._scoreBedrooms(client, property),
        features: this._scoreFeatures(client, property)
      };

      // Calculate weighted score
      let weightedScore = 0;
      const reasons = [];

      for (const [factor, score] of Object.entries(scores)) {
        const weight = this.weights[factor] || 0;
        weightedScore += score.score * weight;
        reasons.push({
          factor: factor,
          match: score.score,
          reason: score.reason,
          weight: weight,
          contribution: score.score * weight
        });
      }

      // Confidence level based on score
      let confidence = 'low';
      if (weightedScore >= 0.9) confidence = 'excellent';
      else if (weightedScore >= 0.8) confidence = 'high';
      else if (weightedScore >= 0.65) confidence = 'medium';

      return {
        score: parseFloat(weightedScore.toFixed(2)),
        reasons: reasons.sort((a, b) => b.contribution - a.contribution),
        confidence: confidence,
        meetsBudget: scores.budget.score >= 0.7,
        meetsLocation: scores.location.score >= 0.7,
        message: `${(weightedScore * 100).toFixed(0)}% match`
      };

    } catch (error) {
      logger.error(`❌ Error scoring buyer match: ${error.message}`);
      return { score: 0, confidence: 'error', error: error.message };
    }
  }

  /**
   * Score tenant-property match
   */
  scoreTenantMatch(client, property) {
    try {
      if (!property.forLease) {
        return { score: 0, reasons: [], confidence: 'invalid', message: 'Property not for lease' };
      }

      const scores = {
        budget: this._scoreRent(client, property),
        location: this._scoreLocation(client, property),
        bedrooms: this._scoreBedrooms(client, property),
        features: this._scoreLeaseFeatures(client, property)
      };

      // Calculate weighted score
      let weightedScore = 0;
      const reasons = [];

      for (const [factor, score] of Object.entries(scores)) {
        const weight = this.weights[factor] || 0;
        weightedScore += score.score * weight;
        reasons.push({
          factor: factor,
          match: score.score,
          reason: score.reason,
          weight: weight,
          contribution: score.score * weight
        });
      }

      // Confidence level
      let confidence = 'low';
      if (weightedScore >= 0.9) confidence = 'excellent';
      else if (weightedScore >= 0.8) confidence = 'high';
      else if (weightedScore >= 0.65) confidence = 'medium';

      return {
        score: parseFloat(weightedScore.toFixed(2)),
        reasons: reasons.sort((a, b) => b.contribution - a.contribution),
        confidence: confidence,
        meetsBudget: scores.budget.score >= 0.7,
        meetsLocation: scores.location.score >= 0.7,
        message: `${(weightedScore * 100).toFixed(0)}% match`
      };

    } catch (error) {
      logger.error(`❌ Error scoring tenant match: ${error.message}`);
      return { score: 0, confidence: 'error', error: error.message };
    }
  }

  /**
   * Score budget match (for sale)
   * @private
   */
  _scoreBudget(client, property) {
    const budget = client.buyerProfile?.budget;
    const price = property.sale?.price;

    if (!budget || !price) {
      return { score: 0.5, reason: 'Budget information missing' };
    }

    const min = budget.min;
    const max = budget.max;

    if (price < min) {
      const difference = ((min - price) / min) * 100;
      if (difference > 30) return { score: 0.4, reason: `Below budget by ${difference.toFixed(0)}%` };
      return { score: 0.7, reason: `Below budget by ${difference.toFixed(0)}%` };
    }

    if (price > max) {
      const difference = ((price - max) / max) * 100;
      if (difference > 10) return { score: 0.3, reason: `Above budget by ${difference.toFixed(0)}%` };
      if (difference > 5) return { score: 0.6, reason: `Above budget by ${difference.toFixed(0)}%` };
      return { score: 0.8, reason: `Slightly above budget (${difference.toFixed(1)}%)` };
    }

    return { score: 1.0, reason: 'Perfect budget match' };
  }

  /**
   * Score rent match (for lease)
   * @private
   */
  _scoreRent(client, property) {
    const budget = client.tenantProfile?.budget;
    const rent = property.lease?.monthlyRent;

    if (!budget || !rent) {
      return { score: 0.5, reason: 'Rent information missing' };
    }

    const maxRent = budget.monthlyRent;

    if (rent > maxRent) {
      const difference = ((rent - maxRent) / maxRent) * 100;
      if (difference > 20) return { score: 0.2, reason: `Above budget by ${difference.toFixed(0)}%` };
      if (difference > 10) return { score: 0.4, reason: `Above budget by ${difference.toFixed(0)}%` };
      return { score: 0.7, reason: `Slightly above budget (${difference.toFixed(1)}%)` };
    }

    if (rent < maxRent) {
      return { score: 1.0, reason: 'Well within budget' };
    }

    return { score: 1.0, reason: 'Exact budget match' };
  }

  /**
   * Score location match
   * @private
   */
  _scoreLocation(client, property) {
    const preferences = client.buyerProfile?.preferences || client.tenantProfile?.preferences;
    const locations = preferences?.locations || [];
    const propLocation = property.location.toLowerCase();

    if (!locations || locations.length === 0) {
      return { score: 0.5, reason: 'No location preference set' };
    }

    // Exact match
    if (locations.some(l => l.toLowerCase() === propLocation)) {
      return { score: 1.0, reason: 'Exact location match' };
    }

    // Partial match (area contains one of preferred)
    for (const loc of locations) {
      if (propLocation.includes(loc.toLowerCase()) || loc.toLowerCase().includes(propLocation)) {
        return { score: 0.8, reason: `Close match: ${loc}` };
      }
    }

    return { score: 0.3, reason: `Not in preferred locations: ${locations.join(', ')}` };
  }

  /**
   * Score bedrooms match
   * @private
   */
  _scoreBedrooms(client, property) {
    const preferences = client.buyerProfile?.preferences || client.tenantProfile?.preferences;
    const property_br = property.bedrooms;
    const prefs = preferences?.bedrooms;

    if (!prefs) {
      return { score: 0.5, reason: 'No bedroom preference set' };
    }

    const minBr = prefs.min || 1;
    const preferredBr = prefs.preferred || minBr;

    if (property_br < minBr) {
      return { score: 0.3, reason: `Below minimum ${minBr}BR requirement (${property_br}BR)` };
    }

    if (property_br === preferredBr) {
      return { score: 1.0, reason: `Perfect match: ${property_br}BR` };
    }

    if (property_br > preferredBr) {
      const diff = property_br - preferredBr;
      if (diff === 1) return { score: 0.9, reason: `1 extra bedroom` };
      if (diff <= 2) return { score: 0.8, reason: `${diff} extra bedrooms` };
      return { score: 0.7, reason: `${diff} extra bedrooms` };
    }

    return { score: 0.7, reason: `Close match: ${property_br}BR vs ${preferredBr}BR preferred` };
  }

  /**
   * Score features match (for sale)
   * @private
   */
  _scoreFeatures(client, property) {
    const mustHaves = client.buyerProfile?.preferences?.mustHaves || [];
    const niceToHaves = client.buyerProfile?.preferences?.niceToHaves || [];
    const propFeatures = property.features || [];

    if (mustHaves.length === 0 && niceToHaves.length === 0) {
      return { score: 1.0, reason: 'No specific features required' };
    }

    // Check must-haves
    if (mustHaves.length > 0) {
      const mustHaveMatches = mustHaves.filter(f => 
        propFeatures.some(pf => pf.toLowerCase().includes(f.toLowerCase()))
      ).length;

      if (mustHaveMatches < mustHaves.length) {
        const rate = mustHaveMatches / mustHaves.length;
        return { 
          score: rate, 
          reason: `Missing ${mustHaves.length - mustHaveMatches} required feature(s)` 
        };
      }
    }

    // Check nice-to-haves
    if (niceToHaves.length > 0) {
      const niceMatches = niceToHaves.filter(f => 
        propFeatures.some(pf => pf.toLowerCase().includes(f.toLowerCase()))
      ).length;

      const rate = 0.7 + (niceMatches / niceToHaves.length) * 0.3;  // 70-100%
      return { 
        score: rate, 
        reason: `Has ${niceMatches}/${niceToHaves.length} nice-to-have features` 
      };
    }

    return { score: 1.0, reason: 'All must-have features present' };
  }

  /**
   * Score lease features (for lease)
   * @private
   */
  _scoreLeaseFeatures(client, property) {
    const prefs = client.tenantProfile?.preferences || {};
    const lease = property.lease || {};

    let score = 0.5;
    let reason = '';

    // Check furnished preference
    if (prefs.furnished !== undefined) {
      if (lease.furnished === prefs.furnished) {
        score = Math.min(score + 0.3, 1.0);
        reason += 'Furnished preference matched. ';
      } else {
        score = Math.max(score - 0.2, 0.0);
        reason += `Furnished mismatch. `;
      }
    }

    // Check utilities
    if (prefs.utilities) {
      if (lease.utilities?.toLowerCase() === prefs.utilities.toLowerCase()) {
        score = Math.min(score + 0.2, 1.0);
        reason += 'Utilities match. ';
      }
    }

    return { score: parseFloat(score.toFixed(2)), reason: reason || 'Lease features checked' };
  }
}

export default DealScoringEngine;
