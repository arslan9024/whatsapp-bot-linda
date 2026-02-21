# Monitoring & Operational Guide
**Date:** February 13, 2026  
**Project:** WhatsApp Bot Linda  
**Phase:** 6 - Security Audit & Monitoring Infrastructure

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Logging Infrastructure](#logging-infrastructure)
3. [Error Tracking](#error-tracking)
4. [Health Monitoring](#health-monitoring)
5. [Metrics & Dashboards](#metrics--dashboards)
6. [Troubleshooting](#troubleshooting)
7. [Alert Configuration](#alert-configuration)

---

## Quick Start

### Enable Monitoring in Your Application

```javascript
const { LoggingService, ErrorTrackingService, HealthCheckService } = require('./code/WhatsAppBot/Monitoring/MonitoringService');
const { HealthCheckEndpoints, createPerformanceMiddleware, createErrorHandlingMiddleware } = require('./code/WhatsAppBot/Monitoring/HealthCheckEndpoints');
const SecurityUtils = require('./code/WhatsAppBot/Security/SecurityUtils');

// Initialize services
const loggingService = new LoggingService({
  logLevel: 'info',
  environment: process.env.NODE_ENV,
  enableFileLogging: true,
  enableConsoleLogging: true
});

const errorTrackingService = new ErrorTrackingService({
  logger: loggingService,
  maxErrors: 1000
});

const healthCheckService = new HealthCheckService({
  logger: loggingService
});

// Add to Express app
const app = require('express')();

// Register middleware
app.use(createPerformanceMiddleware(loggingService));
app.use(createErrorHandlingMiddleware(loggingService, errorTrackingService));

// Register health check endpoints
const endpoints = new HealthCheckEndpoints({
  healthCheckService,
  loggingService,
  errorTrackingService,
  handlers: {
    command: commandExecutor,
    message: messageBatchProcessor,
    conversation: conversationEngine
  }
});

endpoints.registerEndpoints(app);

// Start server
app.listen(3000);
```

---

## Logging Infrastructure

### Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **DEBUG** | Detailed diagnostic info | Handler initialization, variable values |
| **INFO** | General informational | Command execution, successful operations |
| **WARN** | Warning conditions | Slowdowns, unusual patterns |
| **ERROR** | Error conditions | Failures, exceptions, retries |

### Log Files

```
logs/
├── app.log              # All application logs
├── error.log            # Error-only logs (duplicates from app.log)
├── performance.log      # Performance metrics and slow operations
└── security.log         # Security events and audit trail
```

### Using the Logging Service

```javascript
// Debug logging
loggingService.debug('Processing message', {
  messageId: '12345',
  context: { userId: 'user_1' }
});

// Info logging
loggingService.info('Command executed successfully', {
  command: 'help',
  duration: 25,
  userId: 'user_1'
});

// Warning logging
loggingService.warn('Slow command execution', {
  command: 'search',
  duration: 5000
});

// Error logging
loggingService.error('Failed to process message', {
  error: error.message,
  stack: error.stack,
  messageId: '12345'
});

// Performance logging
loggingService.logPerformance('message_processing', 250, {
  messageSize: 1000,
  handlerCount: 5
});

// Security event logging
loggingService.logSecurityEvent('Unauthorized access attempt', {
  userId: 'unknown',
  endpoint: '/admin',
  severity: 'warning'
});
```

### Log Format

All logs are written in JSON format for easy parsing:

```json
{
  "timestamp": "2026-02-13T10:30:45.123Z",
  "level": "INFO",
  "message": "Command executed",
  "requestId": "req_26c2nkt_a1b2c3d4",
  "userId": "user_1",
  "context": {
    "command": "help",
    "duration": 25
  },
  "duration": null,
  "error": null,
  "stack": null
}
```

### Sensitive Data Masking

The logging service automatically masks:
- Phone numbers: `555-123-4567` → `[PHONE_NUMBER]`
- Email addresses: `user@example.com` → `[EMAIL_ADDRESS]`
- Credit cards: `1234-5678-9012-3456` → `[CARD_NUMBER]`
- API keys: `sk_live_xxx` → `[API_KEY]`
- SSN: `123-45-6789` → `[SSN]`

No PII is exposed in log files.

---

## Error Tracking

### Capturing Errors

```javascript
try {
  // Some operation
} catch (error) {
  const errorEntry = errorTrackingService.captureError(error, {
    requestId: 'req_xxx',
    userId: 'user_1',
    operation: 'sendMessage'
  });

  console.log(`Error #${errorEntry.count}:`, error.message);
}
```

### Error Report

Get comprehensive error metrics:

```javascript
const errorReport = errorTrackingService.getErrorReport();

// Structure:
{
  totalUniqueErrors: 5,
  totalErrorCount: 42,
  topErrors: [
    {
      error: 'TypeError',
      message: 'Cannot read property...',
      count: 15,
      firstOccurrence: '2026-02-13T08:00:00.000Z',
      lastOccurrence: '2026-02-13T10:30:00.000Z'
    }
  ],
  allErrors: [/* all errors tracked */]
}
```

### Error Endpoint

```bash
# Get error report
curl http://localhost:3000/errors/report

# Get detailed error report
curl http://localhost:3000/errors/report?detailed=true
```

---

## Health Monitoring

### Health Check Endpoints

#### 1. **Health Check** - Comprehensive System Health
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-13T10:30:45.123Z",
  "uptime": 3600,
  "checks": {
    "memory": {
      "status": "healthy",
      "message": "Heap usage: 42.5%",
      "duration": 2
    },
    "cpu": {
      "status": "healthy",
      "message": "CPU cores: 8",
      "duration": 1
    },
    "commandExecutor": {
      "status": "healthy",
      "message": "CommandExecutor ready",
      "duration": 1
    }
  }
}
```

#### 2. **Readiness Check** - Is app ready to serve?
```bash
curl http://localhost:3000/ready
```

**Response:**
```json
{
  "ready": true,
  "timestamp": "2026-02-13T10:30:45.123Z",
  "checks": { /* same as /health */ }
}
```

#### 3. **Liveness Check** - Is app still running?
```bash
curl http://localhost:3000/alive
```

**Response:**
```json
{
  "alive": true,
  "timestamp": "2026-02-13T10:30:45.123Z",
  "uptime": 3600
}
```

### Adding Custom Health Checks

```javascript
// Memory health check (already included)
healthCheckService.registerCheck('database', async () => {
  try {
    const result = await database.query('SELECT 1');
    return {
      healthy: result.ok,
      message: 'Database connection OK'
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Database error: ${error.message}`
    };
  }
});

// Run checks
const status = await healthCheckService.runHealthChecks();
console.log(status);
```

---

## Metrics & Dashboards

### Metrics Endpoint

```bash
curl http://localhost:3000/metrics
```

**Response includes:**

```json
{
  "timestamp": "2026-02-13T10:30:45.123Z",
  "uptime": "3600s",
  "metrics": {
    "totalRequests": 1250,
    "totalErrors": 3,
    "totalWarnings": 15,
    "errorRate": "0.24%",
    "requestsPerSecond": "0.35",
    "performanceStats": {
      "message_processing": {
        "count": 150,
        "min": 10,
        "max": 5000,
        "avg": 250,
        "p95": 800,
        "p99": 2500
      },
      "command_execution": {
        "count": 200,
        "min": 5,
        "max": 1000,
        "avg": 50,
        "p95": 150,
        "p99": 500
      }
    }
  },
  "errors": {
    "totalUniqueErrors": 3,
    "totalErrorCount": 3,
    "topErrors": [ /* ... */ ]
  }
}
```

### Logging Info Endpoint

```bash
curl http://localhost:3000/logs/info
```

**Response:**
```json
{
  "timestamp": "2026-02-13T10:30:45.123Z",
  "metrics": {
    "totalRequests": 1250,
    "requestsPerSecond": "0.35"
  },
  "logLevel": "info",
  "performanceStats": {
    "message_processing": {
      "count": 150,
      "avg": 250,
      "p95": 800,
      "p99": 2500
    }
  }
}
```

### Application Info Endpoint

```bash
curl http://localhost:3000/info
```

**Response:**
```json
{
  "name": "WhatsApp Bot Linda",
  "version": "1.0.0",
  "timestamp": "2026-02-13T10:30:45.123Z",
  "uptime": 3600,
  "environment": "production",
  "nodeVersion": "v18.0.0",
  "platform": "linux",
  "arch": "x64",
  "memory": {
    "heapUsed": "125 MB",
    "heapTotal": "300 MB"
  }
}
```

---

## Dashboard Configuration

### Prometheus Integration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'whatsapp-bot-linda'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:3000']
```

### Grafana Dashboard

Import metrics into Grafana using the `/metrics` endpoint:

1. Add Prometheus data source pointing to your monitoring
2. Create dashboards with:
   - **Request Rate** (requests per second)
   - **Error Rate** (errors per second)
   - **Response Time** (p50, p95, p99)
   - **Memory Usage** (MB and %)
   - **Handler Performance** (by operation)
   - **Error Distribution** (top errors)

---

## Troubleshooting

### Issue: High Memory Usage

**Cause:** Memory leak or cache buildup

**Solution:**
1. Check `/metrics` for memory usage trends
2. Review logs for error patterns
3. Check cache sizes in MonitoringService
4. Restart if memory exceeds 90%

```bash
curl http://localhost:3000/health | grep -i memory
```

### Issue: High Error Rate

**Cause:** Application errors or external dependency failures

**Solution:**
1. Check error report: `curl http://localhost:3000/errors/report`
2. Review error logs: `tail -f logs/error.log`
3. Check handler health: `curl http://localhost:3000/health`
4. Review performance trends

### Issue: Slow Response Times

**Cause:** Performance bottleneck

**Solution:**
1. Check metrics for slow operations: `curl http://localhost:3000/metrics`
2. Look at performance logs: `tail -f logs/performance.log`
3. Review p95/p99 latencies
4. Profile specific handlers

### Issue: Application Not Responding

**Cause:** Deadlock, infinite loop, or resource exhaustion

**Solution:**
1. Check liveness: `curl http://localhost:3000/alive`
2. Check readiness: `curl http://localhost:3000/ready`
3. Review recent logs for errors
4. Check resource limits (CPU, memory)
5. Restart if necessary

---

## Alert Configuration

### Critical Alerts

Set up alerts for these conditions:

```
1. Error Rate > 5%
   - Action: Page on-call engineer
   - Check: /errors/report
   
2. Memory Usage > 90%
   - Action: Alert team
   - Check: /health (memory check)
   
3. Response Time p99 > 5000ms
   - Action: Investigate performance
   - Check: /metrics
   
4. Application Not Responding
   - Action: Restart service
   - Check: /alive with timeout
```

### Warning Alerts

```
1. Error Rate > 2%
   - Action: Review logs
   
2. Memory Usage > 75%
   - Action: Monitor trend
   
3. Response Time p95 > 1000ms
   - Action: Check for bottlenecks
```

### Log Alerts

Monitor logs for keywords:
- `ERROR` - Application errors
- `WARN` - Warnings and issues
- `SECURITY` - Security events
- `⚠️ SLOW` - Performance issues

---

## Best Practices

### 1. Log Appropriately

✅ **DO:**
```javascript
loggingService.info('User authenticated', { userId: 'user_1' });
loggingService.error('Database connection failed', { error: error.message });
```

❌ **DON'T:**
```javascript
loggingService.debug('Processing every message'); // Too verbose
loggingService.error('It failed');  // Not descriptive
```

### 2. Use Request IDs

```javascript
const requestId = SecurityUtils.generateRequestId();
loggingService.info('Processing request', { requestId });
// All logs in this request should use the same requestId
```

### 3. Monitor Performance

```javascript
const perfContext = loggingService.createPerformanceContext('operation_name');
// ... do work ...
const duration = perfContext.finish({ metadata: {} });
```

### 4. Track Security Events

```javascript
loggingService.logSecurityEvent('Authentication failed', {
  userId: 'user_1',
  endpoint: '/admin',
  severity: 'warning'
});
```

### 5. Handle Errors Properly

```javascript
errorTrackingService.captureError(error, {
  requestId,
  userId,
  operation: 'critical_operation'
});
```

---

## Summary

**Monitoring Infrastructure:**
- ✅ Structured logging with file rotation
- ✅ Comprehensive error tracking
- ✅ Health checks and readiness probes
- ✅ Performance metrics collection
- ✅ Security audit logging
- ✅ Multiple monitoring endpoints

**Available Endpoints:**
- `/health` - Comprehensive health check
- `/ready` - Readiness probe
- `/alive` - Liveness probe
- `/metrics` - Performance metrics
- `/logs/info` - Logging statistics
- `/errors/report` - Error report
- `/info` - Application information

**Next Steps:**
1. Deploy monitoring stack (Prometheus + Grafana)
2. Configure alerting rules
3. Set up log aggregation (ELK, Datadog, etc.)
4. Create dashboards for operations team
5. Train team on monitoring and troubleshooting

---

**Setup Complete:** February 13, 2026  
**Status:** ✅ Production-Ready Monitoring Infrastructure Deployed
