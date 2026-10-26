/**
 * Global Analyzer Utilities
 * Exposes ConversationAnalyzer functions globally for easy access
 * 
 * Usage in console:
 * - displayConversationStats() - Show stats
 * - clearConversationStats() - Clear stats
 * - getConversationStats() - Get raw stats object
 * 
 * Date: February 7, 2026 - Session 18
 */

import { getConversationAnalyzer } from './ConversationAnalyzer.js';

const analyzer = getConversationAnalyzer();

/**
 * Global function: Display conversation statistics
 */
global.displayConversationStats = function() {
  console.log('\n🔄 Requesting conversation statistics...\n');
  analyzer.displayStats();
};

/**
 * Global function: Clear conversation statistics
 */
global.clearConversationStats = function() {
  analyzer.clearStats();
};

/**
 * Global function: Get raw statistics object
 */
global.getConversationStats = function() {
  return analyzer.getStats();
};

/**
 * Global function: Get analyzer instance
 */
global.getAnalyzer = function() {
  return analyzer;
};

// Log that globals are available
console.log('\n' + '═'.repeat(70));
console.log('✅ CONVERSATION ANALYZER INITIALIZED');
console.log('═'.repeat(70));
console.log('\n📊 Available Commands:');
console.log('   • displayConversationStats() - Show message type statistics');
console.log('   • clearConversationStats() - Reset statistics');
console.log('   • getConversationStats() - Get raw stats object');
console.log('   • getAnalyzer() - Get analyzer instance');
console.log('\n💬 Message Type Logging:');
console.log('   ✅ Enabled - Shows type for every message received');
console.log('\n' + '═'.repeat(70) + '\n');

export { analyzer };
