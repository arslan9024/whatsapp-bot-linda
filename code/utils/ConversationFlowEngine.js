/**
 * 🎯 CONVERSATION FLOW ENGINE
 * 
 * Unified engine for managing context-aware, multi-turn conversations
 * across all 6 real estate persona types: Agent, Buyer, Seller, Tenant, Landlord, Security
 * 
 * Features:
 * - Persona-specific conversation flows
 * - Multi-turn context persistence
 * - Automatic next-step suggestions
 * - Time-based greeting optimization
 * - Intent tracking and analysis
 * 
 * Usage:
 * const engine = new ConversationFlowEngine();
 * const flow = engine.getFlowForPersona('buyer');
 * const response = flow.processMessage(userMessage, context);
 */

class ConversationFlowEngine {
  constructor() {
    this.flows = {
      agent: new AgentConversationFlow(),
      buyer: new BuyerConversationFlow(),
      seller: new SellerConversationFlow(),
      tenant: new TenantConversationFlow(),
      landlord: new LandlordConversationFlow(),
      security: new SecurityConversationFlow(),
    };
    this.contexts = new Map(); // phone -> context
    this.messageHistory = new Map(); // phone -> [messages]
  }

  /**
   * Get appropriate conversation flow for persona
   */
  getFlowForPersona(persona) {
    return this.flows[persona] || this.flows.buyer; // default to buyer
  }

  /**
   * Process incoming message and generate response
   */
  async processMessage(phoneNumber, message, persona) {
    try {
      // Get or create context for this user
      let context = this.contexts.get(phoneNumber) || {
        phoneNumber,
        persona,
        messageCount: 0,
        lastMessageTime: null,
        conversationState: 'greeting',
        collectedInfo: {},
        previousMessages: [],
      };

      // Update context
      context.messageCount++;
      context.lastMessageTime = new Date();
      context.previousMessages.push(message);

      // Get appropriate flow
      const flow = this.getFlowForPersona(persona);

      // Process message through flow
      const response = await flow.processMessage(message, context);

      // Update conversation state
      context.conversationState = response.nextState;
      context.collectedInfo = { ...context.collectedInfo, ...response.collectedInfo };

      // Store context
      this.contexts.set(phoneNumber, context);

      // Add to message history
      const history = this.messageHistory.get(phoneNumber) || [];
      history.push({ message, response, timestamp: new Date() });
      this.messageHistory.set(phoneNumber, history);

      return response;
    } catch (error) {
      console.error('❌ ConversationFlowEngine error:', error);
      return {
        text: "Sorry, I had an issue processing that. Could you rephrase?",
        nextState: 'waiting_for_input',
        collectedInfo: {},
      };
    }
  }

  /**
   * Get user context for multi-turn conversation tracking
   */
  getContext(phoneNumber) {
    return this.contexts.get(phoneNumber);
  }

  /**
   * Get message history for analysis
   */
  getHistory(phoneNumber) {
    return this.messageHistory.get(phoneNumber) || [];
  }

  /**
   * Clear context (useful for testing or reset)
   */
  clearContext(phoneNumber) {
    this.contexts.delete(phoneNumber);
    this.messageHistory.delete(phoneNumber);
  }
}

/**
 * 🏠 AGENT CONVERSATION FLOW
 * For real estate agents managing deals and clients
 */
class AgentConversationFlow {
  processMessage(message, context) {
    const state = context.conversationState;

    switch (state) {
      case 'greeting':
        return {
          text: this.getGreeting(context),
          nextState: 'awaiting_intent',
          collectedInfo: {},
        };

      case 'awaiting_intent':
        if (message.toLowerCase().includes('deal')) {
          return this.handleDealInquiry(message, context);
        } else if (message.toLowerCase().includes('client')) {
          return this.handleClientInquiry(message, context);
        } else if (message.toLowerCase().includes('market')) {
          return this.handleMarketInquiry(message, context);
        }
        return {
          text: "I can help with: Your deals, Client inquiries, or Market updates. What would you like to know?",
          nextState: 'awaiting_intent',
          collectedInfo: {},
        };

      case 'deal_details':
        return this.collectDealInfo(message, context);

      default:
        return {
          text: "How can I assist you today?",
          nextState: 'awaiting_intent',
          collectedInfo: {},
        };
    }
  }

