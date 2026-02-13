const ConversationIntelligenceEngine = require('./code/WhatsAppBot/Handlers/ConversationIntelligenceEngine');

const engine = new ConversationIntelligenceEngine();

const messages = [
  { body: 'The product is okay' },
  { body: 'Actually, it is getting better' },
  { body: 'I really love it now!' }
];

console.log('Testing sentiment analysis:');
for (const msg of messages) {
  const analysis = engine.analyzeSentiment([msg]);
  console.log(`Message: '${msg.body}'`);
  console.log(`  Overall: ${analysis.overall}`);
  console.log(`  Score: ${analysis.score}`);
  console.log(`  Details:`, analysis.details[0]);
  console.log('');
}

// Also test the getSentimentTrend scenario
console.log('\n\nTesting getSentimentTrend scenario:');

const mockContact = { id: 'test-user-123' };
const mockBotContext = { contact: mockContact };

// Simulate the test flow
(async () => {
  for (const msg of messages) {
    await engine.addToHistory(msg, mockBotContext);
  }

  const trends = engine.getSentimentTrend(mockContact.id);
  console.log('Sentiment Trend:');
  console.log('  Trend:', trends.trend);
  console.log('  Trajectory:', trends.trajectory);
  console.log('  Summary:', trends.summary);
  console.log('  Data Points:', trends.dataPoints);
})();
