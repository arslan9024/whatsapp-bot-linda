/**
 * ServiceFactory.js
 *
 * Unified service instantiation and initialization
 * Manages all 23 services across 5 workstreams
 * Handles dependency injection and startup/shutdown order
 *
 * Usage: factory = new ServiceFactory(); await factory.initializeAll();
 * Version: 1.0
 * Created: February 17, 2026
 * Status: Production Ready
 */

import { getServiceConfig } from './IntegrationConfig.js';

// Workstream 1: Session Management
import SessionLockManager from '../utils/SessionLockManager.js';
import MessageQueueManager from '../utils/MessageQueueManager.js';
import SessionStateManager from '../utils/SessionStateManager.js';
import ClientHealthMonitor from '../utils/ClientHealthMonitor.js';
import HealthScorer from '../utils/HealthScorer.js';

// Workstream 2: Conversation Intelligence
import HybridEntityExtractor from '../utils/HybridEntityExtractor.js';
import ConversationFlowAnalyzer from '../utils/ConversationFlowAnalyzer.js';
import IntentClassifier from '../utils/IntentClassifier.js';
import SentimentAnalyzer from '../utils/SentimentAnalyzer.js';
import ConversationThreadService from '../Services/ConversationThreadService.js';

// Workstream 3: Media Intelligence
import ImageOCRService from '../Services/ImageOCRService.js';
import AudioTranscriptionService from '../Services/AudioTranscriptionService.js';
import DocumentParserService from '../Services/DocumentParserService.js';
import MediaGalleryService from '../Services/MediaGalleryService.js';

// Workstream 4: Error Handling & Resilience
import DeadLetterQueueService from '../Services/DeadLetterQueueService.js';
import WriteBackDeduplicator from '../Services/WriteBackDeduplicator.js';
import SheetsCircuitBreaker from '../Services/SheetsCircuitBreaker.js';
import MessageOrderingService from '../Services/MessageOrderingService.js';
import DegradationStrategy from '../Services/DegradationStrategy.js';

// Workstream 5: Performance & Optimization
import MessageParallelizer from '../Services/MessageParallelizer.js';
import BatchSendingOptimizer from '../Services/BatchSendingOptimizer.js';
import SheetsAPICacher from '../Services/SheetsAPICacher.js';
import PerformanceMonitor from '../Services/PerformanceMonitor.js';

class ServiceFactory {
  constructor() {
    this.services = new Map();
    this.initialized = false;
    this.initializationOrder = [];
    this.shutdownOrder = [];
  }