  getGreeting(context) {
    const hour = new Date().getHours();
    let timeGreeting = "Good morning";
    if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
    if (hour >= 17) timeGreeting = "Good evening";

    return `${timeGreeting}! 👨‍💼 Ready to close some deals today?\n\nI can help you with:\n✅ Your active deals\n✅ Client inquiries\n✅ Market intelligence`;
  }

  handleDealInquiry(message, context) {
    return {
      text: "Your Deals (Top 3):\n1. Marina Villa - Offer: 2.5M AED ⏳\n2. Downtown Apt - Pending docs 📄\n3. Jumeirah Villa - Viewing scheduled tomorrow 🗓️\n\nWhich deal would you like details on?",
      nextState: 'deal_details',
      collectedInfo: { inquiryType: 'deals' },
    };
  }

  handleClientInquiry(message, context) {
    return {
      text: "You have 5 active inquiries:\n🔴 3 buyers waiting for property matches\n🟡 1 seller awaiting valuation\n🟢 1 landlord with tenant application\n\nLet me connect you with your hottest leads...",
      nextState: 'awaiting_intent',
      collectedInfo: { inquiryType: 'clients' },
    };
  }

  handleMarketInquiry(message, context) {
    return {
      text: "📊 Market Update:\nMarina: ↑ 3% this week\nDowntown: ↓ 1.5% (buyer opportunity!)\nJumeirah: Stable\n\nWhere are most of your deals?",
      nextState: 'awaiting_intent',
      collectedInfo: { inquiryType: 'market' },
    };
  }

  collectDealInfo(message, context) {
    return {
      text: "Got it. Recording your deal details. I'll flag opportunities and send you priority reminders. ✅",
      nextState: 'awaiting_intent',
      collectedInfo: { dealInfo: message },
    };
  }
}

/**
 * 🏡 BUYER CONVERSATION FLOW
 * For property buyers searching for their dream home
 */
class BuyerConversationFlow {
  processMessage(message, context) {
    const state = context.conversationState;

    switch (state) {
      case 'greeting':
        return {
          text: this.getGreeting(),
          nextState: 'collecting_criteria',
          collectedInfo: {},
        };

      case 'collecting_criteria':
        return this.collectBuyerCriteria(message, context);

      case 'showing_matches':
        if (message.toLowerCase().includes('yes') || message.toLowerCase().includes('interested')) {
          return this.handleViewingRequest(message, context);
        }
        return {
          text: "Would you like to schedule a viewing for any of these properties?",
          nextState: 'showing_matches',
          collectedInfo: {},
        };

      default:
        return {
          text: "What type of property are you looking for?",
          nextState: 'collecting_criteria',
          collectedInfo: {},
        };
    }
  }

  getGreeting() {
    return `🏠 Welcome to Your Property Search!\n\nLet's find your dream home. Tell me:\n• Budget (AED)\n• Location preference\n• Number of bedrooms\n• Move-in timeline`;
  }

  collectBuyerCriteria(message, context) {
    // Parse message for criteria
    context.collectedInfo = {
      ...context.collectedInfo,
      userInput: message,
    };

    return {
      text: `Perfect! I found these matches:\n\n🏆 TOP MATCHES:\n1. Marina Apartment - 1.8M AED (95% match) ⭐⭐⭐⭐⭐\n2. Downtown Villa - 2.1M AED (92% match) ⭐⭐⭐⭐\n3. Jumeirah Townhouse - 1.95M AED (88% match) ⭐⭐⭐⭐\n\nYour Deal Code: AB4782 (valid for 15 min)\n\nWould you like to schedule a viewing?`,
      nextState: 'showing_matches',
      collectedInfo: context.collectedInfo,
    };
  }

