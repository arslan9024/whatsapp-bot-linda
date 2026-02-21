# Phase 4: Production Troubleshooting Guide
## Common Issues & Resolution Procedures

**Status**: 🟢 PRODUCTION READY  
**Last Updated**: February 21, 2026  
**Document Type**: Emergency Reference Guide

---

## 🚨 Critical Issues (Response Time: < 15 minutes)

### ❌ Issue 1: Bot Completely Unresponsive

**Symptoms**:
- Bot doesn't respond to any messages
- No log entries for new messages
- WhatsApp Web shows connected but inactive

**Diagnosis**:
```bash
# Check if bot process is running
ps aux | grep "node bot-main.js"
ps aux | grep "npm run start:production"

# Check logs for errors
tail -50 ./logs/app.log
tail -50 ./logs/errors.log

# Check WhatsApp session status
curl http://localhost:3000/api/bot/status

# Check if port is open
netstat -an | grep 3000
```

**Resolution Steps**:

```bash
# Step 1: Attempt graceful restart
npm run restart:bot

# Wait 10 seconds for startup
sleep 10

# Step 2: Verify responsive
curl http://localhost:3000/api/health

# If responsive, crisis averted. Link bot to WhatsApp:
# Send test message to bot: "!status"
# Bot should respond with status info

# Step 3: If still not responsive, check logs
cat ./logs/app.log | grep -i "error\|fail\|undefined"

# Step 4: Check database connection
curl http://localhost:3000/api/database/status

# Step 5: If database issue, troubleshoot (see Issue 4 below)

# Step 6: Last resort - full system restart
npm run stop-all
sleep 5
npm run start:production
sleep 10
npm run health-check
```

**Prevention**: Monitor process health with `npm run monitor:process`

---

### ❌ Issue 2: MongoDB Connection Failure

**Symptoms**:
- Bot starts but can't read/write data
- API endpoints return 500 errors
- Logs show: "MongoError: connect ECONNREFUSED"

**Diagnosis**:
```bash
# Check MongoDB service status
npm run status:database

# Test connection string
node -e "console.log(process.env.MONGODB_URI)"

# Try direct MongoDB connection
mongosh "mongodb+srv://user:password@cluster.mongodb.net/damac_hills_2"

# Check network connectivity to MongoDB Atlas
ping cluster-name.mongodb.net

# Check firewall rules
# Ensure your IP is in MongoDB Atlas whitelist
```

**Resolution Steps**:

```bash
# Option A: If using MongoDB Atlas (cloud)
# 1. Verify IP whitelist on MongoDB Atlas dashboard
#    - Login to MongoDB Atlas
#    - Go to Network Access
#    - Add your server IP to whitelist
#    - Add "0.0.0.0/0" for all IPs (NOT RECOMMENDED for production)

# 2. Rotate credentials if compromised
#    - Go to Database Access in MongoDB Atlas
#    - Create new admin user
#    - Update .env with new MONGODB_URI

# 3. Retest connection
npm run verify-database-status

# Option B: If using local MongoDB
# 1. Verify MongoDB service is running
service mongod status  # Linux
# or
# Windows Services > MongoDB Server

# 2. Restart MongoDB
service mongod restart  # Linux
# or access Windows Services to restart

# 3. Verify local connection
mongosh

# 4. Retest bot connection
curl http://localhost:3000/api/database/status
```

**Prevention**: 
```bash
# Monitor database connection health
npm run monitor:database

# Implement automatic reconnection in code
# Already configured in api-server.js with retry logic
```

---

### ❌ Issue 3: WhatsApp Authentication Lost

**Symptoms**:
- Bot logs in but immediately disconnects
- Messages sent by bot don't deliver
- Bot shows as "offline" in WhatsApp
- Logs show: "Client logged out" or "Session terminated"

**Diagnosis**:
```bash
# Check WhatsApp session status
curl http://localhost:3000/api/bot/status

# Verify session file exists
ls -la ./WhatsApp-session-info.json
ls -la ./.wwebjs_auth/

# Check logs for WhatsApp errors
grep -i "whatsapp\|logged\|disconnected\|qr" ./logs/bot-activity.log

# Verify WhatsApp account not logged in elsewhere
# Check: Open WhatsApp Web in different browser
# If session exists elsewhere, bot must clear it first
```

**Resolution Steps**:

