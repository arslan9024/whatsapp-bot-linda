/**
 * Handler Orchestrator for Test Initialization
 * Manages dependencies and initialization order for all handlers
 * 
 * Ensures:
 * - Independent handlers initialize first
 * - Dependent handlers wait for dependencies
 * - Command-level handlers with full context initialize last
 * - No circular dependencies
 * 
 * Version: 1.0.0
 * Created: February 27, 2026
 * Phase: 6 M2 Module 2 - Integration Testing
 */

class HandlerOrchestrator {
  constructor(logger) {
    this.logger = logger;
    this.initialized = false;
  }

  /**
   * Initialize all handlers in proper dependency order
   * @param {Object} handlers - Map of handler instances
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Initialized handlers
   */
  async initializeAll(handlers, options = {}) {
    try {
      this.logger?.info('Handler orchestration starting');

      // Phase 1: Initialize independent handlers (no dependencies)
      await this.initializePhase1(handlers, options);

      // Phase 2: Initialize transport/storage handlers (depend on Phase 1)
      await this.initializePhase2(handlers, options);

      // Phase 3: Initialize context/awareness handlers (depend on Phase 1-2)
      await this.initializePhase3(handlers, options);

      // Phase 4: Initialize command/routing handlers (full dependencies)
      await this.initializePhase4(handlers, options);

      this.initialized = true;
      this.logger?.info('Handler orchestration complete');

      return handlers;
    } catch (error) {
      this.logger?.error('Handler orchestration failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Phase 1: Initialize independent handlers (no dependencies)
   */
  async initializePhase1(handlers, options) {
    this.logger?.info('Phase 1: Independent handlers');

    // Template Engine - Pure template management
    if (handlers.template) {
      if (typeof handlers.template.initialize === 'function') {
        await handlers.template.initialize();
      }
      if (typeof handlers.template.loadDefaultTemplates === 'function') {
        handlers.template.loadDefaultTemplates();
      }
      this.logger?.debug('TemplateEngine initialized');
    }

    // Media Handler - File/media processing
    if (handlers.media) {
      if (typeof handlers.media.initialize === 'function') {
        await handlers.media.initialize();
      }
      this.logger?.debug('MediaHandler initialized');
    }

    // Group Manager - Group entity management
    if (handlers.group) {
      if (typeof handlers.group.initialize === 'function') {
        await handlers.group.initialize();
      }
      this.logger?.debug('GroupManager initialized');
    }
  }

  /**
   * Phase 2: Initialize transport/processing handlers (depend on Phase 1)
   */
  async initializePhase2(handlers, options) {
    this.logger?.info('Phase 2: Transport/processing handlers');

    // Batch Processor - Depends on template/media engines
    if (handlers.batch) {
      if (typeof handlers.batch.initialize === 'function') {
        await handlers.batch.initialize();
      }
      this.logger?.debug('BatchProcessor initialized');
    }

    // Account Manager - Account/device management
    if (handlers.account) {
      if (typeof handlers.account.initialize === 'function') {
        await handlers.account.initialize();
      }
      this.logger?.debug('AccountManager initialized');
    }
  }

  /**
   * Phase 3: Initialize context/awareness handlers (depend on Phase 1-2)
   */
  async initializePhase3(handlers, options) {
    this.logger?.info('Phase 3: Context/awareness handlers');

    // Conversation Engine - Depends on message processing
    if (handlers.conversation) {
      if (typeof handlers.conversation.initialize === 'function') {
        await handlers.conversation.initialize();
      }
      this.logger?.debug('ConversationEngine initialized');
    }
  }

  /**
   * Phase 4: Initialize command/routing handlers (full dependencies)
   */
  async initializePhase4(handlers, options) {
    this.logger?.info('Phase 4: Command/routing handlers');

    // Command Executor - Depends on:
    // - Template (template rendering)
    // - Conversation (learning & context)
    // - Account (multi-account commands)
    // - Group (group commands)
    if (handlers.command) {
      if (typeof handlers.command.initialize === 'function') {
        await handlers.command.initialize();
      }
      if (typeof handlers.command.registerBuiltInCommands === 'function') {
        handlers.command.registerBuiltInCommands();
      }
      this.logger?.debug('CommandExecutor initialized');
    }
  }

  /**
   * Verify all handlers are properly initialized
   */
  verifyInitialization(handlers) {
    const results = {
      template: handlers.template?.initialized || false,
      batch: handlers.batch?.initialized || false,
      media: handlers.media?.initialized || false,
      command: handlers.command?.initialized || false,
      group: handlers.group?.initialized || false,
      account: handlers.account?.initialized || false,
      conversation: handlers.conversation?.initialized || false
    };

    const allInitialized = Object.values(results).every(val => val === true);
    
    this.logger?.info('Handler initialization verification', { results, allInitialized });
    
    return {
      success: allInitialized,
      results,
      failed: Object.entries(results)
        .filter(([name, initialized]) => !initialized)
        .map(([name]) => name)
    };
  }

  /**
   * Reset all handlers to clean state
   */
  resetAll(handlers) {
    let resetCount = 0;
    
    for (const [name, handler] of Object.entries(handlers)) {
      if (handler && typeof handler.reset === 'function') {
        handler.reset();
        resetCount++;
      }
    }

    this.logger?.debug('Handler reset complete', { count: resetCount });
    return { success: true, reset: resetCount };
  }
}

module.exports = HandlerOrchestrator;
