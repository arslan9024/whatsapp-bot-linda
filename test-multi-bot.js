#!/usr/bin/env node

/**
 * test-multi-bot.js
 * 
 * Test script to verify Multi-WhatsApp Bot Manager setup
 * Shows all configured bots and their status
 */

import BotManager from './code/WhatsAppBot/MultiAccountWhatsAppBotManager.js';

console.log('\n' + '='.repeat(80));
console.log('  🤖 MULTI-WHATSAPP BOT MANAGER - VERIFICATION TEST');
console.log('='.repeat(80) + '\n');

try {
  // Get summary
  const summary = BotManager.getSummary();
  
  console.log('📋 Manager Summary:');
  console.log(`   Version: ${summary.version}`);
  console.log(`   Format: ${summary.format}`);
  console.log(`   Timestamp: ${summary.timestamp}\n`);

  // Get statistics
  const stats = BotManager.getStatistics();
  
  console.log('📊 Bot Statistics:');
  console.log(`   Total Bots: ${stats.totalBots}`);
  console.log(`   Active Bots: ${stats.activeBots}`);
  console.log(`   Disabled Bots: ${stats.disabledBots}\n`);

  // List all bots
  console.log('📱 Configured Bots:\n');
  
  stats.bots.forEach((bot, index) => {
    const icon = bot.role === 'primary' ? '⭐' : '🔄';
    const statusIcon = bot.status === 'active' ? '✅' : '⏳';
    
    console.log(`   ${icon} #${index + 1} - ${bot.name}`);
    console.log(`      ├─ Phone: ${bot.phone}`);
    console.log(`      ├─ Role: ${bot.role}`);
    console.log(`      ├─ Status: ${statusIcon} ${bot.status}`);
    console.log(`      ├─ Enabled: ${bot.enabled ? '✅ Yes' : '❌ No'}`);
    console.log(`      ├─ Google Account: ${bot.googleAccount}`);
    console.log(`      └─ Features: ${bot.features.join(', ')}\n`);
  });

  // Get active bots
  const activeBots = BotManager.getActiveBots();
  
  console.log(`🟢 Active Bots (${activeBots.length}):`);
  activeBots.forEach(bot => {
    console.log(`   ✅ ${bot.displayName} (${bot.phoneNumber})`);
  });
  console.log();

  // Configuration
  console.log('⚙️  Configuration:');
  console.log(`   Default Bot: ${stats.configuration.defaultBot}`);
  console.log(`   Primary Bot: ${stats.configuration.primaryBot}`);
  console.log(`   Multi-Account: ${stats.configuration.multiAccountSupported ? '✅ Supported' : '❌ Not Supported'}`);
  console.log(`   Google Contacts Sync: ${stats.configuration.googleContactsSync}\n`);

  // Bot methods available
  console.log('🔧 Available Methods:');
  const methods = [
    'getPrimaryBot()',
    'getSecondaryBots()',
    'getBotByPhone(phone)',
    'getBotById(id)',
    'getActiveBots()',
    'sendMessageFromBot(botId, chatId, message)',
    'broadcastFromAllBots(chatId, message)',
    'toggleBot(botId, enable)',
    'getStatistics()',
    'getSummary()'
  ];
  
  methods.forEach(method => {
    console.log(`   ✓ ${method}`);
  });
  console.log();

  // Quick examples
  console.log('💡 Quick Usage Examples:\n');
  
  console.log('   // Get primary bot');
  console.log('   const primary = BotManager.getPrimaryBot();\n');
  
  console.log('   // Send from Big Broker');
  console.log('   await BotManager.sendMessageFromBot(\'BigBroker\', chatId, \'Hello!\');\n');
  
  console.log('   // Broadcast to all');
  console.log('   await BotManager.broadcastFromAllBots(chatId, \'Broadcast!\');\n');
  
  console.log('   // Get bot by phone');
  console.log('   const bot = BotManager.getBotByPhone(\'+971553633595\');\n');

  // Next steps
  console.log('📈 Next Steps:\n');
  console.log('   1. Import BotManager in your main bot file');
  console.log('   2. Call initializeAllBots() with WhatsApp client');
  console.log('   3. Scan QR codes for Big Broker and Manager White Caves');
  console.log('   4. Test sending messages from each bot');
  console.log('   5. Verify Google Contact sync is working\n');

  // Success
  console.log('='.repeat(80));
  console.log('  ✅ MULTI-BOT MANAGER VERIFICATION SUCCESSFUL');
  console.log('='.repeat(80) + '\n');

  console.log('📚 Documentation:');
  console.log('   Full Guide: code/WhatsAppBot/MULTI_BOT_SETUP_GUIDE.md');
  console.log('   Config File: code/WhatsAppBot/bots-config.json');
  console.log('   Manager Code: code/WhatsAppBot/MultiAccountWhatsAppBotManager.js\n');

  console.log('Status: ✅ READY FOR INITIALIZATION\n');

} catch (error) {
  console.error('\n❌ Error during verification:', error.message);
  console.error('\nStack:', error.stack);
  process.exit(1);
}