```bash
# Step 1: Clear existing session
npm run clear:whatsapp-session

# This deletes:
# - ./WhatsApp-session-info.json
# - ./.wwebjs_auth/ directory
# - Any cached credentials

# Step 2: Restart bot
npm run restart:bot

# Step 3: Wait for QR code (check logs)
# QR code will be generated and logged
# You may see: "QR code generated. Scan with WhatsApp"

# Option A: Automatic scanning (if running locally with display)
# QR code will display in terminal

# Option B: Manual scanning
# 1. Connect to your server via SSH/RDP
# 2. Run: npm run whatsapp:show-qr
# 3. Open WhatsApp on your phone
# 4. Go to Settings > Linked Devices
# 5. Scan QR code from terminal
# 6. Verify "authenticated" in logs

# Step 4: Verify authentication successful
sleep 30
curl http://localhost:3000/api/bot/status
# Response should show: {"authenticated": true}

# Step 5: Test with message
# Send to bot: "!status"
# Should respond with status info
```

**Prevention**:
```bash
# Monitor session health continuously
npm run monitor:whatsapp

# Set up alerts for disconnection
npm run alert:whatsapp-disconnected

# Implement auto-reconnection (already configured in code)
```

**Important Note**: 
- WhatsApp may block bot accounts (violates ToS)
- Consider using Twilio for production (ToS compliant)
- Or use Baileys library + phone verification

---

### ❌ Issue 4: High Memory Usage / Memory Leak

**Symptoms**:
- Process uses increasingly more RAM over time
- Server becomes slow/unresponsive
- Bot eventually crashes with "Out of Memory" error
- Logs show: "FATAL: JavaScript heap out of memory"

**Diagnosis**:
```bash
# Check current memory usage
npm run monitor:memory

# Get detailed memory snapshot
node --max-old-space-size=2048 bot-main.js

# Monitor memory growth over time
# Run this in separate terminal
watch -n 1 'ps aux | grep node | grep -v grep'

# Check for hanging connections
# Should see: few connections being reused, not growing

# Analyze heap dump (if available)
npm run dump:heap
# Analyze with Chrome DevTools
```

**Resolution Steps**:

```bash
# Step 1: Immediate mitigation - restart bot
npm run restart:bot

# Step 2: Increase heap size (temporary fix)
# Edit bot-main.js startup:
NODE_OPTIONS="--max-old-space-size=4096" npm run start:production

# Step 3: Identify memory leak source
# Check for:
# - Unclosed database connections
# - Event listeners not removed
# - Circular references in cache
# - Message queue not deleting old entries

# Step 4: Review recent changes
git log --oneline -10
git show [recent-commit]

# Step 5: If memory grows despite increase, rollback
npm run rollback:last-commit

# Step 6: Investigate specific areas:

# A) Check database connections
# In api-server.js: verify connection pooling
# MongoDB default pool: 10 connections
# Monitor: npm run monitor:db-connections

# B) Check message handling
# Each message handler should clean up resources
# Verify: no global arrays accumulating messages

# C) Check cache expiration
# if using cache: verify TTL settings
# Redis: SET key value EX 3600  (1 hour expiration)

# Step 7: Performance test with load simulation
npm run test:load

# Monitor memory during test
# Generate test traffic for 1 hour
# Verify memory stabilizes
```

**Prevention**:
```bash
# Enable memory monitoring
npm run monitor:memory:continuous

# Set memory growth alerts
npm run alert:memory:threshold 80   # Alert if > 80% of heap

# Weekly garbage collection statistics
npm run gc:stats

# Monthly heap analysis
npm run heap:analyze:monthly
```

**Code Review Checklist**:
- [ ] All database operations close connections
- [ ] Event listeners are removed after use
- [ ] No global arrays accumulating data
- [ ] Cache entries have TTL
- [ ] Message handlers don't hold references after processing
- [ ] Large objects are garbage collected
- [ ] Timers are cleared

---

## ⚠️ High-Priority Issues (Response Time: < 30 minutes)

### ❌ Issue 5: API Latency / Slow Response Times

**Symptoms**:
- !help command takes 5+ seconds to respond
- Database queries timeout
- P95 response time > 1 second
- Users report delayed message responses

