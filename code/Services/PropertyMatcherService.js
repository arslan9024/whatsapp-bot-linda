/**
 * ====================================================================
 * PROPERTY MATCHER SERVICE
 * ====================================================================
 * AI-powered matching engine that matches buyer/tenant preferences
 * to available property listings.
 *
 * Features:
 *   • Register buyer preferences (budget, bedrooms, location, type)
 *   • Index available listings from MongoDB or JSON data
 *   • Score each listing against each buyer (0-100)
 *   • Return ranked top-N matches per buyer
 *   • Push new listing alerts to matching buyers
 *
 * Bot commands:
 *   !match search <budget> <bedrooms> <location>  — find matching properties
 *   !match alert <phone>                           — send matches to contact
 *   !match preferences                            — show current preferences
 *   !match stats                                  — matching engine stats
 *
 * @since Wave-4 Feature Expansion — May 2026
 */

import { Logger } from '../utils/Logger.js';

const log = new Logger('PropertyMatcher');

// ─── Matching weights (must sum to 1.0) ─────────────────────────────
const WEIGHTS = {
  budget:    0.35,
  bedrooms:  0.25,
  location:  0.25,
  type:      0.15,
};

class PropertyMatcherService {
  constructor() {
    /** @type {Map<string, object>} phone → buyer preferences */
    this._buyers = new Map();
    /** @type {object[]} available property listings */
    this._listings = [];
    this._stats = { searches: 0, alerts: 0, matches: 0 };
  }

  // ─────────────────────────────────────────────────────────────────
  // Listing management
  // ─────────────────────────────────────────────────────────────────

  /**
   * Load listings from an array (from DB, Google Sheets, etc.)
   * @param {object[]} listings
   */
  loadListings(listings) {
    this._listings = (listings || []).filter(l => l && l.propertyId);
    log.info(`📦 PropertyMatcher: loaded ${this._listings.length} listings`);
  }

  /**
   * Add or update a single listing.
   * @param {object} listing
   */
  upsertListing(listing) {
    if (!listing?.propertyId) return;
    const idx = this._listings.findIndex(l => l.propertyId === listing.propertyId);
    if (idx >= 0) {
      this._listings[idx] = listing;
    } else {
      this._listings.push(listing);
    }
  }

  /**
   * Remove a listing (e.g. when sold/rented).
   * @param {string} propertyId
   */
  removeListing(propertyId) {
    this._listings = this._listings.filter(l => l.propertyId !== propertyId);
  }

  // ─────────────────────────────────────────────────────────────────
  // Buyer preferences
  // ─────────────────────────────────────────────────────────────────

  /**
   * Register or update buyer preferences.
   * @param {string} phone
   * @param {object} prefs  - { budgetMin, budgetMax, bedrooms, locations[], intent, types[] }
   */
  registerBuyer(phone, prefs) {
    this._buyers.set(phone, { phone, ...prefs, registeredAt: new Date() });
    log.info(`👤 Buyer registered: ${phone}`);
  }

  /** Get preferences for a phone number. */
  getBuyer(phone) {
    return this._buyers.get(phone) || null;
  }

  // ─────────────────────────────────────────────────────────────────
  // Core matching
  // ─────────────────────────────────────────────────────────────────

