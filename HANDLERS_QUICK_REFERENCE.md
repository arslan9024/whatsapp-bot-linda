# Linda WhatsApp Bot Handlers Quick Reference Card
## Phase 6 M2 Module 1 - Command & API Reference

**Version:** 1.0.0  
**Date:** February 26, 2026  
**Status:** Production Ready  

---

## 📚 Quick Access Guide

| Handler | File | Purpose | Key Methods |
|---------|------|---------|------------|
| 🎬 Media | AdvancedMediaHandler.js | Upload/download/compress media | uploadMedia, downloadMedia, compressMedia |
| 👥 Groups | GroupChatManager.js | Manage groups & broadcasts | createGroup, addParticipants, createBroadcastList |
| 📝 Templates | MessageTemplateEngine.js | Create templated messages | createTemplate, renderTemplate, renderBatchTemplates |
| 📦 Batch | MessageBatchProcessor.js | Send batches with rate limit | createBatch, addMessagesToBatch, processBatch |
| 🧠 Intelligence | ConversationIntelligenceEngine.js | Analyze conversations | analyzeConversation, analyzeSentiment, learnFromFeedback |
| 🔗 Accounts | WhatsAppMultiAccountManager.js | Multi-account support | addAccount, switchAccount, getRoutingAccount |
| ⚙️ Commands | CommandExecutor.js | Parse & execute commands | executeCommand, parseCommand, registerCommand |

---

## 🎬 AdvancedMediaHandler Quick Reference

### Key Methods

```javascript
// Upload media
await mediaHandler.uploadMedia(filePath);

// Download media
await mediaHandler.downloadMedia(mediaId);

// Compress media
await mediaHandler.compressMedia(media, quality);

// Validate format
mediaHandler.validateMediaFormat(file);

// Get metadata
await mediaHandler.getMediaMetadata(filePath);

// Get statistics
mediaHandler.getEngineStats();
```

### Constructor Options

```javascript
new AdvancedMediaHandler({
  maxFileSize: 50 * 1024 * 1024,        // 50MB
  supportedFormats: ['jpg', 'png', 'pdf', 'docx', 'mp3', 'mp4'],
  compressionQuality: 0.8,
  enableCaching: true,
  cacheTimeout: 24 * 60 * 60 * 1000     // 24 hours
})
```

### Supported Formats
```
Images: .jpg, .jpeg, .png, .gif, .webp
Documents: .pdf, .docx, .xlsx, .pptx
Audio: .mp3, .wav, .m4a, .ogg
Video: .mp4, .mov, .avi, .mkv
```

---

## 👥 GroupChatManager Quick Reference

### Key Methods

```javascript
// Create group
await groupManager.createGroup({
  name: 'Team Chat',
  description: 'Project discussion',
  participants: ['+1111111111', '+2222222222']
});

// Add participants
await groupManager.addParticipants(groupId, ['+3333333333']);

// Remove participants
await groupManager.removeParticipants(groupId, ['+4444444444']);

// Update group subject
await groupManager.updateGroupSubject(groupId, 'New Name');

// Create broadcast
await groupManager.createBroadcastList(recipients);

// Get group info
groupManager.getGroupInfo(groupId);

// Get statistics
groupManager.getEngineStats();
```

### Constructor Options

```javascript
new GroupChatManager({
  maxGroupParticipants: 250,
  maxBroadcastRecipients: 500,
  defaultMessageExpiration: 0,
  enableGroupNotifications: true,
  storeGroupMetadata: true
})
```

---

## 📝 MessageTemplateEngine Quick Reference

### Key Methods

```javascript
// Create template
templateEngine.createTemplate({
  name: 'order_confirmation',
  content: 'Order #{{orderId}} confirmed for {{customerName}}'
});

// Render template
const result = templateEngine.renderTemplate('order_confirmation', {
  orderId: '12345',
  customerName: 'John'
});

// Render batch
const batchResult = await templateEngine.renderBatchTemplates(
  'order_confirmation',
  recipients
);

// Get template
templateEngine.getTemplate(templateId);

// Update template
templateEngine.updateTemplate(templateId, { content: '...' });

// Delete template
templateEngine.deleteTemplate(templateId);

// List templates
templateEngine.listTemplates({ category: 'order' });

// Get statistics
templateEngine.getEngineStats();
```

### Template Syntax

```javascript
// Variable substitution
"Hello {{name}}, your order {{orderId}} is {{status}}"

// Conditional rendering
"{{#if isPremium}}Premium customer benefits:{{/if}} ..."

// Escaping
"Use \\{{var}} to escape {{ }}"
```

### Template Structure

```javascript
{
  name: 'template_name',           // Required
  content: '...{{variable}}...',   // Required
  category: 'order',               // Optional
  locale: 'en-US',                // Optional
  variables: ['variable', ...]    // Auto-extracted
}
```

