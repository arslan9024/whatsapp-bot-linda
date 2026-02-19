# Phase 29e Integration Guide

**Quick Start:** Add analytics to your bot in 5 minutes ⚡

---

## Step 1: Import Components

Add to your `index.js` (top of file):

```javascript
import AnalyticsManager from './code/utils/AnalyticsManager.js';
import UptimeTracker from './code/utils/UptimeTracker.js';
import ReportGenerator from './code/utils/ReportGenerator.js';
import MetricsDashboard from './code/utils/MetricsDashboard.js';
```

---

## Step 2: Initialize Analytics

After bot initialization, add:

```javascript
// Initialize analytics system
const analytics = new AnalyticsManager();
await analytics.initialize();
console.log('[Analytics] Initialized');

// Initialize uptime tracking
const uptimeTracker = new UptimeTracker();
await uptimeTracker.initialize();
console.log('[UptimeTracker] Initialized');

// Create report generator and dashboard
const reportGenerator = new ReportGenerator(analytics, uptimeTracker);
const metricsDashboard = new MetricsDashboard(analytics, uptimeTracker);
```

---

## Step 3: Hook Into Bot Events

Add metric recording to your existing event handlers:

### Messages
```javascript
client.on('message', async (message) => {
  // Record incoming message
  analytics.recordMetric('message.received');
  
  // ... your existing code ...
});

// When sending messages
async function sendMessage(chatId, text) {
  // ... your sending code ...
  analytics.recordMetric('message.sent');
}
```

### Account Status
```javascript
// When account connects
client.on('ready', () => {
  const accountId = client.info.me.user;
  uptimeTracker.registerAccount(accountId);
  uptimeTracker.recordAccountOnline(accountId);
  analytics.recordMetric('recovery.success');
  console.log(`[Analytics] Account online: ${accountId}`);
});

// When account disconnects
client.on('disconnect', () => {
  const accountId = client.info.me.user;
  uptimeTracker.recordAccountDowntime(accountId, 'Client disconnect');
  analytics.recordMetric('recovery.disconnection');
  console.log(`[Analytics] Account offline: ${accountId}`);
});
```

### Cache Operations
```javascript
// In your CacheManager or GorahaServicesBridge
if (cachedResult) {
  analytics.recordMetric('cache.hit', { duration: endTime - startTime });
} else {
  analytics.recordMetric('cache.miss');
}
```

### Database Operations
```javascript
// In your DatabaseManager
const start = Date.now();
try {
  const result = await operation();
  const duration = Date.now() - start;
  analytics.recordMetric('db.operation', {
    operation: 'insert',      // or 'query', 'update', 'delete'
    duration,
    success: true
  });
  return result;
} catch (error) {
  const duration = Date.now() - start;
  analytics.recordMetric('db.operation', {
    operation: 'insert',
    duration,
    success: false
  });
  throw error;
}
```

### Errors
```javascript
// In your error handlers
catch (error) {
  analytics.recordMetric('error.network', {
    errorType: error.name || 'Unknown',
    severity: error.severity || 'error',
    details: error.message
  });
  // ... your error handling ...
}
```

---

## Step 4: Dashboard Display (Optional)

Add periodic dashboard updates:

```javascript
// Display metrics every 5 minutes
setInterval(() => {
  console.log('\n' + '═'.repeat(80));
  metricsDashboard.displayFullDashboard();
  console.log('═'.repeat(80) + '\n');
}, 5 * 60 * 1000); // 5 minutes
```

Or display on-demand when user requests:

```javascript
// In your terminal command handler
if (command === 'dashboard') {
  metricsDashboard.displayFullDashboard();
}
```

---

## Step 5: Report Generation (Optional)

Add periodic reporting:

```javascript
// Generate health report every hour
setInterval(() => {
  const healthReport = reportGenerator.generateHealthCheckReport();
  console.log('\n[HEALTH CHECK]', healthReport.summary);
  
  if (healthReport.overallStatus === 'DEGRADED') {
    const alerts = healthReport.checks;
    Object.entries(alerts).forEach(([check, status]) => {
      if (status.status !== 'healthy') {
        console.warn(`  ⚠️ ${check}: ${status.message}`);
      }
    });
  }
}, 60 * 60 * 1000); // 1 hour

// Generate SLA report daily
setInterval(() => {
  const slaReport = reportGenerator.generateSlaReport();
  console.log('\n[SLA REPORT]');
  console.log(`  Compliance: ${slaReport.currentCompliance}`);
  console.log(`  Status: ${slaReport.slaStatus}`);
  
  if (!slaReport.compliant && slaReport.alerts.length > 0) {
    console.warn('  Active alerts:');
    slaReport.alerts.forEach(a => console.warn(`    - ${a.message}`));
  }
}, 24 * 60 * 60 * 1000); // 24 hours
```

---

## Step 6: Add Dashboard Commands

Update your `TerminalDashboardSetup.js` to add analytics commands:

