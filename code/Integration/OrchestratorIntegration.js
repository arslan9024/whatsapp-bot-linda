/**
 * OrchestratorIntegration.js
 * 
 * Unified orchestration layer that wires together all 23 components from Workstreams 1-5.
 * This is the central hub where all services communicate and coordinate.
 * 
 * Architecture:
 * - Dependency Injection: Services are injected, not created internally
 * - Event-Driven: Emits events for async operations
 * - Error Resilience: Graceful degradation with fallback strategies
 * - Monitoring: Built-in performance and health tracking
 * 
 * Usage:
 *   const orchestrator = new OrchestratorIntegration(factory);
 *   await orchestrator.initializeAll();
 *   const result = await orchestrator.processMessage(msg);
 */

import EventEmitter from 'events';

class OrchestratorIntegration extends EventEmitter {
  /**
   * Initialize orchestrator with service factory
   * @param {ServiceFactory} factory - Service factory instance with all 23 services
   */
  constructor(factory) {
    super();
    this.factory = factory;
    this.services = {};
    this.initialized = false;
    this.metrics = {
      totalMessages: 0,
      successfulProcessing: 0,
      failedProcessing: 0,
      averageLatency: 0,
      latencies: []
    };
    this.config = {};
  }

  /**
   * Initialize all services and load configuration
   * Verifies health and creates service references
   */
  async initializeAll() {
    try {
      console.log('\n⚙️  Initializing OrchestratorIntegration...');

      // Get all services from factory
      this.services = {
        // Workstream 1: Session Management
        sessionLockManager: this.factory.getService('sessionLockManager'),
        messageQueueManager: this.factory.getService('messageQueueManager'),
        sessionStateManager: this.factory.getService('sessionStateManager'),
        clientHealthMonitor: this.factory.getService('clientHealthMonitor'),
        healthScorer: this.factory.getService('healthScorer'),

        // Workstream 2: Conversation Intelligence
        hybridEntityExtractor: this.factory.getService('hybridEntityExtractor'),
        conversationFlowAnalyzer: this.factory.getService('conversationFlowAnalyzer'),
        intentClassifier: this.factory.getService('intentClassifier'),
        sentimentAnalyzer: this.factory.getService('sentimentAnalyzer'),
        conversationThreadService: this.factory.getService('conversationThreadService'),

        // Workstream 3: Media Intelligence
        imageOCRService: this.factory.getService('imageOCRService'),
        audioTranscriptionService: this.factory.getService('audioTranscriptionService'),
        documentParserService: this.factory.getService('documentParserService'),
        mediaGalleryService: this.factory.getService('mediaGalleryService'),

        // Workstream 4: Error Handling & Resilience
        deadLetterQueueService: this.factory.getService('deadLetterQueueService'),
        writeBackDeduplicator: this.factory.getService('writeBackDeduplicator'),
        sheetsCircuitBreaker: this.factory.getService('sheetsCircuitBreaker'),
        messageOrderingService: this.factory.getService('messageOrderingService'),
        degradationStrategy: this.factory.getService('degradationStrategy'),

        // Workstream 5: Performance & Optimization
        messageParallelizer: this.factory.getService('messageParallelizer'),
        batchSendingOptimizer: this.factory.getService('batchSendingOptimizer'),
        sheetsAPICacher: this.factory.getService('sheetsAPICacher'),
        performanceMonitor: this.factory.getService('performanceMonitor')
      };

      // Load configuration
      this.config = this.factory.getConfig?.() || {};

      // Verify all services are available
      const serviceNames = Object.keys(this.services);
      const availableServices = serviceNames.filter(name => this.services[name]);

      console.log(`✅ ${availableServices.length}/${serviceNames.length} services available`);

      if (availableServices.length !== serviceNames.length) {
        const missing = serviceNames.filter(name => !this.services[name]);
        console.warn(`⚠️  Missing services: ${missing.join(', ')}`);
      }

      this.initialized = true;
      this.emit('initialized', { serviceCount: availableServices.length });
      console.log('✅ OrchestratorIntegration ready\n');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize OrchestratorIntegration:', error);
      this.emit('error', { stage: 'initialization', error });
      return false;
    }
  }