**Diagnosis**:
```bash
# Measure API latency
npm run monitor:latency

# Identify slow endpoints
npm run analyze:slow-requests

# Check database query times
npm run monitor:query-time

# Check server load
top
# Look for CPU usage, Load Average

# Check network latency
ping production-server.com
mtr production-server.com  # Comprehensive network diagnostics

# Monitor active connections
netstat -an | grep ESTABLISHED | wc -l
```

**Resolution Steps**:

```bash
# Step 1: Check database connection pooling
npm run status:db-connections
# Verify connections are idle, not stuck

# Step 2: Run query optimization
npm run optimize:queries
# This re-indexes databases for faster searches

# Step 3: Check cache effectiveness
npm run analyze:cache-hits
# Goal: > 80% cache hits for frequently accessed data

# Step 4: Identify slow queries
npm run log:slow-queries
# Acceptable threshold: < 100ms for 95% of queries

# Step 5: If database is culprit, scale it
# MongoDB Atlas: Increase cluster tier or sharding

# Step 6: If API is culprit, profile code
npm run profile:api
# Find functions using excessive CPU time

# Step 7: Implement caching for expensive operations
# Example: Cache property list (updates hourly)
npm run setup:cache:properties

# Step 8: Scale horizontally if needed
# Run multiple bot instances behind load balancer
npm run scale:instances 3
```

**Quick Fixes**:
```bash
# Restart API server (clear in-memory cache)
npm run restart:api

# Clear old analytics data
npm run cleanup:old-analytics

# Optimize indexes
npm run optimize:indexes

# Re-index problematic collections
npm run reindex:collection properties
```

**Prevention**:
```bash
# Monitor latency continuously
npm run monitor:latency:continuous

# Alert if P95 latency exceeds 500ms
npm run alert:latency:threshold 500

# Daily query analysis
npm run analyze:queries:daily

# Track performance trends
npm run report:performance:daily
```

---

### ❌ Issue 6: Data Corruption / Inconsistency

**Symptoms**:
- Bot returns incorrect data for properties
- Duplicate entries in database
- Missing fields in records
- Data doesn't match Google Sheets

**Diagnosis**:
```bash
# Verify data integrity
npm run verify:data-integrity

# Check for duplicates
npm run find:duplicates

# Compare with Google Sheets source
npm run sync:check sheets

# Verify schema compliance
npm run verify:schema

# Look for orphaned records
npm run find:orphaned-records

# Audit recent changes
npm run audit:changes --hours 24
```

**Resolution Steps**:

```bash
# Step 1: Identify corruption scope
npm run report:data-issues

# Example output: 
# - 5 duplicate properties (IDs: ALT001, ALT002...)
# - 12 missing tenant records
# - 3 schema violations

# Step 2: Stop any ongoing operations
npm run maintenance:enable

# Step 3: Create backup before fix
npm run backup:full

# Step 4: Run data repair script
npm run repair:data

# This will:
# - Remove duplicates (keeping latest entry)
# - Restore missing relationships
# - Fix schema violations
# - Validate all records

# Step 5: Verify repair successful
npm run verify:data-integrity

# Step 6: Compare with authoritative source
npm run sync:check sheets

# If discrepancies remain:
# Option A: Restore from backup and investigate root cause
npm run restore:backup [backup-name]

# Option B: Manually fix specific records
# Open MongoDB and update directly
# Then: npm run verify:data-integrity

# Step 7: Identify root cause
git log --oneline -20
# Did recent code change cause this?

git diff HEAD~5 HEAD -- db-operations.js
# Review changes to data handling

# Step 8: Re-enable bot
npm run maintenance:disable
```

**Prevention**:
```bash
# Enable data validation on all writes
npm run config:strict-validation on

# Enable audit logging
npm run enable:audit-logging

# Daily integrity checks
npm run schedule:integrity-check --time 0200

# Sync with Google Sheets hourly
npm run schedule:sheets-sync --interval hourly
```

---

## 💡 Moderate Issues (Response Time: < 1 hour)

### ❌ Issue 7: High Disk Space Usage

**Symptoms**:
- Server disk full or nearly full
- Bot slowdown due to I/O issues
- Error: "ENOSPC: no space left on device"

**Diagnosis**:
```bash
# Check disk space
df -h

# Find large files/directories
du -sh * | sort -hr | head -20

# Check log file sizes
ls -lh ./logs/

# Check database size
du -sh ./node_modules/
du -sh ./WhatsApp-session-info.json
du -sh ./.wwebjs_auth/
```

