/**
 * 📝 CONVERSATION TEMPLATES & MESSAGE LIBRARY
 * 
 * Professional, personalized message templates for all situations
 * Supports dynamic variable injection: {{name}}, {{property}}, {{price}}, etc.
 * 
 * Categories:
 * - Time-based greetings (morning, afternoon, evening, night)
 * - Persona-specific greetings
 * - First message responses
 * - Follow-up templates
 * - Alert notifications
 * - Deal milestone messages
 * - Error handling
 * - Sentiment-based responses
 */

class ConversationTemplates {
  constructor() {
    this.templates = this.initializeTemplates();
  }

  /**
   * Initialize all message templates
   */
  initializeTemplates() {
    return {
      // ============ TIME-BASED GREETINGS ============
      morning: {
        agent: "☀️ Good morning, {{name}}! Ready to close deals today? You have {{dealCount}} active properties.",
        buyer: "☀️ Good morning! Finding your dream home? Let's check what's new this morning.",
        seller: "☀️ Good morning! Market looks good today. Any questions about your listing?",
        tenant: "☀️ Good morning! Found any rentals you like? I have fresh listings.",
        landlord: "☀️ Good morning! Portfolio update: {{propertyCount}} properties, {{tenantCount}} tenants.",
        security: "☀️ Good morning! Security check: {{alertCount}} alerts pending review.",
      },

      afternoon: {
        agent: "🌞 Afternoon update! {{dealCount}} deals active, {{clientCount}} clients waiting.",
        buyer: "🌞 Afternoon check! New properties matching your criteria just listed.",
        seller: "🌞 Afternoon! {{inquiryCount}} buyers interested in your property.",
        tenant: "🌞 Afternoon! {{listingCount}} vacancies matching your budget just opened.",
        landlord: "🌞 Afternoon! {{maintenanceCount}} maintenance requests pending attention.",
        security: "🌞 Afternoon security update: {{suspiciousCount}} suspicious activities flagged.",
      },

      evening: {
        agent: "🌙 Evening! Wrap-up: {{closedCount}} deals closed today, {{pendingCount}} pending.",
        buyer: "🌙 Evening! Let me know if you want to schedule viewings for today's matches.",
        seller: "🌙 Evening! {{offersCount}} offers received on your property!",
        tenant: "🌙 Evening! {{newListingsCount}} new rentals available in your area.",
        landlord: "🌙 Evening! {{rentCollectedCount}} rent payments received today.",
        security: "🌙 Evening security report: All clear. {{verifiedCount}} agents verified.",
      },

      night: {
        agent: "🌙 Good night! Sleep well. See you tomorrow for more deals!",
        buyer: "🌙 Good night! Sweet dreams about {{topProperty}}!",
        seller: "🌙 Good night! Your property is visible to {{visitorCount}} buyers tomorrow.",
        tenant: "🌙 Good night! Viewing {{viewingCount}} properties tomorrow. Rest well!",
        landlord: "🌙 Good night! Your properties are earning while you sleep 💤",
        security: "🌙 Good night! System secure. Night shift monitoring active.",
      },

      // ============ FIRST MESSAGE RESPONSES ============
      firstMessageReply: {
        agent: "Welcome to Real Estate AI! 🤖\n\nI'm here to help you close deals faster.\n\n👨‍💼 I can:\n✅ Track your deals\n✅ Find hot leads\n✅ Calculate commissions\n✅ Connect with buyers/tenants\n\nWhat would you like to do?",
        buyer: "Welcome to Property Search! 🏠\n\nLet's find your dream home!\n\n🎯 I can:\n✅ Find properties matching your criteria\n✅ Schedule viewings\n✅ Make offers\n✅ Provide market insights\n\nWhat's your budget?",
        seller: "Welcome to Property Selling! 📋\n\nLet's get you the best price!\n\n💰 I can:\n✅ Get market valuation\n✅ List your property\n✅ Track offers\n✅ Suggest pricing strategy\n\nTell me about your property.",
        tenant: "Welcome to Rental Search! 🏠\n\nLet's find your perfect place!\n\n🔑 I can:\n✅ Find rentals in your budget\n✅ Schedule viewings\n✅ Apply for properties\n✅ Check landlord reviews\n\nWhat's your budget?",
        landlord: "Welcome to Landlord Dashboard! 🏢\n\nManage your properties effortlessly!\n\n📊 I can:\n✅ Track tenant inquiries\n✅ Collect rent\n✅ Schedule maintenance\n✅ Monitor portfolio\n\nHow can I help?",
        security: "🔒 SECURITY ADMIN PORTAL\n\nAccess: AUTHORIZED\n\n⚠️ Today's alerts: {{alertCount}}\n✅ Verified agents: {{agentCount}}\n📊 Compliance: {{complianceLevel}}\n\nWhat would you like to review?",
      },

      // ============ FOLLOW-UP TEMPLATES ============
      followUp: {
        noResponse2h: "Just checking in! {{name}}, are you still interested in {{property}}?",
        noResponseDaily: "Haven't heard from you in a while! 🔔 The {{property}} is getting hot offers. Interested?",
        viewingReminder: "📅 REMINDER: Your viewing is {{timeUntil}}!\n📍 {{property}}\n🕐 {{viewingTime}}\n\nSee you soon!",
        offerPending: "⏳ Your offer on {{property}} is still pending.\nSeller response expected within {{hoursLeft}} hours.",
        maintenanceUpdate: "🔧 {{issue}} at {{property}} is {{status}}.\nETA: {{completionTime}}",
        rentPaymentDue: "💳 RENT DUE: {{dueDate}} for {{property}}\nAmount: {{rentAmount}} AED",
        leaseExpiring: "📝 LEASE EXPIRING: Your lease at {{property}} expires in {{daysLeft}} days.\nRenewal required.",
      },

      // ============ ALERT NOTIFICATIONS ============
      alerts: {
        hotProperty: "🔥 HOT PROPERTY ALERT!\n{{property}}\n💰 {{price}} AED\n📍 {{location}}\n⭐ {{matchScore}}% match for you!\n\nViewings: {{viewingCount}} scheduled\nOffers: {{offerCount}} pending\n\n⏰ Act fast!",
        priceDropAlert: "💰 PRICE DROP ALERT!\n{{property}}\nOld Price: {{oldPrice}} AED\nNew Price: {{newPrice}} AED\n💡 {{savingsAmount}} AED savings!\n\nThis is a great deal! Schedule viewing?",
        newListing: "🆕 NEW LISTING!\n{{property}}\n👥 {{agentName}} ({{agency}})\n💰 {{price}} AED\n📍 {{location}}\n🛏️ {{bedrooms}} BR | {{size}} sqft\n\n⭐ {{matchScore}}% match for you!",
        suspiciousActivity: "⚠️ SECURITY ALERT\n\nSuspicious activity detected:\n{{activityDescription}}\n\n🔍 Status: Under Investigation\nRef: {{alertId}}\n\nDo not proceed with transactions involving {{involvedParty}}",
        maintenanceNeeded: "🔧 MAINTENANCE ALERT\n\nYour {{property}} needs attention:\n{{issue}}\n\nSchedule technician visit?\nEstimated cost: {{cost}} AED",
        tenantComplaint: "⚠️ TENANT COMPLAINT\n\nProperty: {{property}}\nTenant: {{tenantName}}\nIssue: {{issue}}\n\nAction required: {{actionRequired}}\nTimeline: {{timeline}}",
      },

      // ============ DEAL MILESTONE MESSAGES ============
      dealMilestones: {
        offerAccepted: "🎉 OFFER ACCEPTED!\n\n✅ {{property}}\nYour Offer: {{offerAmount}} AED\n✅ Seller agreed!\n\n📄 Next step: Prepare documents\n⏰ Timeline: {{settlementDays}} days to close\n\nCongratulations!",
        dealsClosing: "🏆 DEAL CLOSING!\n\n✅ {{property}}\nFinal Price: {{finalPrice}} AED\n✅ All documents signed\n\n📋 Registration status: {{regStatus}}\n🔑 Keys transfer: {{keyTransferTime}}\n\nYour new home is ready!",
        commissionEarned: "💰 COMMISSION EARNED!\n\n✅ Deal Closed\n💵 Commission: {{commissionAmount}} AED\n✅ Credited to account\n\nNext milestone:\n🎯 {{unitsUntilBonus}} more deals for {{bonusAmount}} bonus!",
        rentalApproved: "✅ RENTAL APPLICATION APPROVED!\n\n🎉 {{property}}\n💰 Monthly rent: {{rentAmount}} AED\n📝 Lease: {{leaseLength}} months\n\n🔑 Move-in date: {{moveInDate}}\n👤 Landlord: {{landlordName}}\n\nWelcome home!",
        propertyListed: "✅ PROPERTY LISTED!\n\n🏘️ {{property}}\n💰 List price: {{listPrice}} AED\n✨ Listed since: {{listDate}}\n\n👥 Interest: {{inquiryCount}} inquiries\n🗓️ Viewings: {{viewingCount}} scheduled\n\nStatus: {{marketStatus}}",
      },

      // ============ ERROR & RECOVERY MESSAGES ============
      errors: {
        timeout: "⏱️ Took too long to respond. Let's start over. What can I help with?",
        unclear: "Sorry, I didn't understand that. 🤔\n\nCan you rephrase? Or type !help for commands.",
        systemError: "Oops! Something went wrong. 😟\n\nPlease try again in a moment.",
        noData: "I couldn't find any {{dataType}} for you.\n\nTry registering or providing more details.",
        unauthorized: "⛔ Access denied. You don't have permission for this action.",
        invalidCode: "❌ Incorrect code or code expired.\n\nRequest a new one with !my-code",
      },

      // ============ SENTIMENT-BASED RESPONSES ============
      sentiment: {
        excited: "🎉 I love your enthusiasm!\n{{responseContent}}",
        frustrated: "😞 I understand your frustration.\n{{responseContent}}\n\nHow can I help resolve this?",
        uncertain: "🤔 Not sure? Let me help!\n{{responseContent}}\n\nWould you like more details?",
        neutral: "{{responseContent}}",
        satisfied: "😊 Great! Glad I could help.\n{{responseContent}}\n\nAnything else?",
      },

      // ============ SPECIAL OCCASIONS ============
      special: {
        weekendGreeting: "🎉 Weekend vibes! Ready to catch up on property news?",
        fridayMessage: "🎊 Almost weekend! Quick property update before you relax?",
        monthlyReport: "📊 MONTHLY REPORT\n\n{{monthName}} Summary:\n{{reportContent}}\n\nGreat progress! Keep it up! 🚀",
        anniversary: "🎂 {{eventName}} ANNIVERSARY!\n\nThank you for {{yearsActive}} years of being with us!\n{{specialOffer}}",
        holidayMessage: "🎄 Happy {{holiday}}!\n\nEnjoy time with family. We're here when you need us.",
      },

      // ============ QUICK REPLIES ============
      quickReplies: {
        yes: "✅ Got it! Processing your request...",
        no: "❌ Understood. What would you like instead?",
        more: "📌 Want to see more? Coming right up...",
        stop: "⏹️ Stopping notifications. Say !help to resume.",
        skip: "⏭️ Skipping. What's next?",
      },
    };
  }