  /**
   * Initialize all 23 services in dependency order
   * Order matters: dependencies must be initialized before dependents
   */
  async initializeAll() {
    try {
      console.log('\n🚀 ════════════════════════════════════════════════════════════');
      console.log('   INITIALIZING ALL 23 SERVICES (5 WORKSTREAMS)');
      console.log('   ════════════════════════════════════════════════════════════\n');

      // ========== PHASE 1: WORKSTREAM 1 - SESSION MANAGEMENT ==========
      console.log('📋 Phase 1: Initializing Workstream 1 (Session Management)...\n');
      
      const sessionLockManager = new SessionLockManager();
      await sessionLockManager.initialize();
      this.services.set('sessionLockManager', sessionLockManager);
      this.initializationOrder.push('sessionLockManager');
      console.log('   ✅ SessionLockManager initialized');

      const messageQueueManager = new MessageQueueManager();
      await messageQueueManager.initialize();
      this.services.set('messageQueueManager', messageQueueManager);
      this.initializationOrder.push('messageQueueManager');
      console.log('   ✅ MessageQueueManager initialized');

      const sessionStateManager = new SessionStateManager();
      await sessionStateManager.initialize();
      this.services.set('sessionStateManager', sessionStateManager);
      this.initializationOrder.push('sessionStateManager');
      console.log('   ✅ SessionStateManager initialized');

      const clientHealthMonitor = new ClientHealthMonitor();
      await clientHealthMonitor.initialize();
      this.services.set('clientHealthMonitor', clientHealthMonitor);
      this.initializationOrder.push('clientHealthMonitor');
      console.log('   ✅ ClientHealthMonitor initialized');

      const healthScorer = new HealthScorer();
      await healthScorer.initialize();
      this.services.set('healthScorer', healthScorer);
      this.initializationOrder.push('healthScorer');
      console.log('   ✅ HealthScorer initialized\n');

      // ========== PHASE 2: WORKSTREAM 2 - CONVERSATION INTELLIGENCE ==========
      console.log('📋 Phase 2: Initializing Workstream 2 (Conversation Intelligence)...\n');

      const hybridEntityExtractor = new HybridEntityExtractor();
      await hybridEntityExtractor.initialize();
      this.services.set('hybridEntityExtractor', hybridEntityExtractor);
      this.initializationOrder.push('hybridEntityExtractor');
      console.log('   ✅ HybridEntityExtractor initialized');

      const conversationFlowAnalyzer = new ConversationFlowAnalyzer();
      await conversationFlowAnalyzer.initialize();
      this.services.set('conversationFlowAnalyzer', conversationFlowAnalyzer);
      this.initializationOrder.push('conversationFlowAnalyzer');
      console.log('   ✅ ConversationFlowAnalyzer initialized');

      const intentClassifier = new IntentClassifier();
      await intentClassifier.initialize();
      this.services.set('intentClassifier', intentClassifier);
      this.initializationOrder.push('intentClassifier');
      console.log('   ✅ IntentClassifier initialized');

      const sentimentAnalyzer = new SentimentAnalyzer();
      await sentimentAnalyzer.initialize();
      this.services.set('sentimentAnalyzer', sentimentAnalyzer);
      this.initializationOrder.push('sentimentAnalyzer');
      console.log('   ✅ SentimentAnalyzer initialized');

      const conversationThreadService = new ConversationThreadService();
      await conversationThreadService.initialize();
      this.services.set('conversationThreadService', conversationThreadService);
      this.initializationOrder.push('conversationThreadService');
      console.log('   ✅ ConversationThreadService initialized\n');

      // ========== PHASE 3: WORKSTREAM 3 - MEDIA INTELLIGENCE ==========
      console.log('📋 Phase 3: Initializing Workstream 3 (Media Intelligence)...\n');

      const imageOCRService = new ImageOCRService();
      await imageOCRService.initialize();
      this.services.set('imageOCRService', imageOCRService);
      this.initializationOrder.push('imageOCRService');
      console.log('   ✅ ImageOCRService initialized');

      const audioTranscriptionService = new AudioTranscriptionService();
      await audioTranscriptionService.initialize();
      this.services.set('audioTranscriptionService', audioTranscriptionService);
      this.initializationOrder.push('audioTranscriptionService');
      console.log('   ✅ AudioTranscriptionService initialized');

      const documentParserService = new DocumentParserService();
      await documentParserService.initialize();
      this.services.set('documentParserService', documentParserService);
      this.initializationOrder.push('documentParserService');
      console.log('   ✅ DocumentParserService initialized');

      const mediaGalleryService = new MediaGalleryService();
      await mediaGalleryService.initialize();
      this.services.set('mediaGalleryService', mediaGalleryService);
      this.initializationOrder.push('mediaGalleryService');
      console.log('   ✅ MediaGalleryService initialized\n');

      // ========== PHASE 4: WORKSTREAM 4 - ERROR HANDLING & RESILIENCE ==========
      console.log('📋 Phase 4: Initializing Workstream 4 (Error Handling & Resilience)...\n');

      const deadLetterQueueService = new DeadLetterQueueService();
      await deadLetterQueueService.initialize();
      this.services.set('deadLetterQueueService', deadLetterQueueService);
      this.initializationOrder.push('deadLetterQueueService');
      console.log('   ✅ DeadLetterQueueService initialized');

      const writeBackDeduplicator = new WriteBackDeduplicator();
      await writeBackDeduplicator.initialize();
      this.services.set('writeBackDeduplicator', writeBackDeduplicator);
      this.initializationOrder.push('writeBackDeduplicator');
      console.log('   ✅ WriteBackDeduplicator initialized');

      const sheetsCircuitBreaker = new SheetsCircuitBreaker();
      await sheetsCircuitBreaker.initialize();
      this.services.set('sheetsCircuitBreaker', sheetsCircuitBreaker);
      this.initializationOrder.push('sheetsCircuitBreaker');
      console.log('   ✅ SheetsCircuitBreaker initialized');

      const messageOrderingService = new MessageOrderingService();
      await messageOrderingService.initialize();
      this.services.set('messageOrderingService', messageOrderingService);
      this.initializationOrder.push('messageOrderingService');
      console.log('   ✅ MessageOrderingService initialized');

      const degradationStrategy = new DegradationStrategy();
      await degradationStrategy.initialize();
      this.services.set('degradationStrategy', degradationStrategy);
      this.initializationOrder.push('degradationStrategy');
      console.log('   ✅ DegradationStrategy initialized\n');

      // ========== PHASE 5: WORKSTREAM 5 - PERFORMANCE & OPTIMIZATION ==========
      console.log('📋 Phase 5: Initializing Workstream 5 (Performance & Optimization)...\n');

      const messageParallelizer = new MessageParallelizer();
      await messageParallelizer.initialize();
      this.services.set('messageParallelizer', messageParallelizer);
      this.initializationOrder.push('messageParallelizer');
      console.log('   ✅ MessageParallelizer initialized');

      const batchSendingOptimizer = new BatchSendingOptimizer();
      await batchSendingOptimizer.initialize();
      this.services.set('batchSendingOptimizer', batchSendingOptimizer);
      this.initializationOrder.push('batchSendingOptimizer');
      console.log('   ✅ BatchSendingOptimizer initialized');

      const sheetsAPICacher = new SheetsAPICacher();
      await sheetsAPICacher.initialize();
      this.services.set('sheetsAPICacher', sheetsAPICacher);
      this.initializationOrder.push('sheetsAPICacher');
      console.log('   ✅ SheetsAPICacher initialized');

      const performanceMonitor = new PerformanceMonitor();
      await performanceMonitor.initialize();
      this.services.set('performanceMonitor', performanceMonitor);
      this.initializationOrder.push('performanceMonitor');
      console.log('   ✅ PerformanceMonitor initialized\n');

      // ========== SETUP COMPLETE ==========
      this.shutdownOrder = [...this.initializationOrder].reverse(); // Reverse order for shutdown
      this.initialized = true;

      console.log('🎉 ════════════════════════════════════════════════════════════');
      console.log('   ALL 23 SERVICES INITIALIZED SUCCESSFULLY!');
      console.log('   ════════════════════════════════════════════════════════════\n');

      console.log('📊 Initialization Summary:');
      console.log(`   Workstream 1 (Session Management): 5/5 services ✅`);
      console.log(`   Workstream 2 (Conversation Intelligence): 5/5 services ✅`);
      console.log(`   Workstream 3 (Media Intelligence): 4/4 services ✅`);
      console.log(`   Workstream 4 (Error Handling & Resilience): 5/5 services ✅`);
      console.log(`   Workstream 5 (Performance & Optimization): 4/4 services ✅`);
      console.log(`   ─────────────────────────────────────────────────`);
      console.log(`   TOTAL: 23/23 services initialized\n`);

      return true;
    } catch (error) {
      console.error(`\n❌ Service initialization failed: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
      return false;
    }
  }

  /**
   * Shutdown all services in reverse dependency order
   */
  async shutdownAll() {
    try {
      console.log('\n🛑 Shutting down all services...\n');

      for (const serviceName of this.shutdownOrder) {
        const service = this.services.get(serviceName);
        if (service && typeof service.shutdown === 'function') {
          try {
            await service.shutdown();
            console.log(`   ✅ ${serviceName} shut down`);
          } catch (error) {
            console.warn(
              `   ⚠️ Error shutting down ${serviceName}: ${error.message}`
            );
          }
        }
      }

      this.services.clear();
      this.initialized = false;

      console.log('\n✅ All services shut down gracefully\n');
      return true;
    } catch (error) {
      console.error(`Error during shutdown: ${error.message}`);
      return false;
    }
  }

  /**
   * Get a service instance
   * @param {string} serviceName - Service name
   * @returns {object} Service instance
   */
  getService(serviceName) {
    if (!this.services.has(serviceName)) {
      console.warn(`⚠️ Service not found: ${serviceName}`);
      return null;
    }
    return this.services.get(serviceName);
  }

  /**
   * Get all services
   * @returns {Map} All services
   */
  getAllServices() {
    return this.services;
  }

  /**
   * Get service status report
   * @returns {object} Status report
   */
  getStatusReport() {
    const report = {
      initialized: this.initialized,
      totalServices: this.services.size,
      services: [],
      timestamp: new Date().toISOString(),
    };

    for (const [name] of this.services) {
      report.services.push({
        name,
        status: 'initialized',
      });
    }

    return report;
  }

  /**
   * Check if all services are healthy
   * @returns {boolean} True if all services are healthy
   */
  areAllServicesHealthy() {
    for (const [name, service] of this.services) {
      if (service.getHealth && typeof service.getHealth === 'function') {
        const health = service.getHealth();
        if (!health || !health.healthy) {
          console.warn(`⚠️ Service unhealthy: ${name}`);
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get detailed health report for all services
   * @returns {object} Health report
   */
  getHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overallHealth: 'unknown',
      services: {},
    };

    let totalHealth = 0;
    let healthyCount = 0;

    for (const [name, service] of this.services) {
      if (service.getHealth && typeof service.getHealth === 'function') {
        try {
          const health = service.getHealth();
          report.services[name] = health;

          if (health.healthy) {
            healthyCount++;
          }
          totalHealth += health.score || 0;
        } catch (error) {
          report.services[name] = {
            healthy: false,
            error: error.message,
          };
        }
      } else {
        report.services[name] = {
          healthy: true,
          note: 'Health check not available',
        };
      }
    }

    const avgHealth = totalHealth / this.services.size;
    report.overallHealth =
      healthyCount === this.services.size ? 'excellent' : 'degraded';
    report.healthScore = avgHealth.toFixed(2);

    return report;
  }
}

export default ServiceFactory;
export { ServiceFactory };