  handleViewingRequest(message, context) {
    return {
      text: `✅ Viewing scheduled!\n\nYour agent will contact you within 2 hours to confirm the time and location.\n\nKeep your Deal Code handy: AB4782\n\nIs there anything else you'd like to know?`,
      nextState: 'awaiting_intent',
      collectedInfo: { viewingRequested: true, code: 'AB4782' },
    };
  }
}

/**
 * 🏪 SELLER CONVERSATION FLOW
 * For property sellers looking to list or get valuation
 */
class SellerConversationFlow {
  processMessage(message, context) {
    const state = context.conversationState;

    switch (state) {
      case 'greeting':
        return {
          text: this.getGreeting(),
          nextState: 'awaiting_intent',
          collectedInfo: {},
        };

      case 'awaiting_intent':
        if (message.toLowerCase().includes('valuation') || message.toLowerCase().includes('value')) {
          return this.handleValuation(message, context);
        } else if (message.toLowerCase().includes('list') || message.toLowerCase().includes('sell')) {
          return this.handleListing(message, context);
        }
        return {
          text: "Would you like:\n📊 A market valuation of your property?\n📋 Help listing your property?",
          nextState: 'awaiting_intent',
          collectedInfo: {},
        };

      case 'collecting_property_info':
        return this.collectPropertyInfo(message, context);

      default:
        return {
          text: "Tell me about your property",
          nextState: 'collecting_property_info',
          collectedInfo: {},
        };
    }
  }

  getGreeting() {
    return `🏘️ Ready to Sell?\n\nI'll help you:\n✅ Get market valuation\n✅ List with top agents\n✅ Track offers\n✅ Close faster\n\nWhat would you like to know?`;
  }

  handleValuation(message, context) {
    return {
      text: `To value your property, I need:\n\n1️⃣ Property type (Villa, Apartment, Townhouse)\n2️⃣ Location (e.g., Marina, Downtown, Jumeirah)\n3️⃣ Size (Bedrooms/Sq Ft)\n4️⃣ Age/Condition\n\nTell me about your property:`,
      nextState: 'collecting_property_info',
      collectedInfo: { requestType: 'valuation' },
    };
  }

  handleListing(message, context) {
    return {
      text: `Great! To list your property, tell me:\n\n1️⃣ Property address\n2️⃣ Asking price\n3️⃣ Quick description (type, size, features)\n4️⃣ Timeline (urgent/flexible)\n\nLet's get you listed!`,
      nextState: 'collecting_property_info',
      collectedInfo: { requestType: 'listing' },
    };
  }

  collectPropertyInfo(message, context) {
    return {
      text: `Based on your property:\n\n📊 ESTIMATED VALUATION: 2.1-2.3 Million AED\n📈 Market Trend: Stable, good time to list\n🎯 Estimated Timeline: 30-45 days\n\n✅ I've connected you with 2 top agents specializing in your area.\n\nThey'll contact you within 2 hours with a detailed market analysis.`,
      nextState: 'awaiting_intent',
      collectedInfo: { propertyInfo: message },
    };
  }
}

/**
 * 🏢 TENANT CONVERSATION FLOW
 * For renters searching for apartments/villas
 */
class TenantConversationFlow {
  processMessage(message, context) {
    const state = context.conversationState;

    switch (state) {
      case 'greeting':
        return {
          text: this.getGreeting(),
          nextState: 'collecting_criteria',
          collectedInfo: {},
        };

      case 'collecting_criteria':
        return this.collectTenantCriteria(message, context);

      case 'showing_rentals':
        if (message.toLowerCase().includes('yes') || message.toLowerCase().includes('interested')) {
          return this.handleRentalRequest(message, context);
        }
        return {
          text: "Would you like to schedule a viewing for any of these rentals?",
          nextState: 'showing_rentals',
          collectedInfo: {},
        };

      default:
        return {
          text: "What are you looking for in a rental?",
          nextState: 'collecting_criteria',
          collectedInfo: {},
        };
    }
  }

