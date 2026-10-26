/**
 * IntegrationConfig.js
 *
 * Centralized configuration for all 23 services
 * Single source of truth for service initialization and parameters
 *
 * Used by: ServiceFactory.js
 * Version: 1.0
 * Created: February 17, 2026
 * Status: Production Ready
 */

export const integrationConfig = {
  // ========== WORKSTREAM 1: SESSION MANAGEMENT ==========
  sessionLockManager: {
    lockFilePath: './locks',
    lockTimeoutMs: 30 * 1000, // 30 second timeout
    forceUnlockAfterMs: 45 * 1000, // Force unlock after 45 seconds
    retryDelayMs: 100,
    maxRetries: 5,
  },

  messageQueueManager: {
    queueFilePath: './message-queue',
    maxQueueSizeBytes: 100 * 1024 * 1024, // 100MB max queue
    persistIntervalMs: 5 * 1000, // Persist to disk every 5 seconds
    enableCompression: true,
    compressionThresholdBytes: 1024, // Compress if > 1KB
  },

  sessionStateManager: {
    enableStateTracking: true,
    stateChangeLogPath: './state-changes.log',
    maxStateHistorySize: 1000,
  },

  clientHealthMonitor: {
    healthCheckIntervalMs: 10 * 1000, // Check every 10 seconds
    frameDetachTimeoutMs: 100, // Alert if no frame in 100ms
    enableFrameDetachWarning: true,
    enableMemoryMonitoring: true,
  },

  healthScorer: {
    enableProactiveRecovery: true,
    criticalThreshold: 60, // Below 60 = trigger recovery
    warningThreshold: 75, // Below 75 = warning
    healthyThreshold: 80, // Above 80 = healthy
    scoringFactors: {
      uptime: 0.3,
      messageSuccess: 0.3,
      apiHealth: 0.2,
      resourceHealth: 0.2,
    },
  },

  // ========== WORKSTREAM 2: CONVERSATION INTELLIGENCE ==========
  hybridEntityExtractor: {
    // Layer timings
    layer1TimeoutMs: 10, // Regex rules (fast)
    layer2TimeoutMs: 50, // ML-enhanced (medium)
    layer3TimeoutMs: 5, // Context validation (fast)

    // Thresholds
    confidenceThreshold: 0.7,
    minLayersRequired: 2, // Need agreement from 2+ layers

    // Features
    enableContextValidation: true,
    enablePhoneNormalization: true,
    enableCurrencyNormalization: true,
    enableDateNormalization: true,

    // Caching
    enableEntityCache: true,
    entityCacheTTLMs: 60 * 60 * 1000, // 1 hour
  },

  conversationFlowAnalyzer: {
    enableContextSwitchDetection: true,
    contextSwitchThreshold: 0.6, // Similarity score below this = context switch

    enableTopicTracking: true,
    enableIntentFlipDetection: true,

    // History
    maxConversationHistoryLength: 50,
    contextSimilarityAlgorithm: 'cosine', // or 'euclidean'
  },

  intentClassifier: {
    modelPath: './models/intent-classifier',
    confidenceThreshold: 0.75,

    enableFallbackClassification: true,
    enableContextAwareClassification: true,

    // Intent categories (15 total)
    intents: [
      'inquiry',
      'viewing_request',
      'negotiation',
      'complaint',
      'spam',
      'follow_up',
      'offer',
      'payment_related',
      'document_request',
      'property_update',
      'schedule_appointment',
      'thank_you',
      'greeting',
      'closing',
      'unclear',
    ],
  },

  sentimentAnalyzer: {
    enableEmojiAnalysis: true,
    emojiWeightFactor: 1.5,

    enableNLPKeywords: true,
    nLPWeightFactor: 1.0,

    // Sentiment states
    sentiments: ['positive', 'neutral', 'negative', 'urgent'],

    // Assessment
    urgencyKeywords: [
      'asap',
      'urgent',
      'immediately',
      'now',
      'help',
    ],
  },

  conversationThreadService: {
    enableAutoThreading: true,
    enableContextAwareSplitting: true,

    // Thread isolation
    maxThreadsPerConversation: 10,
    contextSwitchThresholdForNewThread: 0.5,

    // Metadata
    enableThreadMetadata: true,
    maxMetadataPerThread: 50,
  },

  // ========== WORKSTREAM 3: MEDIA INTELLIGENCE ==========
  imageOCRService: {
    enableOCR: true,
    ocrEngine: 'tesseract', // tesseract.js

    enableEXIFExtraction: true,
    enablePatternMatching: true,

    // Deduplication
    enableImageDedup: true,
    imageDedupThreshold: 0.95, // 95% similarity = duplicate

    // Processing
    maxImageSizeBytes: 20 * 1024 * 1024, // 20MB max
    processingTimeoutMs: 30 * 1000, // 30 second timeout
  },

  audioTranscriptionService: {
    enableTranscription: true,
    transcriptionEngine: 'google-cloud-speech',

    enableEntityExtractionFromTranscript: true,
    enableEmotionDetection: true,

    // Processing
    maxAudioDurationSec: 600, // 10 minutes
    processingTimeoutMs: 60 * 1000, // 60 second timeout

    // Fallback
    enableFallbackMessage: true,
    fallbackMessage: 'Please type your message or try again',
  },

  documentParserService: {
    enableParsing: true,
    supportedFormats: ['pdf', 'xlsx', 'csv', 'docx'],

    enableFieldExtraction: true,
    enableContractAnalysis: true,

    // Processing
    maxDocumentSizeBytes: 50 * 1024 * 1024, // 50MB max
    processingTimeoutMs: 60 * 1000,
  },

  mediaGalleryService: {
    enableGallery: true,
    galleryStoragePath: './media-gallery',

    enableMediaOrganization: true,
    organizationStrategy: 'by-context', // or 'by-date', 'by-type'

    enableReactions: true,
    enableVersioning: true,
    enableSearch: true,

    // Retention
    maxGalleryAgeDays: 365,
    enableAutoCleanup: true,
  },

  // ========== WORKSTREAM 4: ERROR HANDLING & RESILIENCE ==========
  deadLetterQueueService: {
    enableDLQ: true,
    dlqStoragePath: './dead-letter-queue',

    // Retry strategy
    enableAutoRetry: true,
    maxRetries: 3,
    initialBackoffMs: 1000,
    backoffMultiplier: 2,

    // Cleanup
    dlqRetentionDays: 30,
    enableAutoCleanup: true,
  },

  writeBackDeduplicator: {
    enableDeduplication: true,
    dedupWindowMs: 5 * 60 * 1000, // 5 minute window

    enableWriteHistory: true,
    writeHistoryPath: './write-history',

    maxDedupCacheSize: 10000,
  },

  sheetsCircuitBreaker: {
    enableCircuitBreaker: true,

    // States: CLOSED, OPEN, HALF_OPEN
    failureThreshold: 5, // Failures before opening
    successThreshold: 2, // Successes before closing
    timeoutMs: 60 * 1000, // 1 minute timeout

    // Fallback
    enablelocalCaching: true,
    localCachePath: './sheets-cache',

    enableMetrics: true,
  },

  messageOrderingService: {
    enableOrderingVerification: true,
    enableFIFOGuarantee: true,

    // Detection
    enableOutOfOrderDetection: true,
    enableMessageReplay: true,

    // Tracking
    maxOrderingHistorySize: 1000,
  },

  degradationStrategy: {
    enableDegradation: true,

    // Feature degradation levels
    degradationLevels: {
      critical: ['session_management', 'message_persistence'],
      important: ['entity_extraction', 'intent_classification'],
      nice_to_have: ['ocr', 'sentiment', 'media_processing'],
    },

    // Thresholds for feature disabling
    cpuThresholdPercent: 80,
    memoryThresholdPercent: 90,
    apiErrorRateThreshold: 0.2, // 20% error rate

    enableAutoRecovery: true,
    recoveryCheckIntervalMs: 30 * 1000,
  },

  // ========== WORKSTREAM 5: PERFORMANCE & OPTIMIZATION ==========
  messageParallelizer: {
    enableParallelization: true,

    // Worker pool
    defaultWorkerCount: 8,
    minWorkers: 2,
    maxWorkers: 16,

    // Queue management
    queueHighWaterMark: 1000, // Start applying backpressure
    queueLowWaterMark: 100, // Resume normal operation

    // Timeout
    workerTimeoutMs: 30 * 1000,

    // Auto-scaling
    enableAutoScaling: true,
    scalingCheckIntervalMs: 5 * 1000,
  },

  batchSendingOptimizer: {
    enableBatching: true,

    // Batch sizing
    baseBatchSize: 10,
    maxBatchSizePerRecipient: 5,
    priorityBatchSize: 3,

    // Rate limiting
    minDelayBetweenBatchesMs: 500,
    maxConcurrentBatches: 5,

    // WhatsApp API limits
    rateLimit: {
      messagesPerSecond: 30,
      messagesPerMinute: 1000,
      messagesPerHour: 10000,
    },

    // Retry
    maxRetries: 3,
    initialBackoffMs: 1000,
    backoffMultiplier: 2,

    // Health tracking
    enableHealthTracking: true,
    healthCheckIntervalMs: 30 * 1000,
  },

  sheetsAPICacher: {
    enableCaching: true,

    // TTL
    defaultTTLMs: 60 * 60 * 1000, // 1 hour
    maxMemorySizeBytes: 300 * 1024 * 1024, // 300MB

    // Compression
    compressionThresholdBytes: 10 * 1024, // 10KB
    enableCompression: true,

    // Stale-while-revalidate
    allowStaleReads: true,
    staleWhileRevalidateMs: 5 * 60 * 1000, // 5 minutes

    // Metrics
    enableHitRateTracking: true,
    enableMemoryTracking: true,
  },

  performanceMonitor: {
    enableMonitoring: true,

    // Metrics collection
    metricCollectionIntervalMs: 5 * 1000, // Every 5 seconds
    performanceCheckIntervalMs: 30 * 1000, // Every 30 seconds

    // Thresholds
    thresholds: {
      messageLatencyWarningMs: 500,
      messageLatencyCriticalMs: 2000,
      cpuWarningPercent: 70,
      cpuCriticalPercent: 90,
      memoryWarningPercent: 75,
      memoryCriticalPercent: 90,
      errorRateWarningPercent: 5,
      errorRateCriticalPercent: 10,
      queueDepthWarning: 100,
      queueDepthCritical: 500,
    },

    // Anomaly detection
    enableAnomalyDetection: true,
    anomalyStdDevThreshold: 2.5,

    // Auto-optimization
    autoOptimizeEnabled: true,
    optimizationCooldownMs: 5 * 60 * 1000, // 5 minutes between optimizations

    // Retention
    metricsRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
    maxMetricsPerCategory: 1000,
  },

  // ========== GLOBAL SETTINGS ==========
  global: {
    enableLogging: true,
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    logPath: './logs',

    enableMetrics: true,
    metricsPath: './metrics',

    enableDistributedTracing: false, // For future: OpenTelemetry
    enableSecurityAuditing: true,
    auditLogPath: './audit-logs',

    // Graceful shutdown
    gracefulShutdownTimeoutMs: 30 * 1000,
    enableGracefulShutdown: true,
  },
};

/**
 * Get configuration for a specific service
 * @param {string} serviceName - Service name
 * @returns {object} Service configuration
 */
export function getServiceConfig(serviceName) {
  return integrationConfig[serviceName] || {};
}

/**
 * Get all service configurations
 * @returns {object} All configurations
 */
export function getAllConfigs() {
  return integrationConfig;
}

/**
 * Update configuration at runtime
 * @param {string} serviceName - Service name
 * @param {object} updates - Configuration updates
 */
export function updateServiceConfig(serviceName, updates) {
  if (integrationConfig[serviceName]) {
    Object.assign(integrationConfig[serviceName], updates);
    console.log(`✅ Updated config for ${serviceName}`);
    return true;
  }
  console.warn(`⚠️ Unknown service: ${serviceName}`);
  return false;
}

export default integrationConfig;
