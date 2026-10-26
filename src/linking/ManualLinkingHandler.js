/**
 * ====================================================================
 * MANUAL LINKING HANDLER (Phase 21 - February 18, 2026)
 * ====================================================================
 * Handles manual WhatsApp account linking with:
 * - Health check before linking
 * - Master account validation
 * - Graceful error handling
 * - State management
 *
 * Usage:
 *   const handler = new ManualLinkingHandler(dependencies);
 *   await handler.initiateMasterAccountLinking();
 */

import { CreatingNewWhatsAppClient } from '../whatsapp/CreatingNewWhatsAppClient.js';
import { setupClientFlow } from '../whatsapp/ClientFlowSetup.js';
import { SessionManager } from '../sessions/SessionManager.js';
import { getSessionRecovery } from '../sessions/SessionRecoveryService.js';

export class ManualLinkingHandler {
  constructor({
    logBot,
    bootstrapManager,
    recoveryManager,
    sessionStateManager,
    deviceLinkedManager,
    accountConfigManager,
    connectionManagers,
    accountClients,
    clientHealthMonitor,
    terminalHealthDashboard,
    createDeviceStatusFile,
    sharedContext,
    getFlowDeps,
  }) {
    this.logBot = logBot;
    this.bootstrapManager = bootstrapManager;
    this.recoveryManager = recoveryManager;
    this.sessionStateManager = sessionStateManager;
    this.deviceLinkedManager = deviceLinkedManager;
    this.accountConfigManager = accountConfigManager;
    this.connectionManagers = connectionManagers;
    this.accountClients = accountClients;
    this.clientHealthMonitor = clientHealthMonitor;
    this.terminalHealthDashboard = terminalHealthDashboard;
    this.createDeviceStatusFile = createDeviceStatusFile;
    this.sharedContext = sharedContext;
    this.getFlowDeps = getFlowDeps;
    
    this.isLinking = false;
  }

  /**
   * Health check before linking
   * Verifies system is ready to accept new connections
   */
  async runPreLinkingHealthCheck() {
    this.logBot("\n═══════════════════════════════════════════════════════════", "info");
    this.logBot("🏥 PRE-LINKING HEALTH CHECK", "info");
    this.logBot("═══════════════════════════════════════════════════════════\n", "info");

    const checks = {
      memory: false,
      browser: false,
      sessions: false,
      config: false,
    };

    // Check 1: Memory availability
    this.logBot("📍 Check 1/4: Memory availability...", "info");
    const memUsage = process.memoryUsage();
    const heapRemaining = memUsage.heapTotal - memUsage.heapUsed;
    if (heapRemaining > 100 * 1024 * 1024) { // 100MB available
      this.logBot("   ✅ Memory OK (100MB+ available)", "success");
      checks.memory = true;
    } else {
      this.logBot(`   ⚠️  Low memory warning (only ${Math.round(heapRemaining / 1024 / 1024)}MB available)`, "warn");
      checks.memory = true; // Allow even with low memory
    }

    // Check 2: Browser processes
    this.logBot("📍 Check 2/4: Browser process status...", "info");
    try {
      const running = this.accountClients.size === 0;
      if (running) {
        this.logBot("   ✅ No existing clients running", "success");
        checks.browser = true;
      } else {
        this.logBot(`   ⚠️  ${this.accountClients.size} existing client(s) still running`, "warn");
        checks.browser = true; // Allow restart
      }
    } catch (e) {
      this.logBot(`   ❌ Browser check failed: ${e.message}`, "error");
      checks.browser = false;
    }

    // Check 3: Session cleanup
    this.logBot("📍 Check 3/4: Session cleanup status...", "info");
    try {
      const masterPhone = this.accountConfigManager?.getMasterPhoneNumber();
      if (masterPhone) {
        this.logBot(`   ✅ Master account configured: ${masterPhone}`, "success");
        checks.sessions = true;
      } else {
        this.logBot("   ⚠️  No master account configured (will use first account)", "warn");
        checks.sessions = true;
      }
    } catch (e) {
      this.logBot(`   ⚠️  Session check inconclusive: ${e.message}`, "warn");
      checks.sessions = true;
    }

    // Check 4: Config status
    this.logBot("📍 Check 4/4: Configuration status...", "info");
    try {
      const configs = this.bootstrapManager.getAccountConfigs();
      if (configs && configs.length > 0) {
        this.logBot(`   ✅ Account configuration valid (${configs.length} account(s) found)`, "success");
        checks.config = true;
      } else {
        this.logBot("   ❌ No accounts configured!", "error");
        checks.config = false;
      }
    } catch (e) {
      this.logBot(`   ❌ Config error: ${e.message}`, "error");
      checks.config = false;
    }

    // Summary
    this.logBot("\n───────────────────────────────────────────────────────────", "info");
    const passCount = Object.values(checks).filter(v => v).length;
    const totalCount = Object.keys(checks).length;
    
    if (passCount === totalCount) {
      this.logBot(`✅ All health checks passed (${passCount}/${totalCount})`, "success");
      this.logBot("   System is READY for account linking", "success");
      return true;
    } else {
      this.logBot(`⚠️  ${passCount}/${totalCount} health checks passed`, "warn");
      this.logBot("   Proceeding with caution...", "warn");
      return true; // Allow to proceed even with warnings
    }
  }

