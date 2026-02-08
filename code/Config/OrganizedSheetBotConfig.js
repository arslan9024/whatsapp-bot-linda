/**
 * ============================================================================
 * BOT CONFIG - ORGANIZED SHEET AS PRIMARY DATABASE
 * ============================================================================
 * 
 * Configuration file for Linda Bot to use the Akoya-Oxygen-2023-Organized
 * sheet as the primary database for:
 * - Lead data
 * - Contact information
 * - Property details
 * - Financial data
 * 
 * Features:
 * - Auto-write new leads back to sheet
 * - Automatic deduplication
 * - Real-time updates
 * - Analytics & reporting
 * 
 * ============================================================================
 */

export const BOT_CONFIG = {
  // ============================================================================
  // PRIMARY DATABASE - ORGANIZED SHEET
  // ============================================================================
  DATABASE: {
    // Main organized sheet that serves as live database
    ORGANIZED_SHEET: {
      id: '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk',
      name: 'Akoya-Oxygen-2023-Organized',
      tab: 'Sheet1',
      description: 'Live database with deduplicated and organized lead data',
      recordCount: 10383,
      status: 'ACTIVE',
      lastUpdated: '2026-02-08T10:34:48Z'
    },

    // Legacy/backup sheet (for reference only)
    ORIGINAL_SHEET: {
      id: '1wBX2zhUaBg082BUmGCvqCSPI6w8eDJFtxZAsH2LjiaY',
      name: 'Oxygen2023',
      tab: 'Sheet1',
      description: 'Original raw data (backup only)',
      recordCount: 10433,
      status: 'ARCHIVED',
      readOnly: true
    }
  },

  // ============================================================================
  // WRITE-BACK CONFIGURATION
  // ============================================================================
  WRITE_BACK: {
    enabled: true,
    targetSheet: '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk',
    autoAppend: true,
    batchSize: 100,
    validateBeforeWrite: true,
    assignCodes: true,
    codeFormat: {
      properties: 'P###',  // e.g., P001
      contacts: 'C###',    // e.g., C001
      financial: 'F###'    // e.g., F001
    },
    fieldsToCapture: [
      'timestamp',
      'source',
      'name',
      'phone',
      'email',
      'whatsapp',
      'location',
      'property_type',
      'budget',
      'status'
    ]
  },

  // ============================================================================
  // ANALYTICS & REPORTING
  // ============================================================================
  ANALYTICS: {
    enabled: true,
    reportFrequency: 'daily', // daily, weekly, monthly
    reportTime: '09:00',
    metrics: [
      'total_records',
      'daily_leads',
      'conversion_rate',
      'location_distribution',
      'contact_info_completeness',
      'data_quality_score'
    ],
    storage: {
      type: 'google_sheets',
      reportSheet: 'Analytics',
      autoCreate: true
    }
  },

  // ============================================================================
  // DATA QUALITY RULES
  // ============================================================================
  DATA_QUALITY: {
    deduplication: {
      enabled: true,
      method: 'exact_match', // exact_match, fuzzy_match, hybrid
      fuzzyThreshold: 0.85,
      rules: [
        'phone_number_normalization',
        'whitespace_trim',
        'case_normalization',
        'duplicate_detection'
      ]
    },
    validation: {
      enabled: true,
      requiredFields: ['phone', 'location'],
      phoneValidation: true,
      emailValidation: true
    },
    fillRate: {
      minimumAcceptable: 60, // percentage
      warningThreshold: 70
    }
  },

  // ============================================================================
  // BOT BEHAVIOR
  // ============================================================================
  BOT_BEHAVIOR: {
    // When a new lead comes in
    onNewLead: {
      checkDuplicates: true,
      assignCode: true,
      writeToSheet: true,
      notifyAdmin: false,
      aiAnalysis: true
    },

    // Periodic sync with sheet
    periodicSync: {
      enabled: true,
      intervalMinutes: 60,
      syncCreatedLeads: true,
      syncReplies: true,
      fetchLatestData: true
    },

    // Auto-reply configuration
    autoReply: {
      enabled: true,
      useSheetData: true,
      contextLookup: true,
      matchingFields: ['location', 'property_type', 'budget']
    }
  },

  // ============================================================================
  // API ENDPOINTS
  // ============================================================================
  API_ENDPOINTS: {
    readOrganized: {
      method: 'GET',
      path: '/api/sheet/organized',
      description: 'Fetch all organized lead data'
    },
    writeNewLead: {
      method: 'POST',
      path: '/api/sheet/leads',
      description: 'Write new lead to organized sheet'
    },
    getAnalytics: {
      method: 'GET',
      path: '/api/analytics/report',
      description: 'Get latest analytics report'
    },
    searchLeads: {
      method: 'GET',
      path: '/api/sheet/search',
      description: 'Search leads in organized sheet'
    },
    updateLead: {
      method: 'PUT',
      path: '/api/sheet/leads/:id',
      description: 'Update existing lead'
    }
  },

  // ============================================================================
  // LOGGING & MONITORING
  // ============================================================================
  LOGGING: {
    enabled: true,
    level: 'info', // debug, info, warn, error
    logWrites: true,
    logReads: false,
    logDuplicates: true,
    storage: {
      type: 'file',
      path: './logs/bot.log'
    }
  },

  // ============================================================================
  // PERFORMANCE & LIMITS
  // ============================================================================
  PERFORMANCE: {
    readCache: {
      enabled: true,
      ttlMinutes: 30
    },
    batchWriteLimit: 100,
    requestTimeout: 30000,
    maxConcurrentRequests: 5
  },

  // ============================================================================
  // MESSAGES & COMMUNICATION
  // ============================================================================
  MESSAGES: {
    leadReceivedTemplate: `
Hi {{name}},

Thank you for your interest! We've received your inquiry about properties in {{location}}.

Your reference code: {{code}}

We'll analyze your requirements and get back to you within 24 hours.

Best regards,
Linda Bot 🤖
    `,
    
    leadConfirmedTemplate: `
We have a few great options that match your criteria ({{property_type}} in {{location}} with budget {{budget}}).

Would you like to:
1. See available properties
2. Connect with an agent
3. Get more information
    `,

    followUpTemplate: `
Hi {{name}}, just checking in! Have you had a chance to review the properties we sent? Let me know if you have any questions.
    `
  },

  // ============================================================================
  // COLUMN MAPPING
  // ============================================================================
  COLUMN_MAPPING: {
    code: 0,
    timestamp: 1,
    name: 2,
    phone: 3,
    email: 4,
    whatsapp: 5,
    location: 6,
    propertyType: 7,
    bedrooms: 8,
    sqft: 9,
    budget: 10,
    maxBudget: 11,
    source: 12,
    status: 13,
    notes: 14,
    agentAssigned: 15,
    followUpDate: 16
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

export async function initializeBotConfig() {
  console.log('🔧 Initializing Linda Bot with Organized Sheet Configuration...');
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           LINDA BOT - ACTIVE CONFIGURATION                     ║
╚════════════════════════════════════════════════════════════════╝

🗄️  PRIMARY DATABASE
    Sheet: ${BOT_CONFIG.DATABASE.ORGANIZED_SHEET.name}
    Records: ${BOT_CONFIG.DATABASE.ORGANIZED_SHEET.recordCount}
    Status: ${BOT_CONFIG.DATABASE.ORGANIZED_SHEET.status}

✍️  WRITE-BACK
    Enabled: ${BOT_CONFIG.WRITE_BACK.enabled}
    Auto-append: ${BOT_CONFIG.WRITE_BACK.autoAppend}
    Auto-code assignment: ${BOT_CONFIG.WRITE_BACK.assignCodes}

📊 ANALYTICS
    Enabled: ${BOT_CONFIG.ANALYTICS.enabled}
    Report frequency: ${BOT_CONFIG.ANALYTICS.reportFrequency}

🤖 BOT BEHAVIOR
    Auto-duplicate detection: ${BOT_CONFIG.BOT_BEHAVIOR.onNewLead.checkDuplicates}
    AI analysis: ${BOT_CONFIG.BOT_BEHAVIOR.onNewLead.aiAnalysis}
    Periodic sync: ${BOT_CONFIG.BOT_BEHAVIOR.periodicSync.enabled}

✅ Configuration loaded successfully!
  `);

  return BOT_CONFIG;
}

export default BOT_CONFIG;
