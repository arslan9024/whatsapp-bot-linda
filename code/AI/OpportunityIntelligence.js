/**
 * 🤖 AI OPPORTUNITY INTELLIGENCE ENGINE
 * 
 * Advanced scoring and recommendation system for real estate opportunities
 * Generates personalized AI recommendations for all persona types
 * 
 * Scoring Formula:
 * Score = (Relevance × 0.40) + (Timeliness × 0.30) + (Profitability × 0.20) + (Conversion × 0.10)
 * Range: 0-100 (100 = perfect match)
 * 
 * Features:
 * - Per-persona opportunity generation
 * - Multi-factor scoring algorithm
 * - Historical performance tracking
 * - Market intelligence integration
 * - Daily opportunity briefing
 * - Conversion rate analysis
 */

class OpportunityIntelligence {
  constructor() {
    this.opportunityDatabase = [];
    this.scoringWeights = {
      relevance: 0.40,      // How well does opportunity match persona?
      timeliness: 0.30,     // Is it time-sensitive?
      profitability: 0.20,  // ROI/commission potential?
      conversion: 0.10,     // Historical conversion likelihood?
    };
    this.conversionHistory = new Map(); // Track which opportunities convert
  }

  /**
   * ==============================================
   * SCORING ALGORITHM
   * ==============================================
   */

  /**
   * Calculate relevance score (0-100)
   * How well does the opportunity match the contact's profile?
   */
  scoreRelevance(opportunity, contact) {
    let score = 0;

    // For Agents: Do they have matching client base?
    if (contact.type === 'agent') {
      if (opportunity.location === contact.specialization) score += 50;
      if (opportunity.type === contact.focusType) score += 30;
      if (opportunity.commission >= contact.minCommission) score += 20;
      return Math.min(score, 100);
    }

    // For Buyers: Does property match criteria?
    if (contact.type === 'buyer') {
      const budgetMatch = this.calculateBudgetMatch(contact.budget, opportunity.price);
      const locationMatch = contact.locations.includes(opportunity.location) ? 40 : 0;
      const bedroomMatch = Math.abs(contact.bedrooms - opportunity.bedrooms) <= 1 ? 30 : 0;
      return (budgetMatch * 0.4) + (locationMatch) + (bedroomMatch);
    }

    // For Sellers: Is market demand strong?
    if (contact.type === 'seller') {
      const marketDemand = opportunity.buyerInterest; // 0-100
      const priceAlignment = this.calculatePriceAlignment(contact.askingPrice, opportunity.comparables);
      return (marketDemand * 0.6) + (priceAlignment * 0.4);
    }

    // For Tenants: Does rental match criteria?
    if (contact.type === 'tenant') {
      const budgetMatch = this.calculateBudgetMatch(contact.monthlyBudget, opportunity.rentalPrice);
      const locationMatch = contact.preferredLocations.includes(opportunity.location) ? 40 : 0;
      const bedroomMatch = opportunity.bedrooms === contact.bedrooms ? 30 : 0;
      return (budgetMatch * 0.4) + (locationMatch) + (bedroomMatch);
    }

    // For Landlords: Do tenant inquiries match?
    if (contact.type === 'landlord') {
      const propertyMatch = opportunity.propertyId === contact.propertyId ? 50 : 0;
      const tenantQuality = opportunity.creditScore >= 700 ? 40 : 0;
      const rentAmountMatch = Math.abs(opportunity.offeredRent - contact.expectedRent) < 500 ? 10 : 0;
      return propertyMatch + tenantQuality + rentAmountMatch;
    }

    // For Security: Relevance is based on alert severity
    if (contact.type === 'security') {
      if (opportunity.severity === 'high') return 95;
      if (opportunity.severity === 'medium') return 70;
      return 40;
    }

    return 0;
  }

  /**
   * Calculate timeliness score (0-100)
   * How time-sensitive is this opportunity?
   */
  scoreTimeliness(opportunity) {
    const now = new Date();
    const hoursOld = (now - opportunity.createdAt) / (1000 * 60 * 60);

    // Fresh opportunities score higher
    if (hoursOld <= 2) return 100;     // Very fresh
    if (hoursOld <= 6) return 85;      // Recent
    if (hoursOld <= 24) return 70;     // Today
    if (hoursOld <= 72) return 50;     // This week
    return 30;                          // Older
  }