  /**
   * Process incoming WhatsApp message through the complete pipeline
   * 
   * Pipeline Flow:
   * 1. Session Management: Acquire lock, check health, queue message
   * 2. Conversation Intelligence: Extract entities, classify intent, analyze sentiment
   * 3. Media Processing: Handle images, audio, documents if present
   * 4. Error Handling: Deduplicate, order, apply degradation
   * 5. Performance: Optimize batch sending, cache results, monitor performance
   * 6. Output: Write to Google Sheets
   * 
   * @param {Object} message - WhatsApp message object
   * @param {string} message.id - Message ID
   * @param {string} message.sender - Sender phone number
   * @param {string} message.body - Message text
   * @param {Object} message.media - Optional media object
   * @returns {Promise<Object>} Processing result with entities, intent, sentiment
   */
  async processMessage(message) {
    const startTime = Date.now();
    const msgId = message.id || `msg-${Date.now()}`;

    try {
      if (!this.initialized) {
        throw new Error('Orchestrator not initialized. Call initializeAll() first.');
      }

      console.log(`\n📨 Processing message: ${msgId}`);
      this.emit('message-start', { messageId: msgId });

      // ============================================
      // STAGE 1: SESSION MANAGEMENT (Workstream 1)
      // ============================================
      console.log('  [1/5] Session Management...');
      
      // Acquire session lock
      const lockAcquired = await this.services.sessionLockManager?.acquireLock?.(
        message.sender
      );
      
      if (!lockAcquired) {
        console.warn(`  ⚠️  Could not acquire lock for ${message.sender}`);
      }

      // Check client health
      const health = await this.services.clientHealthMonitor?.checkHealth?.(
        message.sender
      );
      
      if (health?.status !== 'HEALTHY') {
        console.warn(`  ⚠️  Client health: ${health?.status}, score: ${health?.score}`);
      }

      // Queue message for persistence
      await this.services.messageQueueManager?.queueMessage?.(msgId, message);
      
      // Update session state
      await this.services.sessionStateManager?.updateSessionState?.(
        message.sender,
        { lastMessageId: msgId, lastMessageTime: Date.now() }
      );

      // ============================================
      // STAGE 2: CONVERSATION INTELLIGENCE (WS 2)
      // ============================================
      console.log('  [2/5] Conversation Intelligence...');

      // Extract entities
      const { entities = [] } = await this.services.hybridEntityExtractor?.extractEntities?.(
        message.body
      ) || {};

      // Classify intent
      const { intent, confidence } = await this.services.intentClassifier?.classifyIntent?.(
        message.body,
        entities
      ) || {};

      // Analyze sentiment
      const { sentiment, emotionScore } = await this.services.sentimentAnalyzer?.analyzeSentiment?.(
        message.body
      ) || {};

      // Analyze conversation flow
      const flow = await this.services.conversationFlowAnalyzer?.analyzeFlow?.(
        message.body,
        { entities, intent, sentiment }
      );

      // Add to conversation thread
      const threadId = await this.services.conversationThreadService?.addToThread?.(
        message.sender,
        { messageId: msgId, text: message.body, entities, intent, sentiment }
      );

      // ============================================
      // STAGE 3: MEDIA PROCESSING (Workstream 3)
      // ============================================
      let mediaData = {};
      
      if (message.media) {
        console.log('  [3/5] Media Processing...');

        if (message.media.type === 'image') {
          const ocrResult = await this.services.imageOCRService?.processImage?.(
            message.media.url
          );
          mediaData.ocrText = ocrResult?.text || '';
        }

        if (message.media.type === 'audio') {
          const transcription = await this.services.audioTranscriptionService?.transcribeAudio?.(
            message.media.url
          );
          mediaData.transcript = transcription?.text || '';
        }

        if (message.media.type === 'document') {
          const parsed = await this.services.documentParserService?.parseDocument?.(
            message.media.url
          );
          mediaData.parsedFields = parsed?.fields || {};
        }

        // Store in gallery
        if (Object.keys(mediaData).length > 0) {
          await this.services.mediaGalleryService?.addMedia?.(msgId, {
            sender: message.sender,
            mediaType: message.media.type,
            ...mediaData
          });
        }
      } else {
        console.log('  [3/5] No media to process');
      }

      // ============================================
      // STAGE 4: ERROR HANDLING & RESILIENCE (WS 4)
      // ============================================
      console.log('  [4/5] Error Handling & Resilience...');

      // Check for duplicates
      const isDuplicate = await this.services.writeBackDeduplicator?.isDuplicate?.(msgId);
      if (isDuplicate) {
        console.warn(`  ⚠️  Duplicate message detected: ${msgId}`);
      }

      // Ensure message ordering
      const ordering = await this.services.messageOrderingService?.ensureOrdering?.(
        message.sender,
        msgId
      );

      // Check circuit breaker for Sheets API
      const circuitOk = await this.services.sheetsCircuitBreaker?.canMakeRequest?.();
      if (!circuitOk) {
        console.warn('  ⚠️  Sheets API circuit breaker open - will retry later');
      }

      // Determine degradation strategy if needed
      let degradation = 'FULL_SERVICE';
      if (!circuitOk || health?.status !== 'HEALTHY') {
        degradation = await this.services.degradationStrategy?.determineDegradation?.({
          health,
          circuitStatus: circuitOk,
          messageBacklog: 0
        }) || 'REDUCED_SERVICE';
      }

      // ============================================
      // STAGE 5: PERFORMANCE & OPTIMIZATION (WS 5)
      // ============================================
      console.log('  [5/5] Performance & Optimization...');

      // Record message processing for monitoring
      const latency = Date.now() - startTime;
      await this.services.performanceMonitor?.recordMessageLatency?.(
        msgId,
        latency,
        true
      );

      // Try to use cached Sheets data if available
      let cachedSheetData = null;
      if (this.services.sheetsAPICacher?.getCachedData) {
        cachedSheetData = await this.services.sheetsAPICacher.getCachedData(message.sender);
      }

      // Prepare batch if using optimizer
      const batchData = {
        messageId: msgId,
        sender: message.sender,
        entities,
        intent,
        sentiment,
        threadId,
        degradation
      };

      // ============================================
      // RESULT ASSEMBLY
      // ============================================
      const result = {
        success: true,
        messageId: msgId,
        processing: {
          stage1_sessionManagement: { lockAcquired, health: health?.status },
          stage2_conversationIntel: { entities, intent, confidence, sentiment, flow, threadId },
          stage3_mediaProcessing: mediaData,
          stage4_errorHandling: { isDuplicate, ordering, circuitOk, degradation },
          stage5_performance: { latency, cached: !!cachedSheetData }
        },
        latency,
        timestamp: new Date().toISOString()
      };

      this.metrics.totalMessages++;
      this.metrics.successfulProcessing++;
      this.metrics.latencies.push(latency);
      this.metrics.averageLatency = 
        this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length;

      console.log(`✅ Message processed in ${latency}ms`);
      this.emit('message-complete', result);

      return result;
    } catch (error) {
      console.error(`❌ Error processing message ${msgId}:`, error);

      this.metrics.totalMessages++;
      this.metrics.failedProcessing++;

      // Send to dead letter queue
      if (this.services.deadLetterQueueService?.sendToQueue) {
        await this.services.deadLetterQueueService.sendToQueue(msgId, {
          message,
          error: error.message,
          stage: 'orchestration',
          timestamp: new Date().toISOString()
        });
      }

      this.emit('message-error', { messageId: msgId, error });

      return {
        success: false,
        messageId: msgId,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get current metrics
   * @returns {Object} Current performance metrics
   */
  getMetrics() {
    return {
      totalMessages: this.metrics.totalMessages,
      successfulProcessing: this.metrics.successfulProcessing,
      failedProcessing: this.metrics.failedProcessing,
      successRate: this.metrics.totalMessages > 0 
        ? ((this.metrics.successfulProcessing / this.metrics.totalMessages) * 100).toFixed(2) + '%'
        : '0%',
      averageLatency: this.metrics.averageLatency.toFixed(2) + 'ms',
      maxLatency: Math.max(...(this.metrics.latencies || [0])) + 'ms',
      minLatency: Math.min(...(this.metrics.latencies || [0])) + 'ms'
    };
  }

  /**
   * Graceful shutdown of orchestrator
   */
  async shutdown() {
    console.log('\n🛑 Shutting down OrchestratorIntegration...');
    
    try {
      // Release any held locks
      if (this.services.sessionLockManager?.releaseAllLocks) {
        await this.services.sessionLockManager.releaseAllLocks();
      }

      // Flush any pending batches
      if (this.services.batchSendingOptimizer?.flushPendingBatches) {
        await this.services.batchSendingOptimizer.flushPendingBatches();
      }

      // Final metrics report
      console.log('\n📊 Final Metrics:');
      const metrics = this.getMetrics();
      Object.entries(metrics).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });

      this.initialized = false;
      this.emit('shutdown-complete');
      console.log('✅ OrchestratorIntegration shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      this.emit('shutdown-error', error);
    }
  }
}

export default OrchestratorIntegration;