```javascript
case 'analytics':
case 'metrics':
  metricsDashboard.displayFullDashboard();
  break;
  
case 'health':
  const healthReport = reportGenerator.generateHealthCheckReport();
  console.log('\n' + JSON.stringify(healthReport, null, 2));
  break;
  
case 'sla':
  const slaReport = reportGenerator.generateSlaReport();
  console.log('\n' + JSON.stringify(slaReport, null, 2));
  break;
  
case 'cache-metrics':
  const cacheMetrics = analytics.getMetricsByCategory('cache');
  console.log('\nCache Metrics:');
  console.log(`  Hit Rate: ${cacheMetrics.hitRate}`);
  console.log(`  Total Requests: ${cacheMetrics.totalRequests}`);
  console.log(`  Response Time: ${cacheMetrics.avgResponseTime}ms`);
  break;
  
case 'uptime':
  const uptimeReport = uptimeTracker.getSystemUptimeReport();
  console.log('\nSystem Uptime:');
  console.log(`  Status: ${uptimeReport.system.status}`);
  console.log(`  Uptime: ${uptimeReport.system.uptime}`);
  console.log(`  Online: ${uptimeReport.accounts.online}/${uptimeReport.accounts.total}`);
  break;
```

---

## Complete Integration Example

Here's a minimal complete example:

```javascript
// index.js

import AnalyticsManager from './code/utils/AnalyticsManager.js';
import UptimeTracker from './code/utils/UptimeTracker.js';
import ReportGenerator from './code/utils/ReportGenerator.js';
import MetricsDashboard from './code/utils/MetricsDashboard.js';
import WhatsAppClient from './code/CreatingNewWhatsAppClient.js';
// ... other imports ...

// ===== Analytics Setup =====
const analytics = new AnalyticsManager();
await analytics.initialize();

const uptimeTracker = new UptimeTracker();
await uptimeTracker.initialize();

const reportGenerator = new ReportGenerator(analytics, uptimeTracker);
const metricsDashboard = new MetricsDashboard(analytics, uptimeTracker);

// ===== Bot Setup =====
const client = new WhatsAppClient();

// Message events
client.on('message', async (message) => {
  analytics.recordMetric('message.received');
  // ... handle message ...
});

// Account events
client.on('ready', () => {
  const accountId = client.info.me.user;
  uptimeTracker.registerAccount(accountId);
  uptimeTracker.recordAccountOnline(accountId);
  analytics.recordMetric('recovery.success');
});

client.on('disconnect', () => {
  const accountId = client.info.me.user;
  uptimeTracker.recordAccountDowntime(accountId, 'Disconnected');
  analytics.recordMetric('recovery.disconnection');
});

// ===== Dashboard Commands =====
function handleCommand(command) {
  switch (command) {
    case 'dashboard':
      metricsDashboard.displayFullDashboard();
      break;
    case 'health':
      const health = reportGenerator.generateHealthCheckReport();
      console.log(JSON.stringify(health, null, 2));
      break;
    case 'sla':
      const sla = reportGenerator.generateSlaReport();
      console.log(JSON.stringify(sla, null, 2));
      break;
  }
}

// ===== Periodic Updates =====
setInterval(() => {
  metricsDashboard.displayFullDashboard();
}, 5 * 60 * 1000); // 5 minutes

// Start bot
console.log('[Bot] Starting...');
client.initialize();
console.log('[Analytics] Ready for metrics collection');
```

---

## Verification Checklist

After integration, verify:

- [ ] Analytics initialized without errors
- [ ] Metrics being recorded (check with `analytics.getAllMetrics()`)
- [ ] Uptime tracker has accounts registered
- [ ] Dashboard displays without errors
- [ ] Commands respond (dashboard, health, sla)
- [ ] No console errors

---

## Testing Integration

Run the test file to verify everything works:

```bash
node test-phase-29e-analytics.js
```

Expected output:
```
✅ Test 1-28: All passed
✅ Success Rate: 100%
🎉 All tests passed! Phase 29e is ready for integration.
```

---

## Troubleshooting

**"Analytics not recording metrics"**
- Check that `analytics.initialize()` completed
- Verify metric recording calls are in the right event handlers
- Check console for any error messages

**"Dashboard shows no data"**
- Wait a few seconds after bot starts (need data to display)
- Check that metrics are being recorded: `analytics.getAllMetrics()`

**"SLA showing 100%"**
- Ensure `uptimeTracker.registerAccount()` called
- Verify `recordAccountOnline/Downtime()` called correctly

**"TypeError: Cannot read property 'X' of undefined"**
- Check all components initialized (analytics, tracker, reporter)
- Verify imports are correct

---

## Next: Enable Persistence

Optional: Add MongoDB persistence (Phase 29b):

```javascript
import DatabaseManager from './code/utils/DatabaseManager.js';
import PersistenceAdapter from './code/utils/PersistenceAdapter.js';

const dbManager = new DatabaseManager();
const persistence = new PersistenceAdapter(analytics, uptimeTracker, dbManager);
await persistence.initialize();

// Now metrics are automatically saved to MongoDB
```

---

**Status:** Ready to integrate
**Time to integrate:** ~15 minutes
**Dependencies:** None (works standalone)
**Breaking changes:** None

---

For detailed documentation, see: `PHASE_29e_ANALYTICS_COMPLETE.md`
