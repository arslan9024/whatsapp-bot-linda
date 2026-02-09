/**
 * PHASE 6: Integration Example for index.js
 * 
 * This file shows the exact code to add to your index.js for complete
 * terminal-based health monitoring integration.
 * 
 * Copy the relevant sections into your main index.js file.
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: Add these imports to your index.js
// ═══════════════════════════════════════════════════════════════════════════

import express from 'express';
import AccountBootstrapManager from './code/utils/AccountBootstrapManager.js';
import DeviceRecoveryManager from './code/utils/DeviceRecoveryManager.js';
import AccountHealthMonitor from './code/utils/AccountHealthMonitor.js';
import HealthConsoleLogger from './code/utils/HealthConsoleLogger.js';
import HealthDashboardCLI from './code/utils/HealthDashboardCLI.js';
import HealthFileLogger from './code/utils/HealthFileLogger.js';

// ... other imports ...

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: Initialize health monitoring (after creating express app)
// ═══════════════════════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize health monitor
let healthMonitor = new AccountHealthMonitor();
let consoleLogger = new HealthConsoleLogger(healthMonitor);
let cliDashboard = new HealthDashboardCLI(healthMonitor);
let fileLogger = new HealthFileLogger(healthMonitor);

console.log('✅ Health monitoring modules initialized\n');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Register accounts with health monitor
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Register all active bot accounts with the health monitor
 * Call this after you initialize/load your WhatsApp bots
 */