  /**
   * Cleanup existing browser processes and clients before linking
   */
  async cleanupExistingConnections(phoneNumber) {
    const recovery = getSessionRecovery({
      getFlowDeps: this.getFlowDeps, setupClientFlow,
      createClient: CreatingNewWhatsAppClient, accountClients: this.accountClients,
      accountConfigManager: this.accountConfigManager,
    });
    await recovery.stopAccount(phoneNumber);
    this.connectionManagers.delete(phoneNumber);
    return true;
  }

  /**
   * Initiate master account linking with full flow
   */
  async initiateMasterAccountLinking(linkingMethod) {
    if (linkingMethod !== undefined && !['code', 'qr'].includes(linkingMethod)) {
      this.logBot('Invalid linking method. Use code or qr.', 'error');
      return false;
    }
    if (this.isLinking) {
      this.logBot("⚠️  Linking already in progress. Please wait...", "warn");
      return false;
    }

    this.isLinking = true;

    try {
      // Step 1: Health check
      const healthOK = await this.runPreLinkingHealthCheck();
      if (!healthOK) {
        this.logBot("❌ Health check failed. Please resolve issues and try again.", "error");
        this.isLinking = false;
        return false;
      }

      // Step 2: Get master account
      const masterPhone = this.accountConfigManager?.getMasterPhoneNumber();
      const configs = this.bootstrapManager.getAccountConfigs();
      const masterConfig = masterPhone
        ? configs.find(config => config.phoneNumber === masterPhone)
        : configs.find(config => config.role === 'primary') || configs[0];

      if (!masterConfig) {
        this.logBot("❌ No master account configured!", "error");
        this.isLinking = false;
        return false;
      }

      this.logBot("\n═══════════════════════════════════════════════════════════", "info");
      this.logBot("🔗 INITIATING MASTER ACCOUNT LINKING", "info");
      this.logBot("═══════════════════════════════════════════════════════════\n", "info");
      
      this.logBot(`Master Account: ${masterConfig.displayName}`, "info");
      this.logBot(`Phone: ${masterConfig.phoneNumber}`, "info");
      this.logBot(`Role: ${masterConfig.role || 'primary'}`, "info");

      // Step 3: Cleanup existing connections
      const currentClient = this.accountClients.get(masterConfig.phoneNumber);
      if (currentClient && await currentClient.getState() === 'CONNECTED') {
        this.logBot('Master is already active; keeping the current session.', 'success');
        this.terminalHealthDashboard.requestDashboardRefresh?.();
        this.isLinking = false;
        return true;
      }
      await this.cleanupExistingConnections(masterConfig.phoneNumber);

      // Step 4: Create WhatsApp client
      this.logBot("📱 Creating WhatsApp client...", "info");
      const clientId = SessionManager.resolveClientId(
        masterConfig.phoneNumber,
        this.sessionStateManager.getDeviceMetadata(masterConfig.phoneNumber) || {},
        masterConfig,
      );
      const client = await CreatingNewWhatsAppClient(clientId);
      
      if (!client) {
        this.logBot("❌ Failed to create WhatsApp client", "error");
        this.isLinking = false;
        return false;
      }

      this.logBot("✅ WhatsApp client created successfully", "success");

      // Step 5: Register client
      this.accountClients.set(masterConfig.phoneNumber, client);
      this.sharedContext.accountClients.set(masterConfig.phoneNumber, client);
      
      // Update master reference
      this.sharedContext.setMasterRef(client);

      // Step 6: Register health monitoring
      this.clientHealthMonitor.registerClient(masterConfig.phoneNumber, client);
      this.logBot("✅ Health monitoring registered", "success");

      // Step 7: Add device tracking
      if (this.deviceLinkedManager) {
        this.deviceLinkedManager.addDevice(masterConfig.phoneNumber, {
          name: masterConfig.displayName,
          role: 'master',
        });
        this.terminalHealthDashboard.setMasterPhoneNumber(masterConfig.phoneNumber);
      }

      // Step 8: Setup client flow and choose a linking method.
      this.logBot("\n🎯 Starting device linking flow...", "info");
      this.logBot(linkingMethod
        ? `Using ${linkingMethod} for this linking attempt only.`
        : "Choose pairing code (default) or QR code in the terminal.", "info");
      this.logBot("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", "info");

      this.createDeviceStatusFile(masterConfig.phoneNumber);

      const flowDependencies = this.getFlowDeps();
      const flow = setupClientFlow(
        client,
        masterConfig.phoneNumber,
        clientId,
        { 
          isRestore: false, 
          displayName: masterConfig.displayName,
          linkingMethod,
          manualLinking: true 
        },
        flowDependencies
      );
      const initialized = await flow.initializationPromise;
      if (!initialized) {
        this.logBot("Master account linking did not initialize. Run 'link master' to retry.", "error");
        this.isLinking = false;
        return false;
      }

      // Save that we initiated linking
      await this.bootstrapManager.recordInitialization(masterConfig.id, true);

      this.logBot("\n✅ Linking flow initiated successfully", "success");
      this.logBot("Complete linking on your phone using the selected method.", "info");

      this.isLinking = false;
      return true;

    } catch (error) {
      this.logBot(`\n❌ Error during linking: ${error.message}`, "error");
      this.logBot("Stack:", "debug");
      this.logBot(error.stack, "debug");
      this.isLinking = false;
      return false;
    }
  }