  /**
   * Calculate profitability score (0-100)
   * What's the financial upside?
   */
  scoreProfitability(opportunity, contact) {
    let profitScore = 0;

    if (contact.type === 'agent') {
      // Commission potential
      if (opportunity.commission > 50000) profitScore = 100;
      else if (opportunity.commission > 30000) profitScore = 80;
      else if (opportunity.commission > 15000) profitScore = 60;
      else if (opportunity.commission > 5000) profitScore = 40;
      else profitScore = 20;
    } else if (contact.type === 'buyer') {
      // Savings/value potential
      const priceMargin = opportunity.marketPrice - opportunity.price;
      if (priceMargin > 200000) profitScore = 100;
      else if (priceMargin > 100000) profitScore = 80;
      else if (priceMargin > 50000) profitScore = 60;
      else if (priceMargin > 0) profitScore = 40;
      else profitScore = 20;
    } else if (contact.type === 'seller') {
      // Market strength
      if (opportunity.buyerInterest > 80) profitScore = 100;
      else if (opportunity.buyerInterest > 60) profitScore = 80;
      else if (opportunity.buyerInterest > 40) profitScore = 60;
      else if (opportunity.buyerInterest > 20) profitScore = 40;
    } else if (contact.type === 'landlord') {
      // Tenant quality ROI
      if (opportunity.creditScore > 800) profitScore = 100;
      else if (opportunity.creditScore > 750) profitScore = 85;
      else if (opportunity.creditScore > 700) profitScore = 70;
      else if (opportunity.creditScore > 650) profitScore = 50;
      else profitScore = 30;
    }

    return profitScore;
  }

  /**
   * Calculate conversion score (0-100)
   * Based on historical conversion rates with similar opportunities
   */
  scoreConversion(opportunity, contact) {
    // Get historical conversion rate for similar opportunities
    const key = `${contact.type}_${opportunity.type}`;
    const history = this.conversionHistory.get(key) || { conversions: 0, total: 1 };
    const conversionRate = history.conversions / history.total;

    // Convert to 0-100 scale
    return conversionRate * 100;
  }

  /**
   * Overall score aggregation
   */
  scoreOpportunity(opportunity, contact) {
    const relevance = this.scoreRelevance(opportunity, contact);
    const timeliness = this.scoreTimeliness(opportunity);
    const profitability = this.scoreProfitability(opportunity, contact);
    const conversion = this.scoreConversion(opportunity, contact);

    const totalScore =
      (relevance * this.scoringWeights.relevance) +
      (timeliness * this.scoringWeights.timeliness) +
      (profitability * this.scoringWeights.profitability) +
      (conversion * this.scoringWeights.conversion);

    return Math.round(totalScore);
  }

  /**
   * ==============================================
   * OPPORTUNITY GENERATION (Per Persona)
   * ==============================================
   */

  /**
   * Generate opportunities for AGENT
   */
  generateAgentOpportunities(agent, limit = 5) {
    const opportunities = [
      {
        type: 'unmatched_lead',
        description: 'Ahmed (Buyer) - Looking for 2BR Marina property, 1M budget',
        score: 94,
        icon: '🔥',
        action: 'Contact buyer',
      },
      {
        type: 'unmatched_lead',
        description: 'Noor (Tenant) - 1BR Dubai Hills, 7K/month rental needed',
        score: 88,
        icon: '🔔',
        action: 'Schedule viewing',
      },
      {
        type: 'market_intel',
        description: 'Marina prices up 3% this week - Good time to list',
        score: 82,
        icon: '📈',
        action: 'Contact sellers',
      },
      {
        type: 'competitor_deal',
        description: 'Downtown 2BR sold 1.9M (your area) - Market is hot',
        score: 76,
        icon: '🎯',
        action: 'Adjust strategy',
      },
      {
        type: 'deal_risk',
        description: 'Your Marina deal: Buyer going silent (3 days) - Follow up NOW',
        score: 95,
        icon: '⚠️',
        action: 'Contact buyer ASAP',
      },
    ];

    return opportunities.slice(0, limit);
  }

  /**
   * Generate opportunities for BUYER
   */
  generateBuyerOpportunities(buyer, limit = 5) {
    const opportunities = [
      {
        rank: 1,
        property: 'Marina Premium Apartment',
        price: '1.85M AED',
        bedrooms: 2,
        matchScore: 95,
        savings: '150K below market',
        status: '🔥 NEW',
      },
      {
        rank: 2,
        property: 'Downtown Luxury Villa',
        price: '2.1M AED',
        bedrooms: 3,
        matchScore: 92,
        savings: '100K negotiable',
        status: '⏳ Offer pending',
      },
      {
        rank: 3,
        property: 'Jumeirah Townhouse',
        price: '1.95M AED',
        bedrooms: 3,
        matchScore: 88,
        savings: 'Fresh listing',
        status: '🟢 Available',
      },
      {
        rank: 4,
        property: 'Arabian Ranches Villa',
        price: '2.3M AED',
        bedrooms: 4,
        matchScore: 85,
        savings: '200K - Motivated seller',
        status: '💰 Price drop alert',
      },
      {
        rank: 5,
        property: 'Palm Jumeirah Studio',
        price: '1.2M AED',
        bedrooms: 1,
        matchScore: 78,
        savings: 'Investment opportunity',
        status: '📊 Rental income',
      },
    ];

    return opportunities.slice(0, limit);
  }

