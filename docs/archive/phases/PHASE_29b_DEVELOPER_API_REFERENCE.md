# Phase 29b: Minimal Schema - Developer API Reference

**Quick Reference**  
For developers integrating the minimal database layer

---

## 📦 DatabaseManager API

### Import & Initialize

```javascript
import DatabaseManager from './code/utils/DatabaseManager.js';

const db = new DatabaseManager({
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-bot'
});

await db.connect();
```

---

## 📕 Account Operations

### Create/Update Account

```javascript
const account = await db.upsertAccount(phoneNumber, {
  displayName: 'My Account',
  status: 'linked',
  linkedAt: new Date(),
  googleServiceAccount: 'goraha',
  googleContactCount: 342,
  sessionPath: './sessions/5491122334455',
  deviceIP: '192.168.1.100',
  batteryLevel: 85,
  connectionStatus: 'connected'
});
```

**Returns**: Account document with all fields

### Get Account

```javascript
const account = await db.getAccount(phoneNumber);
// Returns: Account object or null
```

### Update Account Status

```javascript
await db.upsertAccount(phoneNumber, {
  status: 'error',
  lastActivity: new Date(),
  errorCount: 3
});
```

---

## 🔗 Contact Reference Operations

### Add Single Contact

```javascript
const ref = await ContactReference.create({
  accountPhone: '+5491122334455',
  phoneNumber: '+1234567890',
  displayName: 'John Doe',
  source: 'whatsapp'
});
```

**Fields**:
- `accountPhone` (required): The WhatsApp account phone
- `phoneNumber` (required): Contact phone number
- `displayName` (optional): Display name for UI
- `source` (optional): 'whatsapp', 'import', 'manual', etc.

### Add Multiple Contacts (Bulk)

```javascript
const refs = await ContactReference.insertMany([
  { accountPhone: '+549...', phoneNumber: '+123...', displayName: 'Contact 1' },
  { accountPhone: '+549...', phoneNumber: '+456...', displayName: 'Contact 2' },
  // ... more
]);
```

### Query Contact References

```javascript
// Get all contacts for an account
const refs = await ContactReference.find({ 
  accountPhone: '+5491122334455' 
});

// Get specific contact
const ref = await ContactReference.findOne({
  accountPhone: '+5491122334455',
  phoneNumber: '+1234567890'
});

// Count contacts for account
const count = await ContactReference.countDocuments({
  accountPhone: '+5491122334455'
});
```

### Delete Contact Reference

```javascript
await ContactReference.deleteOne({
  accountPhone: '+5491122334455',
  phoneNumber: '+1234567890'
});
```

---

## 📋 Session Operations

### Start Session

```javascript
const session = await db.startSession(accountPhone, {
  status: 'active',
  cpuUsage: 12.5,
  memoryUsage: 150
});

// session._id is the session ID for later use
```

### End Session

```javascript
await db.endSession(sessionId, 'normal', {
  reason: 'User disconnected',
  finalCpuUsage: 8.2
});
```

### Add Event to Session

```javascript
await Session.findByIdAndUpdate(sessionId, {
  $push: {
    events: {
      event: 'reconnect_success',
      timestamp: new Date(),
      data: { attemptNumber: 3 }
    }
  }
});
```

### Query Sessions

```javascript
// Get all sessions for account
const sessions = await Session.find({ 
  accountPhone: '+5491122334455' 
});

// Get active sessions
const active = await Session.find({
  accountPhone: '+5491122334455',
  status: 'active'
});

// Get sessions from last 24 hours
const recent = await Session.find({
  accountPhone: '+5491122334455',
  startedAt: { 
    $gte: new Date(Date.now() - 24*60*60*1000) 
  }
});
```

---

## ⚠️ Error Logging

### Log an Error

```javascript
await db.logError(
  'error',  // Level: 'info', 'warn', 'error', 'fatal'
  'Failed to connect to WhatsApp',  // Message
  {  // Context (optional)
    accountPhone: '+5491122334455',
    errorCode: 'CONN_TIMEOUT'
  },
  stackTrace  // Stack trace (optional)
);
```

### Query Errors

```javascript
// Get unresolved errors
const errors = await ErrorLog.find({ 
  resolved: false 
}).limit(10);

// Get recent errors
const recent = await ErrorLog.find({
  level: 'error',
  createdAt: { 
    $gte: new Date(Date.now() - 24*60*60*1000) 
  }
});

// Count errors by account
const count = await ErrorLog.countDocuments({ 
  accountPhone: '+5491122334455' 
});
```

### Mark Error as Resolved

```javascript
await ErrorLog.findByIdAndUpdate(errorId, { 
  resolved: true 
});
```

---

## 📊 Health & Status

### Get Database Health

```javascript
const health = await db.getHealthStatus();
// Returns:
// {
//   connected: true,
//   database: 'whatsapp-bot',
//   accounts: 5,
//   activeSessions: 2,
//   contactReferences: 342,
//   unresolvedErrors: 1,
//   timestamp: Date
// }
```

### Export Account Data

```javascript
const backup = await db.exportData(phoneNumber);
// Returns:
// {
//   account: { ... },
//   sessions: [ ... ],
//   contactReferences: [ ... ],
//   exportedAt: Date
// }
```

