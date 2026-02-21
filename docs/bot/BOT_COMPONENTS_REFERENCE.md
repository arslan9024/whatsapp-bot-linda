# WhatsApp Bot Framework - Component Reference

## Complete API Reference for All Components

---

## CustomBotEngine

**Module**: `bot/CustomBotEngine.js`  
**Responsibility**: Core processing engine with queue management, statistics, and event emission

### Constructor

```javascript
new CustomBotEngine(config)
```

**Parameters**:
- `config` (Object)
  - `name` (String): Engine name, default: "Bot"
  - `version` (String): Version, default: "1.0.0"
  - `maxMessageQueueSize` (Number): Max queue size, default: 1000

**Example**:
```javascript
const engine = new CustomBotEngine({
  name: 'Linda Property Bot',
  version: '1.0.0',
  maxMessageQueueSize: 1000
});
```

### Methods

#### `start()`
Starts the engine and begins processing loops.

**Returns**: `Promise<void>`

```javascript
await engine.start();
```

---

#### `stop()`
Stops the engine and cleans up resources.

**Returns**: `Promise<void>`

```javascript
await engine.stop();
```

---

#### `send(message)`
Queue a message for processing.

**Parameters**:
- `message` (Object): Message to queue
  - `type` (String): Message type (required)
  - `data` (Any): Message data

**Returns**: `boolean` - true if queued, false if queue full

**Example**:
```javascript
const queued = engine.send({
  type: 'message',
  data: { from: '123', body: 'hello' }
});
```

---

#### `getStats()`
Get engine statistics.

**Returns**: `Object`
```javascript
{
  status: 'running'|'stopped',
  messagesProcessed: Number,
  commandsExecuted: Number,
  errorsEncountered: Number,
  uptime: Number,
  queueSize: Number,
  avgProcessingTime: Number
}
```

---

#### `on(event, callback)`
Register event listener.

**Parameters**:
- `event` (String): Event name
- `callback` (Function): Handler function

**Supported Events**:
- `ready` - Engine initialized
- `error` - Error occurred
- `message` - Message processed
- `command` - Command executed
- `health-check` - Health check performed

---

## BotConnection

**Module**: `bot/BotConnection.js`  
**Responsibility**: Handle different WhatsApp connection modes with automatic fallback

### Constructor

```javascript
new BotConnection(config)
```

**Parameters**:
- `config` (Object)
  - `mode` (String): 'browser', 'websocket', or 'hybrid'
  - `sessionName` (String): Session identifier

**Example**:
```javascript
const conn = new BotConnection({
  mode: 'hybrid',
  sessionName: 'linda-bot'
});
```

### Methods

#### `connect()`
Establish WhatsApp connection using configured mode.

**Returns**: `Promise<void>`

```javascript
await conn.connect();
```

---

#### `sendMessage(chatId, text, options)`
Send a message.

**Parameters**:
- `chatId` (String): Chat/Group ID (e.g., "+971501234567")
- `text` (String): Message text
- `options` (Object): Optional parameters

**Returns**: `Promise<Object>`
```javascript
{ chatId, text, sent: true }
```

**Example**:
```javascript
await conn.sendMessage('+971501234567', 'Hello!', {
  mentions: ['+971509876543']
});
```

---

#### `disconnect()`
Close WhatsApp connection.

**Returns**: `Promise<void>`

```javascript
await conn.disconnect();
```

---

#### `getUptime()`
Get connection uptime in milliseconds.

**Returns**: `number`

```javascript
const uptime = conn.getUptime();
console.log(`Connected for ${uptime / 1000}s`);
```

---

#### `on(event, callback)`
Register event listener.

**Parameters**:
- `event` (String): Event name
- `callback` (Function): Handler function

**Supported Events**:
- `authenticated` - Connection established
- `qr` - QR code ready (browser mode)
- `message` - New message received
- `disconnected` - Connection lost
- `error` - Error occurred