---

## 📦 MessageBatchProcessor Quick Reference

### Key Methods

```javascript
// Create batch
const batch = batchProcessor.createBatch({
  name: 'Newsletter_Feb_2026',
  priority: 'normal'
});

// Add messages
batchProcessor.addMessagesToBatch(batch.batchId, [
  { id: 'msg1', to: '+1111111111', text: 'Hello' },
  { id: 'msg2', to: '+2222222222', text: 'Hi' }
]);

// Process batch
await batchProcessor.processBatch(batch.batchId, async (message) => {
  return await sendMessage(message);
});

// Get status
batchProcessor.getBatchStatus(batchId);

// List batches
batchProcessor.listBatches({ status: 'completed' });

// Get details
batchProcessor.getBatchDetails(batchId);

// Cancel batch
batchProcessor.cancelBatch(batchId);

// Get metrics
batchProcessor.getMetrics();
```

### Configuration

```javascript
new MessageBatchProcessor({
  maxConcurrentBatches: 3,
  maxMessagesPerBatch: 100,
  rateLimit: { messagesPerSecond: 10 },
  maxRetries: 3,
  initialDelay: 1000,              // ms
  maxDelay: 30000,                 // ms
  backoffMultiplier: 2
})
```

### Batch Lifecycle

```
pending → processing → completed
         ↑_____________↓
                error (with retries)
```

---

## 🧠 ConversationIntelligenceEngine Quick Reference

### Key Methods

```javascript
// Analyze conversation
const analysis = await intelligenceEngine.analyzeConversation(
  conversationId,
  messages
);

// Get insights
const insights = intelligenceEngine.getConversationInsights(conversationId);

// Learn from feedback
await intelligenceEngine.learnFromFeedback(conversationId, {
  rating: 5,
  comment: 'Great response!',
  helpful: true,
  improvements: ['faster', 'more detailed']
});

// Get statistics
intelligenceEngine.getLearningStats();
intelligenceEngine.getEngineStats();
```

### Analysis Output Structure

```javascript
{
  sentiment: {
    overall: 'positive|negative|neutral',
    score: -1.0 to 1.0,
    positive: count,
    neutral: count,
    negative: count
  },
  topics: [
    { topic: 'order', count: 4, relevance: '0.40' },
    ...
  ],
  intents: [
    { intent: 'help_request', confidence: 0.9 },
    ...
  ],
  patterns: { ... },
  engagement: { ... },
  summary: { ... }
}
```

### Message Format

```javascript
{
  id: 'msg_123',
  sender: 'user' | 'bot',
  text: 'message content',
  timestamp: new Date()
}
```

---

## 🔗 WhatsAppMultiAccountManager Quick Reference

### Key Methods

```javascript
// Add account
await accountManager.addAccount({
  phone: '+1234567890',
  displayName: 'Linda Master',
  type: 'master' | 'secondary'
});

// Remove account
await accountManager.removeAccount(accountId);

// Switch account
await accountManager.switchAccount(accountId);

// Get routing account
const account = accountManager.getRoutingAccount(contactId);

// Set routing preference
accountManager.setRoutingPreference(contactId, accountId);

// Link device
await accountManager.linkAccountToDevice(accountId, qrCodeCallback);

// Confirm linking
await accountManager.confirmDeviceLinking(accountId);

// Get status
const status = accountManager.getStatus();

// List accounts
accountManager.listAccounts({ type: 'secondary' });

// Get statistics
accountManager.getStatistics();
```

### Load Balancing Strategies

```javascript
new WhatsAppMultiAccountManager({
  loadBalancingStrategy: 'round-robin'  // or 'least-loaded', 'random', 'master-first'
})
```

### Account Structure

```javascript
{
  id: 'acc_123',
  phone: '+1234567890',
  displayName: 'Linda Master',
  type: 'master' | 'secondary',
  isPrimary: true,
  isActive: false,
  status: 'linked' | 'pending',
  metrics: {
    messagesSent: 100,
    messagesReceived: 50,
    connectionAttempts: 5,
    successfulConnections: 5,
    failedConnections: 0
  }
}
```

---

## ⚙️ CommandExecutor Quick Reference

### Command Format

```
/command [subcommand] [args...] [--flag value]
```

### WhatsApp Commands (`/whatsapp` or `/wa`)

```javascript
/whatsapp list                          // List all accounts
/whatsapp add <phone>                   // Add account
/whatsapp switch <phone>                // Switch account
/whatsapp status                        // Get status
/whatsapp send <number> <message>       // Send message
```

### Contacts Commands (`/contacts` or `/contact`)

