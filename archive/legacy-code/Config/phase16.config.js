/**
 * ====================================================================
 * PHASE 16 CONFIGURATION
 * ====================================================================
 * Feature flags, thresholds, and settings for Phase 16 enhancements:
 * - Dynamic QR timeout learning
 * - Real-time dashboard
 * - Notifications & alerts
 * - Diagnostics & health scoring
 *
 * @since Phase 16 - February 15, 2026
 */

export default {
  // ═══════════════════════════════════════════════════════════════════
  // FEATURE FLAGS
  // ═══════════════════════════════════════════════════════════════════

  features: {
    dynamicQRTimeout: {
      enabled: true,
      description: 'Automatically adjust QR timeout based on user patterns'
    },
    
    dashboard: {
      enabled: true,
      description: 'Real-time connection status dashboard'
    },
    
    notifications: {
      enabled: true,
      description: 'Multi-channel alerts and notifications'
    },
    
    diagnostics: {
      enabled: true,
      description: 'Automatic issue detection and recommendations'
    },
    
    healthScoring: {
      enabled: true,
      description: 'Calculate and track system health scores'
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // QR SCAN ANALYZER SETTINGS
  // ═══════════════════════════════════════════════════════════════════

  qrScanAnalyzer: {
    enabled: true,
    minimumDataPoints: 30,          // Need 30 scans before using learned timeout
    confidenceThreshold: 0.85,      // 85% confidence required
    percentile: 95,                 // Use 95th percentile for calculation
    minTimeout: 60000,              // Minimum 60 seconds
    maxTimeout: 180000,             // Maximum 3 minutes
    bufferTime: 10000,              // Add 10s buffer to recommended timeout
    
    // Calculation: p95_scan_time + buffer_time
    // But bounded by [minTimeout, maxTimeout]
    
    defaultTimeout: 120000,         // Fallback when insufficient data
    dataPointExpiry: 2592000000,    // 30 days expiry
    calculateInterval: 3600000      // Recalculate every hour
  },

  // ═══════════════════════════════════════════════════════════════════
  // DASHBOARD SETTINGS
  // ═══════════════════════════════════════════════════════════════════

  dashboard: {
    enabled: true,
    refreshInterval: 5000,          // Update every 5 seconds
    wsReconnectAttempts: 5,
    wsReconnectDelay: 3000,
    maxHistoryPoints: 500,          // Store 500 data points for charts
    
    features: {
      realTimeStatus: true,
      healthScores: true,
      qrMetrics: true,
      alerts: true,
      recommendations: true
    },
    
    healthGaugeThresholds: {
      excellent: 90,  // 90-100
      good: 75,       // 75-89
      fair: 60,       // 60-74
      poor: 40,       // 40-59
      critical: 0     // 0-39
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // NOTIFICATION SETTINGS
  // ═══════════════════════════════════════════════════════════════════

  notifications: {
    enabled: true,
    retryCount: 3,
    retryDelay: 5000,
    aggregationWindow: 60000,       // Aggregate notifications within 60s
    
    channels: {
      sms: {
        enabled: process.env.TWILIO_ACCOUNT_SID ? true : false,
        provider: 'twilio',
        cooldown: 3600,             // 1 hour between same SMS alert
        maxRetries: 3
      },
      
      email: {
        enabled: process.env.SENDGRID_API_KEY ? true : false,
        provider: 'sendgrid',
        cooldown: 1800,             // 30 min between same email
        maxRetries: 3
      },
      
      slack: {
        enabled: process.env.SLACK_WEBHOOK_URL ? true : false,
        cooldown: 600,              // 10 min between same Slack message
        maxRetries: 2
      },
      
      push: {
        enabled: process.env.FIREBASE_PROJECT_ID ? true : false,
        provider: 'firebase',
        maxRetries: 2
      },
      
      inApp: {
        enabled: true,              // Always enabled
        maxRetries: 0
      }
    },
    
    deliveryTarget: 30000           // Target delivery within 30 seconds
  },

  // ═══════════════════════════════════════════════════════════════════
  // DIAGNOSTICS SETTINGS
  // ═══════════════════════════════════════════════════════════════════

  diagnostics: {
    enabled: true,
    scanWindow: 3600000,            // 1 hour window
    calculateInterval: 300000,      // Check every 5 minutes
    
    detection: {
      slowQRScan: {
        enabled: true,
        threshold: 30000,           // > 30s is slow
        sampleSize: 10
      },
      
      frequentRegeneration: {
        enabled: true,
        threshold: 5,               // More than 5 in 1 hour
        window: 3600000
      },
      
      networkIssues: {
        enabled: true,
        errorRateThreshold: 0.05    // > 5% errors
      },
      
      browserLocks: {
        enabled: true,
        cooldown: 300000            // Check every 5 min
      },
      
      staleSessions: {
        enabled: true,
        inactivityTimeout: 300000   // 5 min no activity
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // HEALTH SCORING SETTINGS
  // ═══════════════════════════════════════════════════════════════════

  healthScoring: {
    enabled: true,
    calculateInterval: 300000,      // Every 5 minutes
    
    weights: {
      uptime: 0.30,                 // 30% weight
      qrQuality: 0.25,              // 25% weight
      errorRate: 0.20,              // 20% weight
      responseTime: 0.15,           // 15% weight
      messageProcessing: 0.10       // 10% weight
    },
    
    metrics: {
      // Uptime scoring
      uptime: {
        excellent: 0.999,           // 99.9%+ = 100 points
        good: 0.99,                 // 99% = 80 points
        fair: 0.95,                 // 95% = 50 points
        poor: 0.90                  // 90% = 20 points
      },
      
      // QR Quality scoring
      qrQuality: {
        excellent: 0.01,            // < 1% regen rate = 100 points
        good: 0.05,                 // < 5% regen rate = 80 points
        fair: 0.10,                 // < 10% = 50 points
        poor: 0.15                  // < 15% = 20 points
      },
      
      // Error rate scoring
      errorRate: {
        excellent: 0.001,           // < 0.1% = 100 points
        good: 0.01,                 // < 1% = 80 points
        fair: 0.05,                 // < 5% = 50 points
        poor: 0.10                  // < 10% = 20 points
      },
      
      // Response time scoring (in ms)
      responseTime: {
        excellent: 5000,            // < 5s = 100 points
        good: 10000,                // < 10s = 80 points
        fair: 30000,                // < 30s = 50 points
        poor: 60000                 // < 60s = 20 points
      },
      
      // Message processing success rate
      messageProcessing: {
        excellent: 0.99,            // 99%+ = 100 points
        good: 0.95,                 // 95% = 80 points
        fair: 0.90,                 // 90% = 50 points
        poor: 0.85                  // 85% = 20 points
      }
    },
    
    // Score thresholds for alerts
    alertOnScoreDrop: 10            // Alert if score drops 10+ points
  },

  // ═══════════════════════════════════════════════════════════════════
  // DATABASE SETTINGS
  // ═══════════════════════════════════════════════════════════════════

  database: {
    collections: {
      qrScans: 'qr_scans',
      healthScores: 'health_scores',
      notifications: 'notifications',
      diagnostics: 'diagnostics'
    },
    
    retention: {
      qrScans: 2592000000,          // 30 days
      healthScores: 7776000000,     // 90 days
      notifications: 2592000000,    // 30 days
      diagnostics: 7776000000       // 90 days
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // LOGGING
  // ═══════════════════════════════════════════════════════════════════

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    phase16: {
      qrScanAnalyzer: true,
      notifications: true,
      diagnostics: true,
      healthScoring: true,
      dashboard: true
    }
  }
};