  getGreeting() {
    return `🏠 Find Your Perfect Rental!\n\nTell me:\n💰 Budget/month (AED)\n📍 Preferred location\n🛏️ Number of bedrooms\n📅 When do you need to move?`;
  }

  collectTenantCriteria(message, context) {
    context.collectedInfo = { ...context.collectedInfo, userInput: message };

    return {
      text: `Perfect! Here are your best rental options:\n\n🔥 TOP MATCHES:\n1. Dubai Hills Apartment - 8,500 AED/mo (95% fit) ⭐⭐⭐⭐⭐\n2. Downtown Studio - 5,200 AED/mo (90% fit) ⭐⭐⭐⭐\n3. Marina Flat - 7,800 AED/mo (88% fit) ⭐⭐⭐⭐\n\nYour Code: TN7692\n\nReady to tour any of these?`,
      nextState: 'showing_rentals',
      collectedInfo: context.collectedInfo,
    };
  }

  handleRentalRequest(message, context) {
    return {
      text: `✅ Viewing scheduled!\n\nLandlord will contact you within 4 hours to arrange the tour.\n\nYour Code: TN7692 (valid 15 min)\n\nAnything else you need?`,
      nextState: 'awaiting_intent',
      collectedInfo: { viewingRequested: true, code: 'TN7692' },
    };
  }
}

/**
 * 🏢 LANDLORD CONVERSATION FLOW
 * For property owners managing rentals and tenant inquiries
 */
class LandlordConversationFlow {
  processMessage(message, context) {
    const state = context.conversationState;

    switch (state) {
      case 'greeting':
        return {
          text: this.getGreeting(),
          nextState: 'awaiting_intent',
          collectedInfo: {},
        };

      case 'awaiting_intent':
        if (message.toLowerCase().includes('tenant')) {
          return this.handleTenantInquiry(message, context);
        } else if (message.toLowerCase().includes('maintenance') || message.toLowerCase().includes('repair')) {
          return this.handleMaintenance(message, context);
        } else if (message.toLowerCase().includes('income') || message.toLowerCase().includes('rent')) {
          return this.handleIncomeCheck(message, context);
        }
        return {
          text: "I can help with:\n👥 Tenant inquiries\n🔧 Maintenance requests\n💰 Rent & income tracking\n\nWhat do you need?",
          nextState: 'awaiting_intent',
          collectedInfo: {},
        };

      case 'tenant_selection':
        return this.handleTenantSelection(message, context);

      default:
        return {
          text: "What would you like to manage today?",
          nextState: 'awaiting_intent',
          collectedInfo: {},
        };
    }
  }

  getGreeting() {
    return `🏢 Landlord Dashboard\n\nYour Properties:\n📍 Marina Apartment (3 inquiries) 🔴\n📍 Downtown Studio (2 inquiries) 🟡\n📍 Jumeirah Villa (tenant active) 🟢\n\nWhat would you like to check?`;
  }

  handleTenantInquiry(message, context) {
    return {
      text: `You have 5 pending tenant inquiries!\n\n🔴 PRIORITY:\n• Ahmed (2BR Marina) - Wants viewing TODAY\n• Fatima (Studio Downtown) - Credit check passed\n\n🟡 FOLLOW-UP:\n• Mohammed (Villa) - Pending reference\n\nWhich property would you like to manage?`,
      nextState: 'tenant_selection',
      collectedInfo: { inquiryType: 'tenants' },
    };
  }

  handleMaintenance(message, context) {
    return {
      text: `📋 Pending Maintenance:\n• Marina Apt: AC filter change (scheduled)\n• Downtown Studio: Plumbing repair (urgent)\n• Villa: Painting touch-up (non-urgent)\n\nWhich would you like to prioritize?`,
      nextState: 'awaiting_intent',
      collectedInfo: { inquiryType: 'maintenance' },
    };
  }