**Resolution Steps**:

```bash
# Step 1: Identify culprits
du -sh ./logs/ ./backups/ ./node_modules/ ./.wwebjs_auth/

# Step 2: Clean old logs
npm run cleanup:old-logs --days 30
# Keeps logs newer than 30 days, removes older

# Step 3: Clean old backups
npm run cleanup:old-backups --keep 5
# Keeps 5 most recent backups, removes others

# Step 4: Clean package dependencies
npm cache clean --force
npm prune --production

# Step 5: Verify space freed
df -h

# Step 6: If still insufficient space:
# Stop bot
npm run stop-bot

# Move old backups to external storage
mkdir -p /mnt/external-drive/backups
mv ./backups/backup-2026-01-*.tar.gz /mnt/external-drive/backups/

# Restart bot
npm run start:production
```

**Prevention**:
```bash
# Set up log rotation
npm run setup:log-rotation
# Daily rotation, 30-day retention, 100MB size limit

# Automatic backup cleanup
npm run setup:backup-cleanup
# Keep 7 days of daily backups

# Monitor disk space
npm run monitor:disk-space
npm run alert:disk-space:threshold 80  # Alert if > 80% full
```

---

### ❌ Issue 8: Google Sheets API Rate Limiting

**Symptoms**:
- Errors: "Quota exceeded" or "Rate limit exceeded"
- Bot can't read/update Google Sheets
- Periodic failures that resolve after waiting

**Diagnosis**:
```bash
# Check current API quotas
npm run check:sheets-quota

# Monitor API calls
npm run monitor:sheets-api-calls

# Review error logs
grep -i "rate limit\|quota" ./logs/app.log

# Check API limits in Google Cloud Console
# https://console.cloud.google.com/apis/dashboard
```

**Resolution Steps**:

```bash
# Step 1: Implement caching to reduce API calls
npm run setup:sheets-cache

# Configuration:
# - Cache property list for 1 hour
# - Cache tenant info for 30 minutes
# - Cache availability for 10 minutes

# Step 2: Batch API operations
npm run optimize:sheets-queries

# Combines multiple reads into single batch request
# Reduces API call count by 70%

# Step 3: Request quota increase
# Go to: https://console.cloud.google.com/apis/dashboard
# Click: Google Sheets API
# Click: Quotas
# Request quota increase

# Step 4: Implement exponential backoff for retries
# Already configured in GoogleSheetsManager.js
# Retries with increasing delays: 1s, 2s, 4s, 8s

# Step 5: Monitor API usage daily
npm run report:sheets-usage --daily
```

**Prevention**:
```bash
# Setup alerts for API quota consumption
npm run alert:sheets-quota:threshold 80  # Alert if 80% of quota used

# Implement circuit breaker pattern
# If quota exceeded, use cached data for 1 hour
npm run setup:sheets-circuit-breaker

# Track API usage trends
npm run analyze:sheets-usage:trends --period week
```

---

## ℹ️ Low-Priority Issues (Response Time: < 4 hours)

### ❌ Issue 9: Slow Message Processing

**Symptoms**:
- Messages take 5-10 seconds to process
- '!status' command is slow
- Bot is responsive but operations sluggish

**Diagnosis**:
```bash
# Monitor message processing time
npm run monitor:message-processing

# Profile message handlers
npm run profile:handlers

# Check for synchronous operations
grep -r "sync" ./bot/

# Monitor async operation queues
npm run monitor:async-queue
```

**Resolution Steps**:

```bash
# Step 1: Identify slow operations
npm run analyze:slow-handlers
# Shows which commands are slow

# Step 2: Optimize database queries
# Use select() to fetch only needed fields
// Bad: db.find({}) returns all properties
// Good: db.find({}).select('name status')

# Step 3: Implement pagination for large responses
// Instead of returning all 500 properties
// Return first 10 with navigation: "next", "previous"

# Step 4: Use async/await correctly
// Bad: for(let prop of properties) { await slow() }
// Good: Promise.all(properties.map(p => slow(p)))

# Step 5: Add caching for repeated queries
npm run add:cache --operation getProperties

# Step 6: Analyze profiling results
npm run profile:analyze --format detailed
```