  /**
   * Find top-N matching listings for a buyer preference object.
   *
   * @param {object} prefs    - { budgetMin, budgetMax, bedrooms, locations[], types[] }
   * @param {number} [n=5]    - Max results
   * @returns {Array<{listing: object, score: number}>}
   */
  findMatches(prefs, n = 5) {
    this._stats.searches++;
    if (!this._listings.length) return [];

    const scored = this._listings
      .filter(l => l.status !== 'sold' && l.status !== 'rented')
      .map(listing => ({
        listing,
        score: this._scoreMatch(prefs, listing),
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, n);

    this._stats.matches += scored.length;
    return scored;
  }

  /**
   * Find matches for a phone number using stored preferences.
   */
  findMatchesForBuyer(phone, n = 5) {
    const prefs = this._buyers.get(phone);
    if (!prefs) return [];
    return this.findMatches(prefs, n);
  }

  /**
   * Find all buyers who match a newly added listing.
   */
  findBuyersForListing(listing, n = 20) {
    const scored = [];
    for (const [phone, prefs] of this._buyers) {
      const score = this._scoreMatch(prefs, listing);
      if (score >= 50) {
        scored.push({ phone, score, prefs });
      }
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, n);
  }

  // ─────────────────────────────────────────────────────────────────
  // Scoring algorithm
  // ─────────────────────────────────────────────────────────────────

  _scoreMatch(prefs, listing) {
    let total = 0;

    // Budget score
    const price = listing.price || listing.rentAmount || listing.askingPrice || 0;
    if (prefs.budgetMin != null && prefs.budgetMax != null && price > 0) {
      if (price >= prefs.budgetMin && price <= prefs.budgetMax) {
        total += WEIGHTS.budget * 100;
      } else {
        const gap = Math.min(
          Math.abs(price - prefs.budgetMin),
          Math.abs(price - prefs.budgetMax)
        );
        const pct = Math.max(0, 1 - gap / Math.max(prefs.budgetMax, 1));
        total += WEIGHTS.budget * 100 * pct * 0.5; // partial credit
      }
    } else {
      total += WEIGHTS.budget * 50; // unknown budget = neutral
    }

    // Bedrooms score
    const listingBeds = listing.bedrooms || listing.numberOfBedrooms || 0;
    const prefBeds    = prefs.bedrooms || 0;
    if (prefBeds && listingBeds) {
      const diff = Math.abs(prefBeds - listingBeds);
      total += WEIGHTS.bedrooms * 100 * Math.max(0, 1 - diff * 0.4);
    } else {
      total += WEIGHTS.bedrooms * 50;
    }

    // Location score
    const listingLoc = (listing.location || listing.communityName || listing.cluster || '').toLowerCase();
    const prefLocs   = (prefs.locations || []).map(l => l.toLowerCase());
    if (listingLoc && prefLocs.length) {
      const matched = prefLocs.some(loc => listingLoc.includes(loc) || loc.includes(listingLoc));
      total += matched ? WEIGHTS.location * 100 : 0;
    } else {
      total += WEIGHTS.location * 40;
    }

    // Type score (buy/rent/invest)
    const listingType = (listing.availableFor || listing.type || '').toLowerCase();
    const prefIntent  = (prefs.intent || '').toLowerCase();
    if (listingType && prefIntent) {
      const match =
        (prefIntent.includes('buy')  && (listingType.includes('sale') || listingType.includes('buy'))) ||
        (prefIntent.includes('rent') && listingType.includes('rent')) ||
        (prefIntent.includes('invest') && (listingType.includes('invest') || listingType.includes('sale')));
      total += match ? WEIGHTS.type * 100 : 0;
    } else {
      total += WEIGHTS.type * 50;
    }

    return Math.round(Math.min(total, 100));
  }

  // ─────────────────────────────────────────────────────────────────
  // Formatting
  // ─────────────────────────────────────────────────────────────────

  formatMatch(result, rank) {
    const l = result.listing;
    const price = l.price || l.rentAmount || l.askingPrice || 0;
    const loc   = l.location || l.communityName || l.cluster || 'N/A';
    const beds  = l.bedrooms || l.numberOfBedrooms || '?';
    const id    = l.propertyId || l.id || '?';
    const score = result.score;
    const bar   = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10));

    return [
      `*#${rank} — Match Score: ${score}/100*`,
      `${bar}`,
      `🏠 Property  : ${id}`,
      `📍 Location  : ${loc}`,
      `🛏️  Bedrooms  : ${beds}`,
      `💰 Price     : AED ${price.toLocaleString()}`,
    ].join('\n');
  }

  formatSearchResults(results, prefs) {
    if (!results.length) {
      return '😔 No matching properties found for your criteria. We\'ll notify you when new listings match!';
    }
    const header = [
      `🔍 *${results.length} Matching Propert${results.length === 1 ? 'y' : 'ies'} Found*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ];
    const cards = results.map((r, i) => this.formatMatch(r, i + 1));
    return [...header, ...cards].join('\n\n');
  }

  reportText() {
    return [
      '🏘️ *Property Matcher Stats*',
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Listings indexed : ${this._listings.length}`,
      `Buyers tracked   : ${this._buyers.size}`,
      `Searches run     : ${this._stats.searches}`,
      `Matches returned : ${this._stats.matches}`,
      `Alerts sent      : ${this._stats.alerts}`,
    ].join('\n');
  }

  stats() {
    return {
      ...this._stats,
      listings: this._listings.length,
      buyers:   this._buyers.size,
    };
  }
}

const propertyMatcher = new PropertyMatcherService();
export default propertyMatcher;
export { PropertyMatcherService };