  /**
   * Get template and inject variables
   * Usage: getTemplate('morning', 'agent', {name: 'Ahmed', dealCount: 5})
   */
  getTemplate(category, persona, variables = {}) {
    try {
      const template = this.templates[category]?.[persona] || this.templates[category]?.general;
      if (!template) {
        return "How can I help you today?";
      }

      // Inject variables
      let message = template;
      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        message = message.replace(regex, variables[key]);
      });

      return message;
    } catch (error) {
      console.error('Template error:', error);
      return "How can I help you today?";
    }
  }

  /**
   * Get time-based greeting
   */
  getTimeBasedGreeting(persona) {
    const hour = new Date().getHours();
    let timeKey = 'afternoon';

    if (hour < 12) timeKey = 'morning';
    else if (hour < 17) timeKey = 'afternoon';
    else if (hour < 21) timeKey = 'evening';
    else timeKey = 'night';

    return this.getTemplate(timeKey, persona);
  }

  /**
   * Get context-aware response based on sentiment
   */
  getSentimentResponse(sentiment, content) {
    const wrapper = this.templates.sentiment[sentiment] || this.templates.sentiment.neutral;
    return wrapper.replace('{{responseContent}}', content);
  }

  /**
   * Format alert message
   */
  formatAlert(alertType, data) {
    const alertTemplate = this.templates.alerts[alertType];
    if (!alertTemplate) return "Alert: Check your account";

    let message = alertTemplate;
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, data[key]);
    });

    return message;
  }

  /**
   * Format deal milestone message
   */
  formatMilestone(milestoneType, data) {
    const milestone = this.templates.dealMilestones[milestoneType];
    if (!milestone) return "Milestone reached!";

    let message = milestone;
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, data[key]);
    });

    return message;
  }

  /**
   * Get error message
   */
  getErrorMessage(errorType, context = {}) {
    const errorMsg = this.templates.errors[errorType] || this.templates.errors.systemError;
    return this.getTemplate('errors', errorType, context) || errorMsg;
  }

  /**
   * Get quick reply options
   */
  getQuickReplyOptions(context) {
    return [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
      { label: 'More', value: 'more' },
      { label: 'Help', value: 'help' },
    ];
  }
}

module.exports = ConversationTemplates;
