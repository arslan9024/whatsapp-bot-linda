# WhatsApp Bot Framework - Architecture Document

## Executive Summary

This document describes the architecture of a custom hybrid WhatsApp Bot Framework that combines multiple integration approaches (whatsapp-web.js, Baileys, Twilio) with a clean, component-based design pattern. The architecture prioritizes flexibility, reliability, and scalability.

## Design Philosophy

### Core Principles

1. **Modularity** - Each component has a single responsibility
2. **Decoupling** - Components communicate via events and clear interfaces
3. **Extensibility** - Easy to add new features without modifying existing code
4. **Reliability** - Multiple fallbacks and error recovery mechanisms
5. **Testability** - Each component can be tested in isolation
6. **Maintainability** - Clear code structure and comprehensive documentation

### Architecture Pattern

**SMART Architecture** (Service-Message-API-Router-Transport)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Transport Layer (Connections)             │
│          BotConnection (browser, websocket, hybrid)        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              Message Processing Layer                      │
│  MessageHandler > SessionManager > CommandRouter           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│               API & Service Layer                          │
│     DamacApiClient > API Routes > Database Services       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                 Engine & Orchestration                     │
│        CustomBotEngine + BotIntegration                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Connection Layer (BotConnection)

**Purpose**: Abstract different WhatsApp connection methods

```
BotConnection (Abstract)
    ├─ Browser Mode (whatsapp-web.js)
    │  ├─ QR Code Generation
    │  ├─ Session Persistence
    │  ├─ Browser Automation
    │  └─ Event Emitter Pattern
    │
    ├─ WebSocket Mode (Baileys)
    │  ├─ QR Code / Device List
    │  ├─ JSON Store
    │  ├─ Direct Protocol
    │  └─ Low Resource Usage
    │
    └─ Hybrid Mode (Automatic)
       ├─ Try Browser First
       ├─ Fallback to WebSocket
       ├─ User Preference Override
       └─ Transparent Failover
```

**Key Design Decisions**:
- All modes implement same interface (connect, sendMessage, disconnect)
- Mode switching transparent to upper layers
- Each mode manages its own session/authentication
- Event-driven architecture for message handling

### 2. Message Processing Pipeline

```
Raw Message
    ↓
┌─────────────────────────────┐
│   MessageHandler            │
│ ✗ Parse                     │
│ ✗ Extract entities          │
│ ✗ Classify type             │
│ ✗ Validate                  │
│ ✗ Detect intent             │
│ ✗ Filter for spam           │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│   SessionManager            │
│ ✗ Get/create session        │
│ ✗ Maintain history          │
│ ✗ Track context             │
│ ✗ Update last activity      │
│ ✗ Manage tags/counters      │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│   CommandRouter             │
│ ✗ Route command/intent      │
│ ✗ Execute handler           │
│ ✗ Call API if needed        │
│ ✗ Format response           │
└─────────────────────────────┘
    ↓
Response Message
```

**Pipeline Features**:
- **Queue-based Processing**: Prevents message loss
- **Parallel Sessions**: Multiple users handled concurrently
- **State Preservation**: Context maintained across messages
- **Event Emission**: Each stage emits events for monitoring
- **Error Recovery**: Failures logged and handled gracefully

### 3. Session Management

```
┌──────────────────────────────────────────┐
│        SessionManager                    │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Session 1 (User)                │   │
│  │  ├─ userId: "+971501234567"      │   │
│  │  ├─ createdAt: timestamp         │   │
│  │  ├─ lastActivity: timestamp      │   │
│  │  ├─ state: { key: value }        │   │
│  │  ├─ context: { conversational }  │   │
│  │  ├─ tags: ['vip', 'buyer']       │   │
│  │  ├─ counters: { messages: 42 }   │   │
│  │  └─ messageHistory: [...]        │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Session 2 (User)                │   │
│  │  ├─ userId: "+971509876543"      │   │
│  │  └─ ...                          │   │
│  └──────────────────────────────────┘   │
│                                          │
│  Cleanup Timer (5 min intervals)        │
│  ├─ Check lastActivity > timeout        │
│  └─ Remove expired sessions             │
└──────────────────────────────────────────┘
```