**Example**:
```javascript
conn.on('message', (msg) => {
  console.log(msg.from, msg.body);
});
```

---

## MessageHandler

**Module**: `bot/MessageHandler.js`  
**Responsibility**: Parse messages, extract entities, classify content, detect intent

### Constructor

```javascript
new MessageHandler(config)
```

**Parameters**:
- `config` (Object)
  - `commandPrefix` (String): Command character, default: "/"
  - `maxRetries` (Number): Retry attempts, default: 3

### Methods

#### `process(rawMessage)`
Process incoming message asynchronously.

**Parameters**:
- `rawMessage` (Object): Raw message from connection

**Returns**: `Promise<void>` (emits 'processed' event)

```javascript
await handler.process(rawMessage);
handler.on('processed', (msg) => {
  console.log(msg.command); // Command if any
});
```

---

#### `parseMessage(rawMessage)`
Parse raw message into structured format.

**Parameters**:
- `rawMessage` (Object)

**Returns**: `Object`
```javascript
{
  id: String,
  timestamp: Number,
  from: String,
  sender: String,
  isGroup: Boolean,
  text: String,
  isCommand: Boolean,
  command: String|null,
  args: Array,
  entities: {
    mentions: Array,
    hashtags: Array,
    urls: Array,
    emails: Array,
    phoneNumbers: Array
  },
  type: String // 'text', 'image', 'document', etc
}
```

---

#### `extractEntities(text)`
Extract '@mentions', '#tags', URLs, emails, phone numbers.

**Parameters**:
- `text` (String): Text to analyze

**Returns**: `Object`
```javascript
{
  mentions: Array,
  hashtags: Array,
  urls: Array,
  emails: Array,
  phoneNumbers: Array
}
```

---

#### `extractIntent(message)`
Extract intent from message using keyword matching.

**Parameters**:
- `message` (Object)

**Returns**: `Object`
```javascript
{
  type: String, // e.g., 'property_search', 'booking', 'support'
  confidence: Number, // 0.0 - 1.0
  data: Object
}
```

**Supported Intents**:
- `property_search` - Find properties
- `property_list` - List properties
- `property_detail` - Get property info
- `booking` - Book property
- `payment` - Payment inquiry
- `support` - Support request
- `greeting` - Hello/Hi messages
- `farewell` - Goodbye messages

---

#### `filter(message, criteria)`
Filter message based on criteria.

**Parameters**:
- `message` (Object)
- `criteria` (Object)
  - `isCommand` (Boolean): Is command?
  - `command` (String): Which command?
  - `from` (String): From whom?
  - `isGroup` (Boolean): Is group message?
  - `contains` (String|Array): Text contains?
  - `type` (String): Message type?

**Returns**: `boolean`

**Example**:
```javascript
if (handler.filter(msg, { isCommand: true, command: 'search' })) {
  // Handle search command
}
```

---

#### `validate(message)`
Validate message structure and content.

**Parameters**:
- `message` (Object)

**Returns**: `Object`
```javascript
{
  valid: Boolean,
  errors: String[]
}
```

---

#### `isSpam(message)`
Detect spam patterns.

**Parameters**:
- `message` (Object)

**Returns**: `boolean`

---

#### `formatResponse(content, options)`
Format content for response.

**Parameters**:
- `content` (String|Object)
- `options` (Object)
  - `format` (String): 'bold', 'italic', 'code'
  - `mentions` (Array): Users to mention
  - `buttons` (Array): Interactive buttons

**Returns**: `Object`

---

#### `processBatch(messages)`
Process multiple messages.

**Parameters**:
- `messages` (Array): Array of messages

**Returns**: `Promise<Array>`
```javascript
[
  { success: true, data: {...} },
  { success: false, error: "..." },
  ...
]
```

---

## SessionManager

**Module**: `bot/SessionManager.js`  
**Responsibility**: Manage user sessions, conversation history, and context

### Constructor