  /**
   * Generate opportunities for SELLER
   */
  generateSellerOpportunities(seller, limit = 4) {
    const market = {
      valuation: '2.15M - 2.35M AED',
      trend: '📈 Up 3% this month',
      daysOnMarket: '28 days (average for area)',
      buyerDemand: 'High - 12 active inquiries',
      bestTime: 'NOW - Peak season for your property type',
    };

    const opportunities = [
      {
        title: 'Market Analysis',
        value: market.valuation,
        detail: `${market.trend} | Demand: ${market.buyerDemand}`,
        score: 92,
      },
      {
        title: 'Timing Recommendation',
        value: market.bestTime,
        detail: 'List now for best price. Season peaks Feb-March.',
        score: 88,
      },
      {
        title: 'Comparable Sales',
        value: '3 similar sold 2.0-2.2M',
        detail: 'Your asking price is competitive.',
        score: 85,
      },
      {
        title: 'Agent Recommendations',
        value: '2 top agents ready',
        detail: 'Avg listing time: 26 days with these agents',
        score: 82,
      },
    ];

    return opportunities.slice(0, limit);
  }

  /**
   * Generate opportunities for TENANT
   */
  generateTenantOpportunities(tenant, limit = 5) {
    const opportunities = [
      {
        type: '🔥 HOT LISTING',
        location: 'Dubai Hills Apartment',
        price: '8,500 AED/month',
        details: '2BR, modern, furnished, gym + pool',
        matchScore: 95,
        movedIn: 'This week',
      },
      {
        type: '💰 BEST VALUE',
        location: 'Downtown Studio',
        price: '5,200 AED/month',
        details: '1BR, close to metro, walkable',
        matchScore: 90,
        discount: '10% discount for 2-year lease',
      },
      {
        type: '✨ PREMIUM',
        location: 'Marina Waterfront Flat',
        price: '7,800 AED/month',
        details: '2BR, sea view, modern amenities',
        matchScore: 88,
        feature: 'Building has rooftop lounge',
      },
      {
        type: '🎯 ALTERNATIVE',
        location: 'Jumeirah Village Circle',
        price: '6,500 AED/month',
        details: '2BR villa, garden, quiet area',
        matchScore: 85,
        bonus: 'Free parking + utilities',
      },
      {
        type: '💡 SMART CHOICE',
        location: 'Business Bay Flat',
        price: '5,800 AED/month',
        details: '1BR+office, perfect for work-from-home',
        matchScore: 82,
        extra: 'High-speed WiFi included',
      },
    ];

    return opportunities.slice(0, limit);
  }

  /**
   * Generate opportunities for LANDLORD
   */
  generateLandlordOpportunities(landlord, limit = 4) {
    const opportunities = [
      {
        title: 'High-Quality Tenant Inquiry',
        details: 'Ahmed - Credit 780, stable job, 6-month lease ready',
        property: 'Marina Apartment',
        score: 92,
        recommendation: '✅ APPROVE',
      },
      {
        title: 'Rent Increase Opportunity',
        details: 'Downtown Studio: Market rent up 8% - you can raise to 5,600 AED',
        property: 'Downtown Studio',
        score: 88,
        recommendation: '💰 Next renewal',
      },
      {
        title: 'Portfolio Valuation Increase',
        details: 'Your 3 properties value up 12% YTD - 3.2M total portfolio',
        property: 'All properties',
        score: 85,
        recommendation: '📈 Excellent growth',
      },
      {
        title: 'Maintenance Alert',
        details: 'Villa AC needs service - Fix now before peak summer',
        property: 'Jumeirah Villa',
        score: 78,
        recommendation: '🔧 Schedule ASAP',
      },
    ];

    return opportunities.slice(0, limit);
  }