**Session Lifecycle**:
```
1. User sends message
   ↓
2. SessionManager.getSession(userId)
   - If not exists: create new session
   - If exists: update lastActivity
   ↓
3. Add message to history
4. Set state/context as needed
5. Execute commands
   ↓
6. Periodic cleanup
   - If (now - lastActivity) > timeout
     Delete session
```

### 4. Command Routing Architecture

```
┌──────────────────────────────────┐
│     CommandRouter                │
│                                  │
│  Command Registry:               │
│  ├─ /search                      │
│  ├─ /details                     │
│  ├─ /book                        │
│  ├─ /list                        │
│  ├─ /help                        │
│  └─ Custom handlers              │
│                                  │
│  Handler Interface:              │
│  execute(message, session) {     │
│    // Parse args                 │
│    // Call API                   │
│    // Return response            │
│  }                               │
└──────────────────────────────────┘
```

**Command Flow**:
```
Message { command: "search", args: ["dubai", "2bed"] }
    ↓
CommandRegistry.get("search")
    ↓
SearchHandler.execute(message, session)
    ├─ Validate args
    ├─ DamacApiClient.searchProperties(args)
    ├─ Format results
    └─ Return formatted response
    ↓
Send to user via BotConnection
```

### 5. API Integration Architecture

```
┌─────────────────────────────────────┐
│      DamacApiClient                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Core Methods               │   │
│  ├─ searchProperties()         │   │
│  ├─ getProperty()              │   │
│  ├─ createBooking()            │   │
│  ├─ getBooking()               │   │
│  └─ ... more endpoints         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Request Processing         │   │
│  ├─ Validation                 │   │
│  ├─ Retry Logic (3 attempts)   │   │
│  ├─ Timeout Handling           │   │
│  ├─ Error Response Processing  │   │
│  └─ Logging                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  HTTP Request               │   │
│  ├─ URL: http://api:5000/...   │   │
│  ├─ Method: GET/POST           │   │
│  ├─ Headers: with auth         │   │
│  └─ Body: JSON serialized      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**API Request Flow**:
```
Client Request (searchProperties)
    ↓
Validate Input
    ↓
Format Request URL/Body
    ↓
Send HTTP Request
    ├─ 1st attempt
    ├─ If fail & retryable: 2nd attempt (1s delay)
    ├─ If fail & retryable: 3rd attempt (2s delay)
    └─ If all fail: throw error
    ↓
Parse Response
    ├─ If 200-299: parse JSON
    ├─ If 400: validation error
    └─ If 500: server error
    ↓
Return Structured Result
```

### 6. Webhook Server Architecture

```
┌──────────────────────────────────────────┐
│         WebhookServer (Express)          │
│                                          │
│  HTTP Server on port 3001                │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Endpoints                         │  │
│  ├─ POST /webhook/twilio              │  │
│  ├─ POST /webhook/payment             │  │
│  ├─ POST /webhook/event               │  │
│  ├─ POST /webhook/admin               │  │
│  ├─ GET  /health                      │  │
│  └─ POST /webhook/:service (generic)  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Event Emitter                     │  │
│  ├─ emit('twilio', webhook)           │  │
│  ├─ emit('payment', webhook)          │  │
│  ├─ emit('event', webhook)            │  │
│  ├─ emit('admin', webhook)            │  │
│  └─ emit('webhook:service', webhook)  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**Webhook Processing**:
```
External System sends POST to /webhook/payment
    ↓
Express receives request
    ↓
Parse JSON body
    ↓
Validate required fields
    ├─ transactionId
    ├─ amount
    └─ status
    ↓
Emit 'payment' event
    ↓
BotIntegration listens to event
    ↓
Process (e.g., notify user, update session)
    ↓
Return HTTP 200 OK
```