```javascript
new SessionManager(config)
```

**Parameters**:
- `config` (Object)
  - `maxSessions` (Number): Max concurrent sessions, default: 10000
  - `sessionTimeout` (Number): Timeout in ms, default: 1200000 (20 min)
  - `cleanupInterval` (Number): Cleanup frequency, default: 300000 (5 min)
  - `maxHistoryPerSession` (Number): Max messages per session, default: 100

### Methods

#### `getSession(userId, metadata)`
Get or create session.

**Parameters**:
- `userId` (String): User ID (e.g., "+971501234567")
- `metadata` (Object, optional): Initial metadata

**Returns**: `Session`

```javascript
const session = mgr.getSession(userId, { isGroup: false });
```

---

#### `destroySession(userId)`
Delete session.

**Parameters**:
- `userId` (String)

**Returns**: `void`

---

#### `hasSession(userId)`
Check if session exists.

**Parameters**:
- `userId` (String)

**Returns**: `boolean`

---

#### `setState(userId, key, value)`
Set custom state value.

**Parameters**:
- `userId` (String)
- `key` (String): State key
- `value` (Any): State value

**Returns**: `void`

**Example**:
```javascript
mgr.setState(userId, 'step', 'awaiting_property_id');
```

---

#### `getState(userId, key)`
Get custom state value.

**Parameters**:
- `userId` (String)
- `key` (String)

**Returns**: `Any|null`

---

#### `setContext(userId, context)`
Set conversational context (merged).

**Parameters**:
- `userId` (String)
- `context` (Object): Context data

**Returns**: `void`

```javascript
mgr.setContext(userId, {
  propertyId: 'PROP123',
  userType: 'buyer'
});
```

---

#### `getContext(userId)`
Get conversational context.

**Parameters**:
- `userId` (String)

**Returns**: `Object`

---

#### `addMessage(userId, message)`
Add message to session history.

**Parameters**:
- `userId` (String)
- `message` (Object)

**Returns**: `void`

---

#### `getHistory(userId, limit)`
Get message history.

**Parameters**:
- `userId` (String)
- `limit` (Number): Number of recent messages, default: 10

**Returns**: `Array[]`

---

#### `clearHistory(userId)`
Clear all messages for user.

**Parameters**:
- `userId` (String)

**Returns**: `void`

---

#### `addTag(userId, tag)`
Add tag to session.

**Parameters**:
- `userId` (String)
- `tag` (String)

**Returns**: `void`

```javascript
mgr.addTag(userId, 'vip');
mgr.addTag(userId, 'buyer');
```

---

#### `getSessionsByTag(tag)`
Find all sessions with tag.

**Parameters**:
- `tag` (String)

**Returns**: `Array` - [ { userId, session }, ... ]

---

#### `incrementCounter(userId, counterName)`
Increment counter.

**Parameters**:
- `userId` (String)
- `counterName` (String)

**Returns**: `number` - New counter value

```javascript
const count = mgr.incrementCounter(userId, 'messages');
```

---

#### `getStats()`
Get session manager statistics.

**Returns**: `Object`
```javascript
{
  totalSessions: Number,
  activeSessions: Number,
  totalMessages: Number,
  averageMessagesPerSession: Number,
  avgSessionAge: Number
}
```

---

#### `export()`
Export all sessions (for backup).

**Returns**: `Object` - Serialized sessions

---

#### `import(data)`
Import sessions.

**Parameters**:
- `data` (Object): Serialized sessions

**Returns**: `void`

---

## CommandRouter

**Module**: `bot/CommandRouter.js`  
**Responsibility**: Route and execute commands with API interaction

### Constructor

```javascript
new CommandRouter(config)
```

**Parameters**:
- `config` (Object)
  - `apiClient` (DamacApiClient, required)
  - `sessionManager` (SessionManager, required)

### Methods

#### `execute(message, session)`
Execute command from message.