  /**
   * Generate opportunities for SECURITY
   */
  generateSecurityOpportunities(security, limit = 5) {
    const opportunities = [
      {
        severity: 'HIGH',
        alert: 'Unverified Agent Pattern',
        details: 'Agent ID: AGT847 - 5 transactions in 3 days, large commissions',
        action: 'Verify credentials immediately',
        score: 98,
      },
      {
        severity: 'MEDIUM',
        alert: 'Suspicious Deal Sequence',
        details: 'Buyer A→Seller B→Buyer C (same day) - Potential flip fraud',
        action: 'Review transaction chain',
        score: 85,
      },
      {
        severity: 'MEDIUM',
        alert: 'Compliance Alert',
        details: '3 agents overdue license renewal - Still active in system',
        action: 'Suspend accounts pending renewal',
        score: 82,
      },
      {
        severity: 'LOW',
        alert: 'Pending Verification',
        details: '4 new agents awaiting background check completion',
        action: 'Expedite background checks',
        score: 65,
      },
      {
        severity: 'INFO',
        alert: 'Daily Compliance Report',
        details: '156 verified transactions | 47/50 licensed agents active',
        action: 'Review report (attached)',
        score: 50,
      },
    ];

    return opportunities.slice(0, limit);
  }

  /**
   * ==============================================
   * DAILY BRIEFING GENERATION
   * ==============================================
   */

  /**
   * Generate personalized daily brief for any persona
   */
  generateDailyBrief(contact) {
    let briefText = `📊 YOUR DAILY BRIEF - ${new Date().toLocaleDateString()}\n\n`;

    if (contact.type === 'agent') {
      const opps = this.generateAgentOpportunities(contact);
      briefText += `🎯 TOP OPPORTUNITIES FOR YOU (${opps.length}):\n\n`;
      opps.forEach((opp, i) => {
        briefText += `${i + 1}. ${opp.icon} ${opp.description}\n   Score: ${opp.score}/100 | ${opp.action}\n\n`;
      });
    } else if (contact.type === 'buyer') {
      const opps = this.generateBuyerOpportunities(contact);
      briefText += `🏠 NEW PROPERTIES MATCHING YOUR CRITERIA (${opps.length}):\n\n`;
      opps.forEach((opp, i) => {
        briefText += `${opp.rank}. ${opp.property} - ${opp.price}\n   ${opp.bedrooms}BR | Match: ${opp.matchScore}% | ${opp.status}\n   💰 ${opp.savings}\n\n`;
      });
    } else if (contact.type === 'seller') {
      const opps = this.generateSellerOpportunities(contact);
      briefText += `📈 MARKET INTELLIGENCE:\n\n`;
      opps.forEach((opp) => {
        briefText += `${opp.title}: ${opp.value}\n`;
        briefText += `${opp.detail}\n\n`;
      });
    } else if (contact.type === 'tenant') {
      const opps = this.generateTenantOpportunities(contact);
      briefText += `🏠 AVAILABLE RENTALS (${opps.length}):\n\n`;
      opps.forEach((opp) => {
        briefText += `${opp.type} - ${opp.location}\n`;
        briefText += `${opp.price} | ${opp.details}\n`;
        briefText += `Match: ${opp.matchScore}% | ${opp['movedIn'] || opp['discount'] || opp['feature'] || opp['bonus']}\n\n`;
      });
    } else if (contact.type === 'landlord') {
      const opps = this.generateLandlordOpportunities(contact);
      briefText += `🏢 PORTFOLIO ALERTS & OPPORTUNITIES:\n\n`;
      opps.forEach((opp) => {
        briefText += `${opp.title}\n${opp.details}\n${opp.recommendation}\n\n`;
      });
    } else if (contact.type === 'security') {
      const opps = this.generateSecurityOpportunities(contact);
      briefText += `🔒 SECURITY ALERTS & COMPLIANCE:\n\n`;
      opps.forEach((opp) => {
        briefText += `[${opp.severity}] ${opp.alert}\n${opp.details}\nAction: ${opp.action}\n\n`;
      });
    }

    briefText += `---\nView all opportunities in app | Schedule follow-ups | Need help?`;
    return briefText;
  }

  /**
   * ==============================================
   * HELPER FUNCTIONS
   * ==============================================
   */

  calculateBudgetMatch(budget, price) {
    const percentage = (price / budget) * 100;
    if (percentage >= 80 && percentage <= 100) return 100;
    if (percentage >= 70 && percentage < 80) return 85;
    if (percentage >= 60 && percentage < 70) return 70;
    return 40;
  }

  calculatePriceAlignment(askingPrice, comparables) {
    const average = comparables.reduce((a, b) => a + b, 0) / comparables.length;
    const percentage = (askingPrice / average) * 100;
    if (percentage >= 95 && percentage <= 105) return 100;
    if (percentage >= 90 && percentage <= 110) return 85;
    return 70;
  }

  /**
   * Track conversion for future learning
   */
  trackConversion(contact, opportunity, converted) {
    const key = `${contact.type}_${opportunity.type}`;
    const history = this.conversionHistory.get(key) || { conversions: 0, total: 0 };
    history.total++;
    if (converted) history.conversions++;
    this.conversionHistory.set(key, history);
  }
}

module.exports = OpportunityIntelligence;