### 7. Configuration Management

```
┌─────────────────────────────────────┐
│       BotConfig (Singleton)         │
│                                     │
│  Loading Priority:                  │
│  1. .env file (dotenv)              │
│  2. config.json file (if provided)  │
│  3. Defaults (hardcoded)            │
│                                     │
│  Structured Config:                 │
│  {                                  │
│    bot: { mode, sessionName, ... }  │
│    messages: { maxQueueSize, ... }  │
│    session: { maxSessions, ... }    │
│    api: { baseUrl, timeout, ... }   │
│    webhook: { port, host, ... }     │
│    logging: { level, format, ... }  │
│    features: { enabled flags }      │
│    ... more                         │
│  }                                  │
│                                     │
│  Validation:                        │
│  ├─ Required fields check           │
│  ├─ Type validation                 │
│  ├─ Range checks                    │
│  └─ Logical consistency             │
│                                     │
│  Security:                          │
│  ├─ Sensitive values masked         │
│  ├─ No credentials in logs          │
│  └─ Secret validation               │
└─────────────────────────────────────┘
```

### 8. Engine & Orchestration

```
┌────────────────────────────────────────┐
│      CustomBotEngine                   │
│                                        │
│  Message Queue Management              │
│  ├─ Max size: configurable             │
│  ├─ FIFO processing                    │
│  ├─ Deduplication                      │
│  └─ Priority handling                  │
│                                        │
│  Statistics & Monitoring               │
│  ├─ Messages processed                 │
│  ├─ Commands executed                  │
│  ├─ Errors encountered                 │
│  ├─ Uptime tracking                    │
│  └─ Performance metrics                │
│                                        │
│  Event Emission                        │
│  ├─ ready (bot is initialized)         │
│  ├─ error (any error)                  │
│  ├─ message (incoming message)         │
│  ├─ command (command executed)         │
│  └─ custom events (from plugins)       │
└────────────────────────────────────────┘

Combined with:

┌────────────────────────────────────────┐
│      BotIntegration                    │
│                                        │
│  Orchestrates all components:          │
│  1. Initialize in order                │
│  2. Setup event handlers               │
│  3. Handle message flow                │
│  4. Manage errors & recovery           │
│  5. Provide health monitoring          │
│  6. Handle graceful shutdown           │
└────────────────────────────────────────┘
```

## Data Flow Diagrams

### Complete Message Flow

```
┌─────────────╗
│ User sends  ║                    External System
│ WhatsApp    ║                   ┌──────────────┐
│ message     ║                   │Payment       │
└──────┬──────╝                   │Notification  │
       │                          └────────┬─────┘
       │                                   │
   ┌───▼────────────────────────────────────▼──┐
   │         BotConnection                     │
   │  (browser/websocket/hybrid mode)          │
   └───┬─────────────────────────────────────┬─┘
       │                                     │
   ┌───▼──────────────┐               ┌─────▼──────────────┐
   │ MessageHandler   │               │ WebhookServer     │
   │ ✗ Parse          │               │ ✗ Receive         │
   │ ✗ Extract intent │               │ ✗ Validate        │
   │ ✗ Validate       │               │ ✗ Emit event      │
   └───┬──────────────┘               └─────┬──────────────┘
       │                                     │
   ┌───▼──────────────────────────────────────┴──┐
   │         SessionManager                      │
   │ ✗ Get/create session                        │
   │ ✗ Update history                            │
   │ ✗ Maintain context                          │
   └───┬───────────────────────────────────────┬─┘
       │                                       │
   ┌───▼──────────────────────┐    ┌──────────▼─────────┐
   │  CommandRouter           │    │ DamacApiClient    │
   │  ✗ Parse command/intent  │    │ ✗ Make API calls   │
   │  ✗ Validate              │    │ ✗ Retry on error   │
   │  ✗ Execute handler       │    │ ✗ Transform data   │
   └───┬──────────────────────┘    └──────────┬─────────┘
       │                                      │
       └──────────────┬───────────────────────┘
                      │
            ┌─────────▼──────────┐
            │  CustomBotEngine   │
            │ ✗ Queue management │
            │ ✗ Metrics tracking │
            │ ✗ Event emission   │
            └─────────┬──────────┘
                      │
            ┌─────────▼──────────┐
            │ BotConnection      │
            │ Send response      │
            │ back to user       │
            └────────────────────┘
```