**Parameters**:
- `message` (Object): Parsed message
- `session` (Session): User session

**Returns**: `Promise<void>`

Sends response to user via connection.

---

#### `registerCommand(name, handler)`
Register custom command.

**Parameters**:
- `name` (String): Command name
- `handler` (Function): async (message, session) => Promise

**Returns**: `void`

```javascript
router.registerCommand('custom', async (msg, session) => {
  return 'Custom command executed!';
});
```

---

#### Built-in Commands

##### `/search <query>`
Search properties by location/name/features.

**Example**:
```
User: /search dubai marina 2 bed
Response: Found 5 properties...
```

---

##### `/details <propertyId>`
Get detailed information about property.

**Example**:
```
User: /details PROP123
Response: [Property card with images, price, etc.]
```

---

##### `/book <propertyId>`
Start booking process.

**Flow**:
```
/book PROP123
→ "What is your name?"
→ User: "John"
→ "What is your email?"
→ User: "john@example.com"
→ "Confirmation: Booking PROP123 for John..."
```

---

##### `/list [filters]`
List available properties with optional filters.

**Example**:
```
/list location:dubai price:500k-1m type:apartment
```

---

##### `/help`
Show available commands.

---

## DamacApiClient

**Module**: `bot/DamacApiClient.js`  
**Responsibility**: Interface with DAMAC API with retry and error handling

### Constructor

```javascript
new DamacApiClient(config)
```

**Parameters**:
- `config` (Object)
  - `baseUrl` (String): API base URL, default: "http://localhost:5000"
  - `timeout` (Number): Request timeout in ms, default: 30000
  - `retryAttempts` (Number): Retry count, default: 3
  - `retryDelay` (Number): Initial delay in ms, default: 1000

### Methods

#### `searchProperties(query)`
Search properties.

**Parameters**:
- `query` (Object)
  - `location` (String, optional)
  - `priceMin` (Number, optional)
  - `priceMax` (Number, optional)
  - `bedrooms` (Number, optional)
  - `propertyType` (String, optional)
  - `furnished` (String, optional)
  - `limit` (Number, optional)
  - `offset` (Number, optional)

**Returns**: `Promise<Array>` - Matching properties

**Example**:
```javascript
const props = await api.searchProperties({
  location: 'Dubai Marina',
  bedrooms: 2,
  limit: 10
});
```

---

#### `getProperty(propertyId)`
Get property details.

**Parameters**:
- `propertyId` (String)

**Returns**: `Promise<Object>` - Property details

---

#### `createBooking(bookingData)`
Create a booking.

**Parameters**:
- `bookingData` (Object)
  - `propertyId` (String, required)
  - `userName` (String, required)
  - `userEmail` (String, required)
  - `userPhone` (String, required)
  - `moveInDate` (String, optional): ISO date
  - `notes` (String, optional)

**Returns**: `Promise<Object>` - Created booking

---

#### `getBooking(bookingId)`
Get booking details.

**Parameters**:
- `bookingId` (String)

**Returns**: `Promise<Object>`

---

#### `getTenancy(tenancyId)`
Get tenancy information.

**Parameters**:
- `tenancyId` (String)

**Returns**: `Promise<Object>`

---

#### `getOwner(ownerId)`
Get owner/landlord information.

**Parameters**:
- `ownerId` (String)

**Returns**: `Promise<Object>`

---

#### `makeRequest(method, endpoint, data, options)`
Make raw API request (advanced).

**Parameters**:
- `method` (String): 'GET', 'POST', 'PUT', 'DELETE'
- `endpoint` (String): API endpoint path
- `data` (Object, optional): Request body
- `options` (Object, optional): Override config

**Returns**: `Promise<Object>`

---

## WebhookServer

**Module**: `bot/WebhookServer.js`  
**Responsibility**: HTTP server for receiving external webhooks

### Constructor

```javascript
new WebhookServer(config)
```