  /**
   * Check if account is already linked
   */
  isAccountLinked(phoneNumber) {
    const client = this.accountClients.get(phoneNumber);
    const manager = this.connectionManagers.get(phoneNumber);
    return Boolean(client && manager?.client === client && manager.state === 'CONNECTED');
  }

  /**
   * Get linking status for all accounts
   */
  getLinkingStatus() {
    const configs = this.bootstrapManager.getAccountConfigs();
    return configs.map(config => ({
      name: config.displayName,
      phone: config.phoneNumber,
      linked: this.isAccountLinked(config.phoneNumber),
      role: config.role,
    }));
  }

  /**
   * Print status report
   */
  printStatusReport() {
    const status = this.getLinkingStatus();
    
    this.logBot("\n╔════════════════════════════════════════════════════════════╗", "info");
    this.logBot("║         📱 ACCOUNT LINKING STATUS REPORT                 ║", "info");
    this.logBot("╚════════════════════════════════════════════════════════════╝\n", "info");

    const linked = status.filter(s => s.linked).length;
    const total = status.length;

    this.logBot(`Total Accounts: ${total} | Linked: ${linked} | Pending: ${total - linked}`, "info");
    this.logBot("", "info");

    status.forEach((acc, idx) => {
      const icon = acc.linked ? "✅" : "❌";
      const linkStatus = acc.linked ? "CONNECTED" : "PENDING";
      this.logBot(`${icon} [${idx + 1}] ${acc.name} (${acc.phone}) - ${linkStatus}`, acc.linked ? "success" : "info");
    });

    this.logBot("", "info");
    this.logBot("To link master account:", "info");
    this.logBot("  Terminal: Type 'link master'", "info");
    this.logBot("  WhatsApp: Send '!link-master' to the bot", "info");
    this.logBot("", "info");
  }
}

export default ManualLinkingHandler;