### Error Recovery Flow

```
Error Occurs
    ↓
Caught at Component Level
    ├─ BotConnection: auto-reconnect
    ├─ MessageHandler: log & emit error
    ├─ CommandRouter: format error response
    └─ DamacApiClient: retry with backoff
    ↓
Logged to Console/File
    ├─ Timestamp
    ├─ Component
    ├─ Message
    └─ Stack trace (if DEBUG=true)
    ↓
If Critical (connection lost):
    └─ Trigger Reconnect with Backoff
       ├─ Attempt 1: wait 5s
       ├─ Attempt 2: wait 10s
       ├─ Attempt 3: wait 20s
       └─ Emit error if max attempts reached
    ↓
If Recoverable:
    └─ Continue normal operation
```

## Scalability Considerations

### Horizontal Scaling

```
Load Balancer (Nginx/HAProxy)
        |
    ┌───┴───┬───────┐
    │       │       │
  Bot-1  Bot-2   Bot-3  (Independent instances)
    │       │       │
    └───┬───┴───────┘
        │
    Redis (Session Shared Store)
    PostgreSQL (User Data)
    MongoDB (Message History)
```

**Requirements for Scaling**:
1. Sessions stored in Redis instead of memory
2. Separate database connections per instance
3. Load balancer for webhook distribution
4. Message deduplication across instances
5. Distributed logging (ELK, etc.)

### Vertical Scaling

```
Current: Single Process
├─ Max connections: ~10,000
├─ Max QPS (queries/sec): ~100-200
└─ Memory: ~200-500MB

With Clustering:
├─ Node.js Cluster module
├─ Multiple worker processes
├─ Shared message queue (Bull/Bee-Queue)
└─ Memory: ~500MB per process
```

## Security Architecture

### Information Flow

```
User WhatsApp Message
        ↓
    [TLS/HTTPS]  ← Secured
        ↓
BotConnection
        ↓
    In-Memory Processing (No logging of PII)
        ↓
Webhook Validation (Secret check)
        ↓
Session Data (User ID only, no names)
        ↓
API Calls (Auth token in headers)
        ↓
    [HTTPS]  ← Secured
        ↓
Response (Minimal sensitive data)
```

### Authentication & Authorization

```
┌─────────────────────────────────────┐
│   Authentication                    │
├─────────────────────────────────────┤
│                                     │
│  WhatsApp Bot                       │
│  ├─ Session via QR (browser)        │
│  ├─ Session via device (websocket)  │
│  └─ No additional auth needed       │
│                                     │
│  API Calls                          │
│  ├─ Token in bearer header          │
│  ├─ Token validated per request     │
│  └─ Expired token handling          │
│                                     │
│  Webhooks                           │
│  ├─ Secret validation               │
│  ├─ IP whitelisting (optional)      │
│  └─ Request signature (optional)    │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Authorization                     │
├─────────────────────────────────────┤
│                                     │
│  Admin Commands                     │
│  ├─ Check user in ADMIN_NUMBERS     │
│  ├─ Check secret for webhooks       │
│  └─ Log all admin actions           │
│                                     │
│  Feature Flags                      │
│  ├─ FEATURE_PROPERTY_SEARCH         │
│  ├─ FEATURE_BOOKING                 │
│  └─ FEATURE_PAYMENT                 │
│                                     │
│  Rate Limiting                      │
│  ├─ Per-user message limit          │
│  ├─ Per-user command limit          │
│  └─ Global quota (optional)         │
│                                     │
└─────────────────────────────────────┘
```