**Parameters**:
- `config` (Object)
  - `port` (Number): Server port, default: 3001
  - `host` (String): Server host, default: "localhost"
  - `adminSecret` (String): Secret for admin endpoints

### Methods

#### `start()`
Start webhook server.

**Returns**: `Promise<void>`

```javascript
await server.start();
console.log('Server running on port 3001');
```

---

#### `stop()`
Stop webhook server.

**Returns**: `Promise<void>`

---

#### `on(event, callback)`
Register webhook handler.

**Parameters**:
- `event` (String): Webhook type
- `callback` (Function): Async handler

**Supported Events**:
- `twilio` - Twilio message callbacks
- `payment` - Payment notifications
- `event` - API events
- `admin` - Admin commands
- `webhook:{service}` - Generic service webhooks

**Example**:
```javascript
server.on('payment', async (webhook) => {
  console.log('Payment received:', webhook.amount);
});
```

---

### Webhook Payload Formats

#### Twilio Webhook
```javascript
{
  service: 'twilio',
  timestamp: Number,
  messageId: String,
  from: String, // Phone number
  to: String,
  body: String,
  mediaCount: Number,
  media: [ { url, type }, ... ],
  raw: Object
}
```

#### Payment Webhook
```javascript
{
  service: 'payment',
  timestamp: Number,
  transactionId: String,
  amount: Number,
  currency: String, // 'AED', 'USD', etc.
  status: String, // 'pending', 'completed', 'failed'
  orderId: String,
  metadata: Object,
  raw: Object
}
```

#### Event Webhook
```javascript
{
  service: 'event',
  timestamp: Number,
  eventType: String, // 'property_created', 'booking_confirmed', etc.
  entityType: String, // 'property', 'booking', etc.
  entityId: String,
  data: Object,
  raw: Object
}
```

---

## BotConfig

**Module**: `bot/BotConfig.js`  
**Responsibility**: Centralized configuration management (Singleton)

### Constructor

```javascript
new BotConfig(configPath)
```

**Parameters**:
- `configPath` (String, optional): Path to JSON config file

### Methods

#### `get(path)`
Get configuration value by path.

**Parameters**:
- `path` (String): Dot-notation path (e.g., 'bot.mode')

**Returns**: `Any|undefined`

```javascript
const mode = config.get('bot.mode');
const port = config.get('webhook.port');
```

---

#### `set(path, value)`
Set configuration value.

**Parameters**:
- `path` (String): Dot-notation path
- `value` (Any): New value

**Returns**: `void`

---

#### `getAll()`
Get entire configuration object.

**Returns**: `Object`

---

#### `isProduction()`
Check if production environment.

**Returns**: `boolean`

---

#### `isDevelopment()`
Check if development environment.

**Returns**: `boolean`

---

## BotIntegration

**Module**: `bot/BotIntegration.js`  
**Responsibility**: Main orchestrator of all components

### Constructor

```javascript
new BotIntegration(configPath)
```

**Parameters**:
- `configPath` (String, optional): Path to config file

### Methods

#### `start()`
Initialize and start bot.

**Returns**: `Promise<BotIntegration>`

```javascript
const bot = new BotIntegration();
await bot.start();
```

---

#### `stop()`
Gracefully shutdown bot.

**Returns**: `Promise<void>`

```javascript
await bot.stop();
```

---

#### `getHealth()`
Get bot health status.

**Returns**: `Object`
```javascript
{
  running: Boolean,
  engine: Object,
  connection: {
    mode: String,
    connected: Boolean,
    uptime: Number
  },
  sessions: Object,
  webhook: {
    port: Number,
    running: Boolean
  }
}
```

---

## Factory Functions

### createBot(configPath)
Convenience function to create and start bot.

**Parameters**:
- `configPath` (String, optional)

**Returns**: `Promise<BotIntegration>`

**Example**:
```javascript
import { createBot } from './bot/index.js';

const bot = await createBot('./bot-config.json');
// Bot is running
```

