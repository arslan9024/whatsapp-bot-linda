#!/usr/bin/env node

/**
 * WhatsApp Linda Bot - Main Entry Point
 * Starts the complete bot system with all components
 * 
 * Usage:
 *   node bot-main.js
 *   node bot-main.js --config ./custom-config.json
 *   node bot-main.js --mode browser
 *   node bot-main.js --mode websocket
 *   node bot-main.js --mode hybrid
 */

import BotIntegration from './BotIntegration.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    configPath: null,
    mode: null,
    debug: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config':
        parsed.configPath = args[++i];
        break;
      case '--mode':
        parsed.mode = args[++i];
        break;
      case '--debug':
        parsed.debug = true;
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
    }
  }

  return parsed;
}

/**
 * Display help
 */
function displayHelp() {
  console.log(`
WhatsApp Linda Bot - Main Entry Point

Usage:
  node bot-main.js [options]

Options:
  --config <path>    Load configuration from file (default: use env vars)
  --mode <mode>      Set bot mode: browser, websocket, or hybrid (default: hybrid)
  --debug             Enable debug logging
  --help, -h          Show this help message

Examples:
  # Start with defaults (hybrid mode, env-based config)
  node bot-main.js

  # Start in specific mode
  node bot-main.js --mode browser
  node bot-main.js --mode websocket

  # Load custom config
  node bot-main.js --config ./bot-config.json

  # Debug mode
  node bot-main.js --debug

Environment Variables:
  NODE_ENV                 development|production
  DEBUG                    true|false
  BOT_MODE                 browser|websocket|hybrid
  BOT_SESSION_NAME         Session name (default: linda-bot)
  COMMAND_PREFIX           Command prefix (default: /)
  GOOGLE_SHEET_ID          Required: Google Sheets ID
  DATABASE_URL             MongoDB URL
  USE_IN_MEMORY_DB         true|false (for testing)
  API_URL                  API base URL (default: http://localhost:5000)
  WEBHOOK_PORT             Webhook server port (default: 3001)
  WEBHOOK_HOST             Webhook server host (default: localhost)
  LOG_LEVEL                debug|info|warn|error
  MAX_SESSIONS             Max concurrent sessions (default: 10000)
  SESSION_TIMEOUT          Session timeout in ms (default: 1200000)

For more information, see:
  - HYBRID_BOT_IMPLEMENTATION_GUIDE.md
  - HYBRID_BOT_ARCHITECTURE.md
  - BOT_COMPONENTS_REFERENCE.md
`);
}

/**
 * Setup signal handlers
 */
function setupSignalHandlers(bot) {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`\n\n🛑 Received ${signal}, gracefully shutting down...`);

      try {
        await bot.stop();
        console.log('✅ Bot stopped successfully');
        
        // Give some time for cleanup
        setTimeout(() => {
          process.exit(0);
        }, 1000);
      } catch (error) {
        console.error(`❌ Error during shutdown: ${error.message}`);
        process.exit(1);
      }
    });
  });
}

/**
 * Setup uncaught error handlers
 */
function setupErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:');
    console.error(error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    process.exit(1);
  });
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Parse arguments
    const args = parseArgs();

    if (args.help) {
      displayHelp();
      process.exit(0);
    }

    // Setup error handlers
    setupErrorHandlers();

    // Display startup info
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        🤖 WhatsApp Linda Bot - Hybrid Framework           ║
║                                                            ║
║  Starting bot with custom hybrid architecture combining   ║
║  whatsapp-web.js, Baileys, and Twilio capabilities       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

    // Log startup parameters
    console.log('Startup Parameters:');
    console.log(`  Config: ${args.configPath || 'Using environment variables'}`);
    console.log(`  Mode: ${args.mode || 'hybrid (auto-detect)'}`);
    console.log(`  Debug: ${args.debug ? 'Enabled' : 'Disabled'}`);
    console.log('');

    // Override mode if specified
    if (args.mode) {
      process.env.BOT_MODE = args.mode;
    }

    // Enable debug if specified
    if (args.debug) {
      process.env.DEBUG = 'true';
    }

    // Create and start bot integration
    const bot = new BotIntegration(args.configPath);
    
    console.log('🔧 Initializing bot components...\n');
    await bot.start();

    // Setup signal handlers for graceful shutdown
    setupSignalHandlers(bot);

    // Display health status
    console.log('\n📊 Bot Health Status:');
    const health = bot.getHealth();
    console.log(`  Running: ${health.running ? '✅' : '❌'}`);
    console.log(`  Connection Mode: ${health.connection.mode}`);
    console.log(`  Connected: ${health.connection.connected ? '✅' : '❌'}`);
    console.log(`  Webhook Server: Port ${health.webhook.port}`);
    console.log('');

    console.log('✨ Bot is ready! Waiting for messages...\n');

    // Keep process alive
    await new Promise(() => {
      // Process will only exit via signal handler
    });

  } catch (error) {
    console.error('❌ Fatal Error:');
    console.error(error.message);
    
    if (process.env.DEBUG === 'true') {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { main };