## Monitoring & Observability

### Health Checks

```
┌──────────────────────────────────────┐
│  Bot Health Status                   │
├──────────────────────────────────────┤
│                                      │
│  Connection Health                   │
│  ├─ Connected: yes/no               │
│  ├─ Uptime: hours                   │
│  ├─ Mode: browser/websocket         │
│  └─ Last activity: timestamp        │
│                                      │
│  Message Processing Health          │
│  ├─ Queue size: N                   │
│  ├─ Avg processing time: Xms        │
│  ├─ Errors today: N                 │
│  └─ Success rate: X%                │
│                                      │
│  Session Health                      │
│  ├─ Active sessions: N              │
│  ├─ Total sessions touched: N       │
│  ├─ Avg session duration: Xmin      │
│  └─ Expired sessions/hour: N        │
│                                      │
│  API Health                          │
│  ├─ Available: yes/no               │
│  ├─ Avg latency: Xms                │
│  ├─ Error rate: X%                  │
│  └─ Last successful call: timestamp │
│                                      │
│  Webhook Server Health              │
│  ├─ Running: yes/no                 │
│  ├─ Port: 3001                      │
│  ├─ Requests today: N               │
│  └─ Errors: N                       │
│                                      │
└──────────────────────────────────────┘
```

## Performance Characteristics

### Resource Usage (Single Instance)

```
Idle State:
├─ CPU: ~1-2%
├─ Memory: ~100-150MB
└─ Network: ~0 KB/s

Active Usage (100 concurrent sessions):
├─ CPU: ~20-40%
├─ Memory: ~300-500MB
├─ Network: ~50-100 KB/s
└─ Message latency: ~500-1000ms

Peak Load (1000 messages/min):
├─ CPU: ~60-80%
├─ Memory: ~600-1000MB
├─ Network: ~200-400 KB/s
└─ Message latency: ~1-2s
```

### Throughput

```
Message Processing:
├─ Simple text message: ~100-200ms
├─ Command with API call: ~500-1500ms
├─ Complex query with pagination: ~1-3s
└─ Webhook callback: ~50-100ms

Concurrent Handling:
├─ Max sessions: ~10,000 (memory limit)
├─ Max QPS: ~200-300 (CPU limit)
├─ Session timeout: 20 minutes
└─ Auto-cleanup: 5 minutes
```

## Failure Scenarios & Recovery

### Scenario 1: WhatsApp Connection Lost

```
Connection Drops
    ↓
BotConnection.on('disconnected')
    ↓
BotIntegration.reconnectWithBackoff()
    ├─ Wait 5s, attempt 1
    ├─ Wait 10s, attempt 2
    ├─ Wait 20s, attempt 3
    └─ Max 3 attempts
    ↓
If Successful:
    └─ Resume normal operation
       Session data preserved
       Pending messages in queue
       
If Failed:
    └─ Emit 'max-reconnect-attempts'
       Log critical error
       Optionally alert admin
```

### Scenario 2: API Server Down

```
API Request Fails
    ↓
DamacApiClient catches error
    ├─ Is retryable? (NOT 401/403)
    ├─ Wait 1s, retry attempt 1
    ├─ Wait 2s, retry attempt 2
    └─ Wait 4s, retry attempt 3
    ↓
If Successful:
    └─ Return result
       
If Failed:
    └─ Throw error
       CommandRouter catches
       Sends "Sorry, service unavailable"
       Logs error for debugging
```

### Scenario 3: Database Connection Pool Exhausted

```
Session creation fails
    ↓
SessionManager catches
    ├─ Check session count
    ├─ If max reached: reject new
    ├─ Run cleanup (remove expired)
    └─ Retry connection
    ↓
If space freed:
    └─ Create new session
       
If still full:
    └─ Send "Please try again later"
       Log as non-critical alert
```

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-01  
**Audience**: Architects, DevOps, Senior Developers