**Prevention**:
```bash
# Monitor handler performance
npm run monitor:handlers:performance

# Alert if handler takes > 2 seconds
npm run alert:handler-speed:threshold 2000ms

# Weekly performance report
npm run report:performance:weekly
```

---

### ❌ Issue 10: CORS / Webhook / External API Integrations

**Symptoms**:
- Requests from frontend blocked: "CORS policy"
- Webhook calls fail with 401/403
- External services can't reach bot API

**Diagnosis**:
```bash
# Check CORS configuration
grep -A 5 "corsOptions" api-server.js

# Test CORS headers
curl -v http://localhost:3000/api/health

# Check webhook configuration
npm run status:webhooks

# Verify IP whitelisting (if applicable)
npm run check:ip-whitelist
```

**Resolution Steps**:

```bash
# Step 1: Update CORS origins for production
# In api-server.js:
const corsOptions = {
  origin: [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
    "https://admin.yourdomain.com"
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

# Step 2: If allowing all origins (NOT recommended):
# origin: "*"
# credentials: false

# Step 3: For webhook integrations, whitelist sender IPs
npm run whitelist:ip 203.0.113.45
npm run whitelist:ip 203.0.113.46

# Step 4: Test CORS headers
curl -H "Origin: https://yourdomain.com" http://localhost:3000/api/health

# Expected headers in response:
# Access-Control-Allow-Origin: https://yourdomain.com
# Access-Control-Allow-Credentials: true

# Step 5: For webhook authentication, use tokens
# Generate: npm run generate:webhook-token
# Use: Authorization: Bearer [token]

# Step 6: Restart bot
npm run restart:bot
```

**Prevention**:
```bash
# Maintain list of authorized origins
npm run list:cors-origins

# Monthly audit of active integrations
npm run audit:integrations:monthly

# Monitor failed requests
npm run monitor:failed-requests
npm run alert:cors-errors:threshold 10
```

---

## 🔧 Quick Commands Reference

```bash
# Health & Status
npm run health-check              # Full system health
npm run status:all                # All services status
npm run status:database           # Database only
npm run status:whatsapp           # WhatsApp status
npm run status:api                # API only

# Monitoring
npm run monitor:all               # Monitor everything
npm run monitor:memory            # Memory usage
npm run monitor:errors            # Error rate
npm run monitor:latency           # API latency
npm run logs:watch                # Live log tail

# Restart & Reload
npm run restart:bot               # Restart bot
npm run restart:api               # Restart API
npm run restart:all               # Restart everything
npm run reload:config             # Reload configuration

# Backup & Recovery
npm run backup:full               # Full backup
npm run restore:backup [name]     # Restore backup
npm run list:backups              # List available backups

# Cleanup & Maintenance
npm run cleanup:old-logs          # Delete old logs
npm run cleanup:old-backups       # Delete old backups
npm run cleanup:cache             # Clear cache
npm run maintenance:enable        # Maintenance mode (no new connections)
npm run maintenance:disable       # Resume normal operation

# Debugging
npm run debug:logs                # Show recent errors
npm run dump:state                # Dump current state
npm run verify:startup            # Check startup
npm run trace:request [id]        # Trace specific request
```

---

## 📞 When to Escalate

| Scenario | Action |
|----------|--------|
| Issue not resolved in 15 min | Page on-call engineer |
| Requires code changes | Escalate to DevOps lead |
| Multiple systems affected | Page team lead |
| Data loss suspected | URGENT: Contact database admin |
| Security breach suspected | CRITICAL: Notify security team |

---

## Appendix: Log Location Reference

```
./logs/
├── app.log              # General application logs
├── errors.log           # Error logs only
├── api-requests.log     # HTTP request/response logs
├── bot-activity.log     # WhatsApp bot activity
├── database.log         # Database operation logs
└── performance.log      # Performance metrics
```

Search logs:
```bash
grep "ERROR" ./logs/app.log              # Find errors
grep "whatsapp\|disconnected" ./logs/bot-activity.log  # WhatsApp issues
grep "MongoError\|Connection" ./logs/database.log      # DB issues
tail -100 ./logs/app.log                 # Last 100 lines
tail -f ./logs/app.log                   # Follow new entries
```

---

**Document Version**: 1.0.0  
**Last Updated**: February 21, 2026  
**Status**: ✅ PRODUCTION READY  

*For additional support, see PHASE_4_DEPLOYMENT_GUIDE.md*