### Prune Old Data

```javascript
// Delete sessions and errors older than 90 days
const cleanup = await db.pruneOldData(90);
// Returns: { sessionsDeleted: N, errorsDeleted: M }
```

---

## 💾 PersistenceAdapter API

### Initialize

```javascript
import PersistenceAdapter from './code/utils/PersistenceAdapter.js';

const persistence = new PersistenceAdapter(db);
await persistence.initialize();
```

### Account Hooks

```javascript
// When account is linked
await persistence.onAccountLinked(phoneNumber, {
  displayName: 'My Account',
  sessionPath: './sessions/5491...'
});

// When account status changes
await persistence.onAccountStatusChange(phoneNumber, 'error', {
  lastError: 'Connection failed'
});

// Update account stats
await persistence.onAccountStatsUpdate(phoneNumber, {
  messageCount: 1234,
  totalUptime: 4320,  // minutes
  errorCount: 5
});
```

### Session Hooks

```javascript
// When session starts
const session = await persistence.onSessionStart(accountPhone, {
  deviceIP: '192.168.1.100'
});

// When session ends
await persistence.onSessionEnd(sessionId, 'normal');
```

### Error Hook

```javascript
// Log error from anywhere
await persistence.onError('error', 'Something went wrong', {
  accountPhone: '+5491122334455',
  operation: 'message_send'
}, stackTrace);
```

### Account History

```javascript
// Get account with recent sessions
const history = await persistence.getAccountHistory(phoneNumber);
// Returns: { account, sessions }
```

### Get Health Status

```javascript
const status = await persistence.getHealthStatus();
// Same as db.getHealthStatus() plus:
// status.activeSessions = number of active sessions in memory
// status.trackedAccounts = number of accounts being tracked
```

### Shutdown

```javascript
// Graceful shutdown
await persistence.shutdown();
// - Closes all active sessions
// - Disconnects from MongoDB
// - Flushes pending writes
```

---

## ❌ Removed Methods (Pre-Refactor)

These methods **no longer exist** in the minimal schema:

```javascript
// ❌ REMOVED - Messages not stored in DB
db.logMessage(messageData)
db.getMessages(phone, options)
db.getMessageCount(phone)
db.bulkLogMessages(messages)
adapter.onMessageReceived(phone, message)
adapter.onMessageSent(phone, toPhone, body)
adapter.logBulkMessages(messages)

// ❌ REMOVED - Use Google Contacts API instead
db.getContacts(phone)
db.addContact(phone, contactData)
db.updateContact(phone, contactPhone, data)
```

---

## 📍 Usage Examples

### Example 1: Link a WhatsApp Account

```javascript
const phoneNumber = '+5491122334455';

// Account linked
await persistence.onAccountLinked(phoneNumber, {
  displayName: 'My WhatsApp',
  sessionPath: './sessions/5491122334455'
});

// Start session
const session = await persistence.onSessionStart(phoneNumber);

// Account now in DB ✅
const account = await db.getAccount(phoneNumber);
console.log(account.status); // 'linked'
```

### Example 2: Track Connection Issues

```javascript
try {
  // Try to connect
  await client.initialize();
} catch (error) {
  // Log error
  await persistence.onError('error', 'Connection failed', {
    accountPhone: phoneNumber,
    errorCode: error.code
  }, error.stack);
  
  // Update status
  await persistence.onAccountStatusChange(phoneNumber, 'error', {
    lastError: error.message
  });
}
```

### Example 3: Dashboard Health Check

```javascript
const health = await persistence.getHealthStatus();

console.log(`📊 Database Status:`);
console.log(`  Connected: ${health.connected}`);
console.log(`  Accounts: ${health.accounts}`);
console.log(`  Active Sessions: ${health.activeSessions}`);
console.log(`  Unresolved Errors: ${health.unresolvedErrors}`);
```

### Example 4: Store Contact Reference

```javascript
// When we discover a new contact in WhatsApp
const contact = message.getContact();

// Store minimal reference
await ContactReference.create({
  accountPhone: phoneNumber,
  phoneNumber: contact.number,
  displayName: contact.name,
  source: 'whatsapp'
});

// Later, when we need full contact details
const ref = await ContactReference.findOne({ 
  phoneNumber: contact.number 
});
const fullContact = await googleServiceAccount.getContact(ref.phoneNumber);
```

---

## 🔑 Important Notes

1. **No Message Storage**: Messages are in WhatsApp Web.js, not in DB
2. **No Full Contacts**: Use Google Contacts API, DB only stores phone refs
3. **Graceful Degradation**: DB optional - bot works without it
4. **TTL Auto-Cleanup**: ErrorLog auto-deletes after 90 days
5. **Type Safety**: Use TypeScript for better IDE support

---

## 📚 See Also

- `PHASE_29b_DATABASE_COMPLETE.md` - Full documentation
- `PHASE_29b_MINIMAL_SCHEMA_REFACTORING.md` - Why schema was refactored
- `test-phase-29b-database.js` - Integration tests & usage examples

---

**Last Updated**: February 19, 2026  
**Version**: Phase 29b (Minimal Schema)