  handleIncomeCheck(message, context) {
    return {
      text: `💰 INCOME SUMMARY (This Month):\n• Marina Apt: 9,500 AED ✅\n• Downtown Studio: 5,200 AED ✅\n• Villa: 12,000 AED (due in 3 days) ⏳\n\nTotal Expected: 26,700 AED\nTotal Received: 14,700 AED\n\nNeed anything else?`,
      nextState: 'awaiting_intent',
      collectedInfo: { inquiryType: 'income' },
    };
  }

  handleTenantSelection(message, context) {
    return {
      text: `✅ I've forwarded Ahmed's application. He's interested in viewing tomorrow at 3 PM.\n\nConfirm viewing?`,
      nextState: 'awaiting_intent',
      collectedInfo: { tenantSelected: message },
    };
  }
}

/**
 * 🔒 SECURITY/ADMIN CONVERSATION FLOW
 * For system admins and security personnel
 */
class SecurityConversationFlow {
  processMessage(message, context) {
    const state = context.conversationState;

    switch (state) {
      case 'greeting':
        return {
          text: this.getGreeting(),
          nextState: 'awaiting_intent',
          collectedInfo: {},
        };

      case 'awaiting_intent':
        if (message.toLowerCase().includes('agent') || message.toLowerCase().includes('verify')) {
          return this.handleAgentVerification(message, context);
        } else if (message.toLowerCase().includes('suspicious') || message.toLowerCase().includes('alert')) {
          return this.handleSuspiciousActivity(message, context);
        } else if (message.toLowerCase().includes('compliance') || message.toLowerCase().includes('report')) {
          return this.handleComplianceCheck(message, context);
        }
        return {
          text: "I can help with:\n✅ Agent verification\n⚠️ Suspicious activity flags\n📊 Compliance reports\n\nWhat do you need?",
          nextState: 'awaiting_intent',
          collectedInfo: {},
        };

      case 'investigation':
        return this.collectInvestigationInfo(message, context);

      default:
        return {
          text: "What security issue needs attention?",
          nextState: 'awaiting_intent',
          collectedInfo: {},
        };
    }
  }

  getGreeting() {
    return `🔒 SECURITY DASHBOARD\n\n⚠️ ALERTS:\n• 2 unverified agents active\n• 1 suspicious transaction pattern\n• 3 pending complaints\n\n✅ SESSION: Admin001 | Level: Full Access\n\nWhat do you need to review?`;
  }

  handleAgentVerification(message, context) {
    return {
      text: `Agent Verification Request:\n\n📋 Please provide:\n1. Agent ID or Phone Number\n2. Agency name (if known)\n3. Reason for verification\n\nI'll run a full background check.`,
      nextState: 'investigation',
      collectedInfo: { verifyType: 'agent' },
    };
  }

  handleSuspiciousActivity(message, context) {
    return {
      text: `⚠️ SUSPICIOUS ACTIVITY REPORT:\n\n📝 Please describe:\n1. What activity looks suspicious?\n2. Which party is involved (agent/buyer/seller/etc)?\n3. Contact details\n4. Evidence/transaction details\n\nI'll flag this immediately.`,
      nextState: 'investigation',
      collectedInfo: { reportType: 'suspicious' },
    };
  }

  handleComplianceCheck(message, context) {
    return {
      text: `📊 COMPLIANCE STATUS:\n\n✅ Agents with valid licenses: 47/50\n✅ Verified transactions: 156\n⚠️ Pending verification: 4\n🔴 Flagged for review: 2\n\nGenerate full report?`,
      nextState: 'awaiting_intent',
      collectedInfo: { reportType: 'compliance' },
    };
  }

  collectInvestigationInfo(message, context) {
    return {
      text: `✅ Report submitted and logged.\n\nReference: SEC-${Date.now()}\n\nOur security team will investigate within 24 hours and contact you with results.`,
      nextState: 'awaiting_intent',
      collectedInfo: { investigation: message },
    };
  }
}

module.exports = ConversationFlowEngine;