---

## Event System

### Global Events (via EventEmitter)

All components extend EventEmitter for flexible event handling:

```javascript
component.on(eventName, (data) => {
  // Handle event
});

component.emit(eventName, data);
```

### Common Events

#### Connection Events
```javascript
conn.on('authenticated', () => {});
conn.on('message', (msg) => {});
conn.on('disconnected', () => {});
conn.on('error', (err) => {});
```

#### Message Events
```javascript
handler.on('processed', (msg) => {});
handler.on('error', (err) => {});
```

#### Session Events
```javascript
sessionMgr.on('session:created', ({ userId }) => {});
sessionMgr.on('session:destroyed', ({ userId }) => {});
sessionMgr.on('session:state-changed', ({ userId, key, value }) => {});
sessionMgr.on('cleanup', ({ removedCount }) => {});
```

#### Webhook Events
```javascript
webhook.on('twilio', async (webhook) => {});
webhook.on('payment', async (webhook) => {});
webhook.on('event', async (webhook) => {});
webhook.on('admin', async (webhook) => {});
```

---

## Error Handling

### Error Types

#### BotConnectionError
Connection-related failures.

#### MessageHandlingError
Message processing failures.

#### CommandExecutionError
Command execution failures.

#### APIError
API call failures.

### Error Handling Pattern

```javascript
try {
  // Attempt operation
} catch (error) {
  if (error instanceof BotConnectionError) {
    // Handle connection error
  } else if (error instanceof APIError) {
    // Handle API error with retry
  } else {
    // Handle general error
    logger.error(error);
  }
}
```

---

## Configuration Reference

### Full Configuration Template

```javascript
{
  // Environment
  env: 'development', // 'development' | 'production'
  debug: false,

  // Bot
  bot: {
    mode: 'hybrid', // 'browser' | 'websocket' | 'hybrid'
    sessionName: 'linda-bot',
    commandPrefix: '/',
    reconnectInterval: 5000,
    maxRetries: 3
  },

  // Messages
  messages: {
    maxQueueSize: 1000,
    processingTimeout: 30000,
    commandTimeout: 60000
  },

  // Sessions
  session: {
    maxSessions: 10000,
    sessionTimeout: 1200000,
    cleanupInterval: 300000,
    maxHistoryPerSession: 100
  },

  // Webhooks
  webhook: {
    port: 3001,
    host: 'localhost',
    adminSecret: 'changeme'
  },

  // API
  api: {
    baseUrl: 'http://localhost:5000',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // Database
  database: {
    url: 'mongodb+srv://...',
    useInMemory: false,
    poolSize: 10
  },

  // Google Sheets
  sheets: {
    spreadsheetId: 'your_sheet_id',
    credentialsPath: './credentials.json'
  },

  // Twilio (optional)
  twilio: {
    enabled: false,
    accountSid: '***',
    authToken: '***',
    phoneNumber: '+1234567890'
  },

  // Firebase (optional)
  firebase: {
    enabled: false,
    projectId: '***',
    privateKey: '***',
    clientEmail: '***'
  },

  // Logging
  logging: {
    level: 'info', // 'debug' | 'info' | 'warn' | 'error'
    format: 'json', // 'json' | 'text'
    file: '/var/log/bot.log',
    maxSize: 10485760,
    maxFiles: 5
  },

  // Rate Limiting
  rateLimit: {
    enabled: true,
    messagesPerMinute: 60,
    commandsPerMinute: 20
  },

  // Features
  features: {
    propertySearch: true,
    propertyDetails: true,
    booking: true,
    payment: true,
    support: true,
    analytics: true
  },

  // Admin
  admin: {
    adminNumbers: ['+971501234567'],
    superAdminNumbers: ['+971501234567'],
    allowCommandsFromNonAdmin: false
  }
}
```

---

**Reference Version**: 1.0.0  
**Last Updated**: 2026-01
