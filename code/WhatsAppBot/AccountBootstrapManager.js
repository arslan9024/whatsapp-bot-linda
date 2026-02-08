/**
 * AccountBootstrapManager.js
 * 
 * Manages multi-account WhatsApp bot initialization
 * - Initializes accounts sequentially (prevents race conditions)
 * - Resolves account dependencies
 * - Tracks initialization progress
 * - Integrates with SessionStateManager for recovery
 * 
 * Version: 1.0
 * Created: February 9, 2026
 * Status: Production Ready
 */

import fs from "fs/promises";
import path from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import sessionStateManager from "../utils/SessionStateManager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BOTS_CONFIG_FILE = path.join(__dirname, "bots-config.json");

class AccountBootstrapManager {
  constructor() {
    this.botsConfig = null;
    this.initializedAccounts = [];
    this.accountToClient = new Map(); // Map accountId → client instance
    this.initializationProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      startTime: null,
      endTime: null,
    };
  }

  /**
   * Load bot configuration from bots-config.json
   */
  async loadBotsConfig() {
    try {
      if (!existsSync(BOTS_CONFIG_FILE)) {
        throw new Error(`Config file not found: ${BOTS_CONFIG_FILE}`);
      }

      const configData = readFileSync(BOTS_CONFIG_FILE, "utf-8");
      this.botsConfig = JSON.parse(configData);

      // Validate required fields
      if (!this.botsConfig.whatsappBots) {
        throw new Error("Invalid config: missing 'whatsappBots' property");
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to load bots config: ${error.message}`);
      return false;
    }
  }

  /**
   * Get list of enabled bots in priority order
   */
  getEnabledBotsList() {
    if (!this.botsConfig) return [];

    const bots = [];
    for (const [name, config] of Object.entries(this.botsConfig.whatsappBots)) {
      if (config.enabled !== false) {
        bots.push({
          id: config.id,
          phoneNumber: config.phoneNumber,
          displayName: config.displayName,
          role: config.role || "secondary",
          sessionPath: config.sessionPath,
          config, // Full config reference
        });
      }
    }

    // Sort by role priority: primary, secondary, tertiary
    const rolePriority = { primary: 0, secondary: 1, tertiary: 2 };
    return bots.sort((a, b) => {
      const priorityA = rolePriority[a.role] ?? 99;
      const priorityB = rolePriority[b.role] ?? 99;
      return priorityA - priorityB;
    });
  }

  /**
   * Initialize all accounts sequentially
   * Returns map of accountId -> { client, config, recovered }
   */
  async initializeAllAccounts(clientFactory, options = {}) {
    try {
      // Load config
      const configLoaded = await this.loadBotsConfig();
      if (!configLoaded) {
        throw new Error("Failed to load bots configuration");
      }

      const bots = this.getEnabledBotsList();
      if (bots.length === 0) {
        console.warn("⚠️  No enabled bots found in configuration");
        return this.accountToClient;
      }

      this.initializationProgress = {
        total: bots.length,
        completed: 0,
        failed: 0,
        startTime: new Date(),
        endTime: null,
      };

      console.log(`\n${"═".repeat(60)}`);
      console.log(`🤖 BOOTSTRAP: Initializing ${bots.length} account(s)...`);
      console.log(`${"═".repeat(60)}\n`);

      // Initialize each account sequentially
      for (let index = 0; index < bots.length; index++) {
        const bot = bots[index];
        const accountNum = index + 1;

        console.log(`[${accountNum}/${bots.length}] Initializing: ${bot.displayName}`);

        const result = await this.bootAccount(bot, clientFactory, options);

        if (result.success) {
          this.accountToClient.set(bot.id, result);
          this.initializedAccounts.push({
            accountId: bot.id,
            phoneNumber: bot.phoneNumber,
            displayName: bot.displayName,
            recovered: result.recovered || false,
            timestamp: new Date().toISOString(),
          });
          this.initializationProgress.completed++;
          console.log(`  ✅ Ready: ${bot.displayName}\n`);
        } else {
          this.initializationProgress.failed++;
          console.log(`  ❌ Failed: ${result.error || "Unknown error"}\n`);
        }

        // Small delay between accounts to prevent issues
        if (index < bots.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      this.initializationProgress.endTime = new Date();

      // Print summary
      this._printBootstrapSummary();

      return this.accountToClient;
    } catch (error) {
      console.error(`❌ Bootstrap failed: ${error.message}`);
      return this.accountToClient;
    }
  }

  /**
   * Initialize a single account
   */
  async bootAccount(botInfo, clientFactory, options = {}) {
    try {
      const { id: accountId, phoneNumber, displayName, config } = botInfo;

      // Step 1: Check if account should be recovered
      const recoveryAccounts = await sessionStateManager.getAccountsToRecover();
      const shouldRecover = recoveryAccounts.some((acc) => acc.accountId === accountId);

      if (shouldRecover && !options.forceNewQR) {
        // Attempt recovery using existing session
        console.log(`    📂 Attempting to recover existing session...`);

        try {
          // Validate session exists
          const validation = await sessionStateManager.validateSession(accountId);

          if (validation.valid) {
            console.log(`    ✓ Session validated (Last activity: ${validation.estimatedAge} ago)`);
            // Client factory will handle session restoration
            const client = await clientFactory(phoneNumber);

            if (client) {
              // Save successful recovery
              await sessionStateManager.markRecoverySuccess(accountId);

              return {
                success: true,
                client,
                accountId,
                phoneNumber,
                displayName,
                recovered: true,
                timestamp: new Date().toISOString(),
              };
            }
          } else {
            console.log(`    ⚠️  Session invalid: ${validation.reason}`);
            // Fall through to new linking
          }
        } catch (error) {
          console.log(`    ⚠️  Recovery failed: ${error.message}`);
          // Fall through to new linking
        }
      }

      // Step 2: New account linking (QR code required)
      console.log(`    📱 Requesting new device link...`);
      const client = await clientFactory(phoneNumber);

      if (client) {
        // Initialize session state for new account
        await sessionStateManager.saveAccountState(accountId, {
          phoneNumber,
          displayName,
          deviceLinked: false,
          isActive: false,
          sessionPath: config.sessionPath,
          lastKnownState: "initializing",
          recoveryAttempts: 0,
        });

        return {
          success: true,
          client,
          accountId,
          phoneNumber,
          displayName,
          recovered: false,
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new Error("Failed to create WhatsApp client");
      }
    } catch (error) {
      // Record failed recovery attempt
      await sessionStateManager.markRecoveryFailed(botInfo.id, error);

      return {
        success: false,
        error: error.message,
        accountId: botInfo.id,
        phoneNumber: botInfo.phoneNumber,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get account by ID
   */
  getAccount(accountId) {
    return this.accountToClient.get(accountId) || null;
  }

  /**
   * Get all initialized accounts
   */
  getAllAccounts() {
    return Array.from(this.accountToClient.values());
  }

  /**
   * Get account initialization status
   */
  getInitializationStatus() {
    return {
      ...this.initializationProgress,
      accounts: this.initializedAccounts,
      successRate: this.initializationProgress.total > 0
        ? ((this.initializationProgress.completed / this.initializationProgress.total) * 100).toFixed(1) + "%"
        : "N/A",
    };
  }

  /**
   * Keep all accounts alive with periodic activity
   */
  async startKeepAliveMonitor(interval = 60000) {
    // Monitor every minute by default
    setInterval(async () => {
      try {
        const accounts = this.getAllAccounts();

        for (const account of accounts) {
          if (account.client && account.client.info) {
            // Account is still responsive
            const state = sessionStateManager.getAccountState(account.accountId);
            if (state) {
              state.lastPing = new Date().toISOString();
              await sessionStateManager.saveAccountState(account.accountId, state);
            }
          }
        }
      } catch (error) {
        // Silent fail - keep-alive is non-critical
      }
    }, interval);

    console.log(`⏱️  Keep-alive monitor started (${interval / 1000}s interval)`);
  }

  /**
   * Resolve dependencies between accounts
   * Some accounts may depend on others being ready first
   */
  async resolveDependencies() {
    try {
      const bots = this.getEnabledBotsList();

      for (const bot of bots) {
        const deps = bot.config.dependencies || [];

        for (const depId of deps) {
          // Check if dependency is ready
          const depAccount = this.getAccount(depId);

          if (!depAccount) {
            console.warn(
              `⚠️  Account ${bot.id} depends on ${depId}, which is not ready`
            );
          }
        }
      }

      return true;
    } catch (error) {
      console.error(`⚠️  Dependency resolution error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get bootstrap report
   */
  getBootstrapReport() {
    const status = this.getInitializationStatus();
    const timeTaken = status.startTime && status.endTime
      ? ((status.endTime - status.startTime) / 1000).toFixed(1) + "s"
      : "In progress";

    return {
      status: status.completed === status.total ? "Complete" : "In Progress",
      totalAccounts: status.total,
      successfulAccounts: status.completed,
      failedAccounts: status.failed,
      successRate: status.successRate,
      timeTaken,
      accounts: status.accounts,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Private: Print bootstrap summary
   */
  _printBootstrapSummary() {
    const status = this.getInitializationStatus();
    const timeTaken = ((status.endTime - status.startTime) / 1000).toFixed(1);

    console.log(`${"═".repeat(60)}`);
    console.log("📊 BOOTSTRAP SUMMARY");
    console.log(`${"═".repeat(60)}`);
    console.log(`✅ Successfully initialized: ${status.completed}/${status.total}`);
    console.log(`❌ Failed: ${status.failed}`);
    console.log(`📈 Success rate: ${status.successRate}`);
    console.log(`⏱️  Time taken: ${timeTaken}s`);
    console.log(`${"═".repeat(60)}\n`);
  }
}

// Create singleton instance
const bootstrapManager = new AccountBootstrapManager();

export default bootstrapManager;
export { AccountBootstrapManager };