```javascript
/contacts sync                          // Sync with Google Contacts
/contacts list --limit 10               // List contacts
/contacts add <name> <phone> [email]    // Add contact
/contacts update <id> <field> <value>   // Update contact
/contacts search <query>                // Search contacts
```

### Sheets Commands (`/sheets` or `/sheet`)

```javascript
/sheets list                            // List sheets
/sheets create <title> [headers]        // Create sheet
/sheets append <sheetId> [data]         // Append row
/sheets query <sheetId> <query>         // Query sheet
```

### Learning Commands (`/learn` or `/teach`)

```javascript
/learn add <text>                       // Add learning
/learn list                             // List learnings
/learn feedback <id> <rating> [comment] // Provide feedback
/learn insights <id>                    // Get insights
```

### System Commands

```javascript
/help [topic]                           // Display help
/status                                 // System status
```

### Execution Example

```javascript
const result = await commandExecutor.executeCommand(
  'user123',
  '/whatsapp send +1234567890 "Hello World"'
);

// Result:
{
  success: true,
  message: 'Message sent successfully',
  details: { ... }
}
```

---

## 🔧 Integration Patterns

### Pattern 1: Initialize All Handlers

```javascript
const integration = new LindaHandlerIntegration();

await integration.initializeAllHandlers({
  contactsService: require('./ContactsService'),
  sheetsService: require('./SheetsService')
});

// Access handlers
const { accountManager, templateEngine, batchProcessor } = integration.handlers;
```

### Pattern 2: Send Templated Batch

```javascript
// Create batch
const batch = batchProcessor.createBatch({ name: 'Newsletter' });

// Render templates
const messages = await templateEngine.renderBatchTemplates(
  'template_id',
  recipients
);

// Add and process
batchProcessor.addMessagesToBatch(batch.batchId, messages.messages);
await batchProcessor.processBatch(batch.batchId, messageHandler);
```

### Pattern 3: Multi-Account Routing

```javascript
// Setup accounts
await accountManager.addAccount({ phone: '+1111111111', type: 'master' });
await accountManager.addAccount({ phone: '+2222222222', type: 'secondary' });

// Route message
const account = accountManager.getRoutingAccount(contactId);
await sendMessage(account, recipient, message);

// Record activity for load balancing
accountManager.recordMessageActivity(account.id, 'sent');
```

### Pattern 4: Analyze & Learn

```javascript
// Analyze
const analysis = await intelligenceEngine.analyzeConversation(
  conversationId,
  messages
);

// React to sentiment
if (analysis.analysis.sentiment.negative > 0.5) {
  await escalateToSupport(conversationId);
}

// Learn from feedback
await intelligenceEngine.learnFromFeedback(conversationId, feedback);
```

---

## 📊 Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Render template | <5ms | Single template |
| Render 100 templates | <500ms | Batch rendering |
| Process 100 message batch | <10 sec | With 10 msg/sec rate limit |
| Analyze conversation | <100ms | Per conversation |
| Route message | <1ms | Account selection |
| Execute command | <200ms | Parse + execute |

---

## 🚨 Error Handling

All handlers implement consistent error handling:

```javascript
try {
  const result = await handler.method();
  return { success: true, result };
} catch (error) {
  logger.error('Operation failed', { error: error.message });
  return { success: false, error: error.message };
}
```

### Common Errors

| Error | Handler | Recovery |
|-------|---------|----------|
| File too large | MediaHandler | Reject and notify |
| Account not found | AccountManager | Use master account |
| Batch limit exceeded | BatchProcessor | Queue for next batch |
| Template parsing error | TemplateEngine | Return raw template |
| Rate limit reached | BatchProcessor | Retry with backoff |

---

## 🎯 Best Practices

1. **Initialize handlers in order:** Services → AccountManager → Others → CommandExecutor
2. **Use batch processing:** For >10 messages, use batchProcessor
3. **Leverage templates:** Create reusable templates for common messages
4. **Monitor metrics:** Check handler statistics regularly
5. **Error handling:** Always wrap handler calls in try-catch
6. **Logging:** Enable logging for debugging
7. **Load balancing:** Use least-loaded strategy for high volume
8. **Learning:** Collect feedback to improve responses

---

## 📞 Support & Resources

**Integration Guide:** See `HANDLERS_INTEGRATION_GUIDE.js`  
**Completion Report:** See `PHASE_6_M2_MODULE_1_COMPLETION.md`  
**Test Strategy:** See `PHASE_6_M2_TEST_STRATEGY.md`  

**Quick Start:**
```javascript
const LindaHandlerIntegration = require('./HANDLERS_INTEGRATION_GUIDE');
const integration = new LindaHandlerIntegration();
await integration.initializeAllHandlers({...});
```

---

**Version:** 1.0.0  
**Last Updated:** February 26, 2026  
**Status:** Production Ready  
**Location:** `code/WhatsAppBot/Handlers/`