function registerAccountsWithHealthMonitor(bots) {
  bots.forEach(bot => {
    // Register the bot's account with phone number and client instance
    healthMonitor.registerAccount(bot.phoneNumber, bot.client);
    console.log(`  📱 Registered ${bot.phoneNumber} with health monitor`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: Start monitoring function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Start all health monitoring modules
 * 
 * Intervals:
 * - Console Logger: 5 minutes (300000 ms) - Summary output
 * - CLI Dashboard: 10 seconds (10000 ms) - Real-time updates
 * - File Logger: 1 minute (60000 ms) - Detailed JSON logs
 * 
 * Adjust intervals based on your needs:
 * - Development: More frequent updates (console 5min, dashboard 10sec, file 1min)
 * - Production: Less frequent (console disabled, dashboard 30sec, file 5min)
 * - Debugging: Maximum frequency (console 1min, dashboard 5sec, file 30sec)
 */
async function startHealthMonitoring() {
  console.log('🏥 Starting health monitoring...\n');
  
  try {
    // Start Console Logger (colored output to terminal)
    // Shows: Account status, uptime, health metrics
    consoleLogger.startLogging(300000);  // Every 5 minutes
    console.log('  ✅ Console Logger: Active (every 5 minutes)');
    
    // Start CLI Dashboard (real-time terminal UI)
    // Shows: Live dashboard with account status and metrics
    cliDashboard.startDashboard(10000);  // Every 10 seconds
    console.log('  ✅ CLI Dashboard: Active (every 10 seconds)');
    
    // Start File Logger (rotating daily JSON logs)
    // Shows: Detailed logs written to logs/health/health-YYYY-MM-DD.log
    fileLogger.startLogging(60000);      // Every 1 minute
    console.log('  ✅ File Logger: Active (every 1 minute)');
    
    console.log('\n✅ Health monitoring fully operational!\n');
    console.log('📊 Monitor your bot accounts in the VSCode terminal:');
    console.log('   - Watch the live dashboard for real-time updates');
    console.log('   - Check console for periodic health summaries');
    console.log('   - Review logs/health/ for detailed analysis\n');
    
  } catch (error) {
    console.error('❌ Error starting health monitoring:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: Add to your existing server startup
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Modify your existing if (require.main === module) block like this:
 */

if (require.main === module) {
  const server = app.listen(PORT, async () => {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  🚀 WhatsApp Bot Server Starting...    ║`);
    console.log(`║     Port: ${PORT}                           ║`);
    console.log(`╚════════════════════════════════════════╝\n`);
    
    try {
      // 1. Bootstrap all accounts
      console.log('1️⃣  Bootstrapping accounts...');
      await AccountBootstrapManager.bootstrapAllAccounts();
      
      // 2. Register accounts with health monitor
      console.log('2️⃣  Registering accounts with health monitor...');
      // TODO: Replace 'bots' with your actual bots array
      registerAccountsWithHealthMonitor(bots);
      
      // 3. Start all recovery managers
      console.log('3️⃣  Starting device recovery managers...');
      await DeviceRecoveryManager.initializeRecovery();
      
      // 4. Start health monitoring
      console.log('4️⃣  Starting health monitoring...');
      await startHealthMonitoring();
      
      console.log('✅ Server ready!\n');
      
    } catch (error) {
      console.error('Error during startup:', error);
      process.exit(1);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: Graceful shutdown
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Add this to handle proper shutdown of monitoring
 * (or update your existing shutdown handler)
 */
process.on('SIGINT', async () => {
  console.log('\n\n╔════════════════════════════════════════╗');
  console.log('║  🛑 Shutting down server...             ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  try {
    // Stop all monitoring
    console.log('⏹️  Stopping health monitoring...');
    consoleLogger.stopLogging();
    cliDashboard.stopDashboard();
    fileLogger.stopLogging();
    console.log('  ✅ Monitoring stopped');
    
    // Write final snapshot
    console.log('💾 Writing final log snapshot...');
    await fileLogger.writeSnapshot('Server shutdown - Final health check');
    console.log('  ✅ Snapshot written');
    
    // Close server
    console.log('🔌 Closing server...');
    if (global.server) {
      global.server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle unhandled rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Try to log the error
  try {
    await fileLogger.writeSnapshot(`Unhandled Error: ${reason}`);
  } catch (e) {
    console.error('Could not write error snapshot:', e);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: Optional - Monitoring control endpoints (Express routes)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Optional: Add REST endpoints for monitoring control
 * Useful if you want to control monitoring from API calls
 */

// GET current health status
app.get('/health', (req, res) => {
  const metrics = healthMonitor.getMetrics();
  const statusData = healthMonitor.getAllAccountsStatus();
  
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    accounts: statusData,
    metrics: metrics
  });
});

// GET real-time dashboard data (for potential web dashboard later)
app.get('/health/dashboard', (req, res) => {
  const metrics = healthMonitor.getMetrics();
  const accounts = healthMonitor.getAllAccountsStatus();
  
  res.json({
    timestamp: new Date().toISOString(),
    totalAccounts: accounts.length,
    healthy: accounts.filter(a => a.status === 'HEALTHY').length,
    warning: accounts.filter(a => a.status === 'WARNING').length,
    critical: accounts.filter(a => a.status === 'CRITICAL').length,
    metrics: metrics,
    accounts: accounts
  });
});

// POST trigger a health check immediately
app.post('/health/check', async (req, res) => {
  try {
    const results = await healthMonitor.performHealthCheck();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST trigger recovery for a specific account
app.post('/health/recover/:phoneNumber', async (req, res) => {
  const { phoneNumber } = req.params;
  try {
    const result = await healthMonitor.triggerRecovery(phoneNumber);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: Optional - Custom monitoring config function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Use this function to switch between monitoring profiles
 */

function configureMonitoring(profile = 'development') {
  console.log(`\n🔧 Switching to ${profile} monitoring profile...\n`);
  
  // Stop current monitoring
  consoleLogger.stopLogging();
  cliDashboard.stopDashboard();
  fileLogger.stopLogging();
  
  // Profiles
  const profiles = {
    development: {
      console: 300000,   // 5 min - summaries
      dashboard: 10000,  // 10 sec - real-time
      file: 60000        // 1 min - detailed
    },
    production: {
      console: 0,        // Disabled
      dashboard: 30000,  // 30 sec - less refresh
      file: 300000       // 5 min - archives
    },
    debug: {
      console: 60000,    // 1 min - frequent
      dashboard: 5000,   // 5 sec - rapid
      file: 30000        // 30 sec - detailed
    }
  };
  
  const config = profiles[profile] || profiles.development;
  
  // Start with configured intervals
  if (config.console > 0) {
    consoleLogger.startLogging(config.console);
    console.log(`✅ Console Logger: ${config.console / 1000 / 60} minutes`);
  } else {
    console.log('⊘ Console Logger: Disabled');
  }
  
  if (config.dashboard > 0) {
    cliDashboard.startDashboard(config.dashboard);
    console.log(`✅ CLI Dashboard: ${config.dashboard / 1000} seconds`);
  }
  
  if (config.file > 0) {
    fileLogger.startLogging(config.file);
    console.log(`✅ File Logger: ${config.file / 1000} seconds`);
  }
  
  console.log();
}

// Export for use elsewhere if needed
export { healthMonitor, configureMonitoring, registerAccountsWithHealthMonitor };

// ═══════════════════════════════════════════════════════════════════════════
// DONE! 
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SUMMARY OF CHANGES:
 * 
 * 1. Added three import statements for the health monitoring modules
 * 2. Initialized the three loggers (consoleLogger, cliDashboard, fileLogger)
 * 3. Created registerAccountsWithHealthMonitor() function
 * 4. Created startHealthMonitoring() function
 * 5. Updated server startup to call registerAccountsWithHealthMonitor and startHealthMonitoring
 * 6. Added graceful shutdown to stop all loggers properly
 * 7. Added optional REST endpoints for monitoring control
 * 8. Added optional configureMonitoring() function for switching profiles
 * 
 * WHAT YOU GET:
 * ✅ Real-time terminal dashboard (updates every 10 seconds)
 * ✅ Colored console output (every 5 minutes)
 * ✅ Rolling daily JSON logs (every 1 minute)
 * ✅ Automatic log rotation
 * ✅ Graceful monitoring shutdown
 * ✅ REST API endpoints for monitoring control
 * ✅ Monitoring profile switching
 * 
 * NEXT STEPS:
 * 1. Copy relevant sections to your actual index.js
 * 2. Replace 'bots' variable with your actual bots array
 * 3. Run 'node test-phase-6-terminal-logging.js' to verify
 * 4. Start your server and watch the terminal dashboard!
 */
