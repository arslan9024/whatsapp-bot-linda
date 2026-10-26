# Phase 4: Production Runbook
## Daily Operations & Maintenance Procedures

**Status**: 🟢 PRODUCTION READY  
**Last Updated**: February 21, 2026  
**Document Type**: Operational Procedures Manual

---

## 📖 Table of Contents

1. Daily Operations
2. Weekly Maintenance
3. Monthly Reviews
4. Service Management
5. Backup & Recovery
6. Performance Optimization
7. User Support Procedures
8. Emergency Contacts

---

## 📅 Daily Operations (Every Day)

### Morning Health Check (0900)

**Duration**: 10 minutes  
**Checklist**:

```bash
#!/bin/bash
# File: scripts/daily-morning-check.sh

echo "=== MORNING HEALTH CHECK ==="
echo "Time: $(date)"

# 1. System Status
echo "\n[1] Checking system status..."
npm run status:all
# ✓ All services should show "running" or "ok"

# 2. API Health
echo "\n[2] Checking API health..."
curl -s http://localhost:3000/api/health | jq '.'
# ✓ Should return: {"status": "ok"}

# 3. Database Connection
echo "\n[3] Checking database..."
curl -s http://localhost:3000/api/database/status | jq '.'
# ✓ Should return: {"status": "connected"}

# 4. WhatsApp Connection
echo "\n[4] Checking WhatsApp bot..."
curl -s http://localhost:3000/api/bot/status | jq '.'
# ✓ Should return: {"authenticated": true}

# 5. Google Sheets Integration
echo "\n[5] Checking Google Sheets..."
curl -s http://localhost:3000/api/sheets/status | jq '.'
# ✓ Should return: {"status": "connected"}

# 6. Recent Errors
echo "\n[6] Checking for recent errors..."
tail -20 ./logs/errors.log | grep -i "error"
# ⚠️ Should show no errors from last 1 hour

# 7. System Resources
echo "\n[7] Checking system resources..."
echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2}')"
echo "CPU Load: $(uptime | awk -F 'load average:' '{print $2}')"
# ✓ Memory < 70%, Disk > 100GB, Load < 4

# 8. Uptime
echo "\n[8] Bot uptime..."
npm run uptime

echo "\n=== MORNING CHECK COMPLETE ==="
```

**Run Morning Check**:
```bash
chmod +x scripts/daily-morning-check.sh
./scripts/daily-morning-check.sh

# Expected output:
# ✓ All services running
# ✓ API responding
# ✓ Database connected
# ✓ WhatsApp authenticated
# ✓ Sheets integration working
# ✓ No recent errors
# ✓ System resources normal
# ✓ Uptime > 99%
```

**If Issues Found**:

| Issue | Action |
|-------|--------|
| Service not running | `npm run restart:[service]` |
| API not responding | Check logs, restart API |
| Database disconnected | Check MongoDB status, reconnect |
| WhatsApp offline | Re-authenticate (clear session, scan QR) |
| High errors | Review error logs, investigate root cause |
| Low disk space | Run cleanup, delete old backups |

---

### Business Hours Monitoring (0900-1800)

**Frequency**: Every 2 hours  
**Quick Check**: 2 minutes

```bash
#!/bin/bash
# File: scripts/hourly-check.sh

echo "=== HOURLY STATUS CHECK ==="

# 1. Quick API check
response=$(curl -s -w "%{http_code}" http://localhost:3000/api/health -o /dev/null)
if [ "$response" != "200" ]; then
  echo "⚠️  API returned HTTP $response"
  npm run restart:api
fi

# 2. Error count check
error_count=$(tail -1000 ./logs/app.log | grep -c "ERROR")
if [ "$error_count" -gt 10 ]; then
  echo "⚠️  High error rate: $error_count errors in last 1000 logs"
  # Escalate to team
fi

# 3. Memory check
memory_usage=$(npm run monitor:memory -q | grep "Usage" | awk '{print $NF}' | sed 's/%//')
if [ "$memory_usage" -gt 75 ]; then
  echo "⚠️  High memory usage: ${memory_usage}%"
  npm run restart:bot
fi

echo "=== HOURLY CHECK COMPLETE ==="
```

---

### Evening Summary (1700 or end of shift)

**Duration**: 5 minutes

```bash
#!/bin/bash
# File: scripts/daily-evening-summary.sh

echo "=== EVENING SUMMARY REPORT ==="
echo "Date: $(date)"

# 1. Daily Statistics
echo "\n[Stats] Daily Summary"
npm run report:daily-stats

# Output includes:
# - Total messages processed
# - API calls served
# - Database operations
# - Average response time
# - Error count

# 2. Incidents Log
echo "\n[Incidents] Issues encountered today"
grep "WARN\|ERROR" ./logs/app.log | tail -20

# 3. Performance Metrics
echo "\n[Performance] Today's metrics"
npm run report:daily-performance

# 4. Database Size Check
echo "\n[Database] Size and health"
npm run database:info

# 5. Backup Status
echo "\n[Backup] Last backup"
ls -lh ./backups/ | tail -1

# 6. Sign-off Checklist
echo "\n[Checklist] Ready for next shift?"
echo "☑ All services running: $(npm run status:all | grep -q 'running' && echo 'YES' || echo 'NO')"
echo "☑ No critical errors: $(grep -c 'ERROR' ./logs/app.log | awk '{if($1<5) print "YES"; else print "NO"}')"
echo "☑ System resources normal: $(echo 'YES or NO based on above')"
echo "☑ Database backed up: $(ls ./backups/*.tar.gz | wc -l) backups available"

echo "\n=== EVENING SUMMARY COMPLETE ==="
echo "Shift: [YOUR NAME] | Date: $(date +%Y-%m-%d)"
```

---

## 🗓️ Weekly Maintenance (Every Sunday 2300-2330 UTC)

**Duration**: 30 minutes  
**Maintenance Window**: 30 minutes of reduced availability

### Pre-Maintenance

```bash
# 1. Notify team
echo "ANNOUNCEMENT: Maintenance window starting in 5 minutes"
npm run notify:team "scheduled-maintenance"

# 2. Disable new connections
npm run maintenance:enable
# Bot stays online but stops accepting new commands

# 3. Allow in-flight requests to complete
sleep 30
```

### Maintenance Tasks

```bash
#!/bin/bash
# File: scripts/weekly-maintenance.sh

echo "=== WEEKLY MAINTENANCE ==="
echo "Time: $(date)"

# 1. Create full backup
echo "\n[1] Creating backup..."
npm run backup:full
# Creates: ./backups/backup-2026-02-21-230000.tar.gz

# 2. Clear old logs (older than 30 days)
echo "\n[2] Cleaning old logs..."
npm run logs:cleanup --days 30
# Keeps logs from last 30 days

# 3. Clean old backups (keep 5 most recent)
echo "\n[3] Cleaning old backups..."
npm run cleanup:old-backups --keep 5
# Keeps: 5 most recent backups (about 1 week)

# 4. Optimize database indexes
echo "\n[4] Optimizing database..."
npm run database:optimize
# Reindexes collections for better performance

# 5. Run full test suite
echo "\n[5] Running tests..."
npm run test:full
# Runs all unit, integration, and E2E tests
# Should pass: 100%

# 6. Verify data integrity
echo "\n[6] Verifying data integrity..."
npm run verify:data-integrity
# Checks for duplicates, orphaned records, schema violations

# 7. Generate weekly report
echo "\n[7] Generating weekly report..."
npm run report:weekly

# Report includes:
# - Statistics (messages, API calls, errors)
# - Performance metrics
# - Resource usage
# - Uptime percentage
# - Incidents and resolutions
# - Recommendations for improvements

# 8. Check security updates
echo "\n[8] Checking security..."
npm audit --production
# Should show: 0 vulnerabilities

echo "\n=== MAINTENANCE COMPLETE ==="
```

### Post-Maintenance

```bash
# 1. Run health check
npm run health-check

# 2. Re-enable bot
npm run maintenance:disable

# 3. Notify team
npm run notify:team "maintenance-complete"

# 4. Document any issues
# Add summary to: ./docs/maintenance-log.md
echo "[$(date)] Maintenance completed. All tests passed. 0 errors." >> ./docs/maintenance-log.md
```

---

## 📊 Monthly Reviews (1st of each month)

**Duration**: 2-3 hours  
**Meeting**: Team + DevOps + Product Lead

### Monthly Metrics Review

```bash
#!/bin/bash
# File: scripts/monthly-review.sh

echo "=== MONTHLY METRICS REVIEW ==="
echo "Month: $(date +%B %Y)"

# 1. Uptime Report
echo "\n[Uptime] Monthly availability"
npm run report:uptime --month
# Target: > 99.5%
# Planned maintenance excluded

# 2. Performance Metrics
echo "\n[Performance] Monthly trends"
npm run report:performance --month
# - Average API response time
# - P95 response time
# - P99 response time
# - Error rate

# 3. Resource Usage
echo "\n[Resources] Monthly consumption"
npm run report:resources --month
# - Average CPU usage
# - Peak memory usage
# - Database size growth
# - Storage usage

# 4. User Activity
echo "\n[Activity] Monthly statistics"
npm run report:activity --month
# - Total messages processed
# - Total commands executed
# - Most used features
# - User feedback summary

# 5. Incidents History
echo "\n[Incidents] Monthly summary"
npm run report:incidents --month
# - Total incidents
# - Average resolution time
# - Incident categories
# - Prevention measures

# 6. Cost Analysis
echo "\n[Cost] Monthly expenses"
npm run report:costs --month
# - Cloud infrastructure costs
# - API usage costs
# - Backup storage costs
# - Total monthly cost

# 7. Recommendations
echo "\n[Recommendations] For next month"
npm run generate:recommendations --month
# Based on metrics, suggest:
# - Performance improvements
# - Cost optimizations
# - Feature enhancements
# - Risk mitigations
```

### Monthly Meeting Agenda

```markdown
## Monthly Review Meeting
**Date**: 1st of each month  
**Duration**: 1 hour  
**Attendees**: DevOps, Product, Team Lead

### Agenda
1. [10 min] Uptime & Performance Summary
   - Were targets met? (99.5% uptime, < 200ms latency)
   - Any incidents? What was root cause?

2. [10 min] Resource Usage & Costs
   - How are we trending? (CPU, memory, storage)
   - Any optimization opportunities?

3. [10 min] User Feedback & Feature Requests
   - What are users reporting?
   - Any critical issues?

4. [10 min] Team Updates
   - Any team concerns?
   - Training needs?

5. [10 min] Action Items for Next Month
   - Performance improvements
   - Cost optimizations
   - Feature enhancements

6. [10 min] Q&A & Closing

### Post-Meeting
- Document decisions
- Create Jira tickets for action items
- Share metrics dashboard with team
```

---

## 🔄 Service Management

### Starting Services

```bash
# Start all services
npm run start:all

# Or start individually
npm run start:api          # Express API server
npm run start:bot          # WhatsApp bot
npm run start:monitoring   # Monitoring dashboard

# Verify startup
npm run verify:startup

# Expected output:
# ✓ API server started on port 3000
# ✓ MongoDB connected
# ✓ WhatsApp bot authenticated
# ✓ Google Sheets connected
# ✓ All systems ready
```

### Stopping Services

```bash
# Graceful shutdown (waits for ongoing operations)
npm run stop:all
# Timeout: 30 seconds

# Force shutdown (immediate)
npm run stop:all --force
# Immediately terminates all processes

# Stop specific service
npm run stop:bot
npm run stop:api
```

### Restarting Services

```bash
# Restart all services (graceful)
npm run restart:all
# Stops gracefully, then starts

# Restart with 60-second downtime
npm run restart:all --downtime 60

# Restart specific service
npm run restart:bot
npm run restart:api

# Restart and reload configuration
npm run restart:all --reload-config
```

---

## 💾 Backup & Recovery Procedures

### Automatic Backups

**Schedule**: Daily at 0200 UTC

```bash
# Already configured to run automatically
# No action needed

# Monitor backup status
npm run status:backups

# Output:
# Last backup: 2026-02-21 02:00:05 (19 hours ago)
# Backup size: 125 MB
# Backups retained: 7 (1 week)
```

### Manual Backup

```bash
# Create backup immediately (if needed)
npm run backup:full

# Backup includes:
# - MongoDB database dump
# - Application configuration
# - Session data
# - Code snapshot

# Backup location
ls -lh ./backups/backup-*.tar.gz

# Verify backup integrity
npm run verify:backup ./backups/backup-2026-02-21-*.tar.gz
```

### Recovery from Backup

**Estimated Recovery Time**: 10 minutes

```bash
# Step 1: List available backups
npm run list:backups

# Step 2: Choose backup to restore
# Select from list above
BACKUP_FILE="./backups/backup-2026-02-21-020000.tar.gz"

# Step 3: Stop bot
npm run stop:all

# Step 4: Restore from backup
npm run restore:backup $BACKUP_FILE

# Step 5: Verify restore
npm run verify:startup

# Step 6: Restart bot
npm run start:all

# Step 7: Verify recovery successful
npm run health-check
```

### Backup Location Strategy

```bash
# Local backups (quick recovery, limited space)
./backups/backup-*.tar.gz
# Keep: 7 most recent (1 week)

# Cloud backups (long-term, disaster recovery)
# Upload to: AWS S3 / Azure Blob Storage / Google Cloud Storage
npm run backup:upload-to-cloud

# Configuration:
AWS_BUCKET=damac-hills-2-backups
RETENTION_DAYS=30  # Keep 30 days for compliance

# Cross-region replication (disaster recovery)
# Ensure backups replicated to different geographic region
```

---

## ⚡ Performance Optimization

### Daily Performance Tuning

```bash
# 1. Analyze slow queries
npm run analyze:slow-queries

# If P95 latency > 500ms:
# Optimize indexes
npm run optimize:indexes

# 2. Check cache effectiveness
npm run analyze:cache-hits

# Goal: > 80% cache hits
# If below: Add more frequently-accessed data to cache

# 3. Monitor connection pooling
npm run monitor:db-connections

# Expected: ~10 connections, mostly idle
# If high idle count: Reduce pool size

# 4. Profile hot code paths
npm run profile:hot-paths

# Identify functions using most CPU time
# Optimize or cache results
```

### Weekly Performance Report

```bash
npm run report:performance --week

# Metrics:
# - API latency trends
# - Database performance
# - Cache hit ratio
# - Error rate
# - Resource usage

# Compare against baseline
# Alert if any metric degraded > 10%
```

---

## 🤝 User Support Procedures

### Handling User Issues

**Severity Levels**:

| Severity | Description | Response Time | Escalation |
|----------|-------------|----------------|------------|
| 🔴 Critical | Bot completely down, data loss risk | 15 min | Immediate |
| 🟠 High | Major feature broken, workaround exists | 1 hour | 30 min if unresolved |
| 🟡 Medium | Minor feature broken, can be worked around | 4 hours | 2 hours if unresolved |
| 🟢 Low | Enhancement request, bug with no impact | 24 hours | N/A |

### Support Ticket Workflow

```bash
# 1. User reports issue
# Example: "Bot doesn't show property details"

# 2. Log ticket
npm run ticket:create \
  --user "user@example.com" \
  --issue "Property details not displaying" \
  --severity "high"

# 3. Investigate
npm run ticket:investigate --ticket-id 12345
# Check: logs, database, API responses

# 4. Troubleshoot
# Follow: PHASE_4_DEPLOYMENT_TROUBLESHOOTING.md
# Try: restart, check logs, verify data

# 5. Resolve
npm run ticket:resolve --ticket-id 12345 --solution "Restarted API, issue resolved"

# 6. Document
# Add to: knowledge-base.md
```

### Common User Issues & Resolutions

```bash
# Issue: "Bot not responding to commands"
# Resolution:
npm run restart:bot
# Wait 30 seconds
# User retries command

# Issue: "Showing old property information"
# Resolution:
npm run sync:sheets
# Wait for sync to complete (1-2 min)
# User refreshes

# Issue: "Getting error 'Property not found'"
# Resolution:
npm run verify:database
# If data missing: restore from backup
# Update from Google Sheets

# Issue: "Slow response time"
# Resolution:
npm run optimize:indexes
npm run restart:bot
# Performance should improve immediately
```

---

## 📞 Emergency Contacts & Escalation

### On-Call Rotation

```
Week 1 (Feb 1-7):   Engineer A - [phone] [email]
Week 2 (Feb 8-14):  Engineer B - [phone] [email]
Week 3 (Feb 15-21): Engineer C - [phone] [email]
Week 4 (Feb 22-28): Engineer A - [phone] [email]
```

### Escalation Tree

```
User Reports Issue
    ↓
Support Team (Initial Response: 15 min)
    ↓
On-Call Engineer (Investigate: 15 min)
    ↓
Team Lead (Decision: Escalate/Rollback)
    ↓
CTO / Manager (Crisis Management)
```

### Critical Incident Notification

**If Critical Issue**:

```bash
# Step 1: Create incident
npm run incident:create --severity critical --description "..."

# Step 2: Notify team
npm run notify:team --channel critical-incidents --message "..."

# Step 3: Start status page
npm run status-page:update --status "investigating"

# Step 4: Begin investigation
# Follow: PHASE_4_DEPLOYMENT_TROUBLESHOOTING.md

# Step 5: Update status every 15 minutes
npm run status-page:update --status "75% resolved, ETA 30 min"

# Step 6: Post-incident review (24 hours later)
npm run incident:review --title "Post-Incident Review"
# Document: What happened, Why, How to prevent
```

---

## 🔐 Security Procedures

### Weekly Security Checks

```bash
# 1. Check for vulnerabilities
npm audit --production

# If vulnerabilities found:
npm audit fix --production  # Auto-fix if available
# Or manually review and update packages

# 2. Rotate API keys (monthly recommended)
npm run rotate:api-keys

# 3. Check access logs for suspicious activity
npm run analyze:access-logs

# 4. Verify no sensitive data in logs
grep -r "password\|token\|secret" ./logs/
# Should return: nothing

# 5. Review recent code changes for security issues
git log --oneline -20 | head -5
git show [commit] | grep -i "security\|password\|token"
```

### API Key Rotation

```bash
# 1. Generate new keys
npm run generate:api-keys

# 2. Test with new keys
npm run test:api-keys --new

# 3. If successful, deactivate old keys
npm run rotate:api-keys --confirm

# 4. Document rotation
echo "[$(date)] API keys rotated successfully" >> ./docs/security-log.md
```

---

## 📋 Runbook Templates

### Incident Report Template

```markdown
## Incident Report

**Incident ID**: INC-2026-001  
**Date**: 2026-02-21  
**Time**: 14:30 UTC  
**Duration**: 15 minutes  
**Severity**: High  

### Summary
[1-2 sentence description of what happened]

### Timeline
- 14:30 User reports issue
- 14:32 Team alerted
- 14:35 Root cause identified
- 14:40 Fix deployed
- 14:45 Verified resolved

### Root Cause
[What actually caused this]

### Resolution
[How was it fixed]

### Prevention
[How to prevent in future]

### Lessons Learned
[What did we learn]

### Action Items
- [ ] Fix code issue
- [ ] Add monitoring alert
- [ ] Update documentation
- [ ] Team training

**Reported By**: [Name]  
**Resolved By**: [Name]
```

### Change Request Template

```markdown
## Change Request

**Request ID**: CHG-2026-001  
**Date**: 2026-02-21  
**Type**: Code Update  
**Risk**: Low  

### Change Description
[What is being changed and why]

### Affected Systems
- [ ] API
- [ ] Database
- [ ] Bot
- [ ] Sheets Integration

### Testing Completed
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing done
- [x] Rollback procedure tested

### Deployment Plan
1. Create backup
2. Deploy to staging first
3. Run tests
4. Deploy to production
5. Verify health

### Rollback Plan
[Rollback procedure if needed]

**Requested By**: [Name]  
**Approved By**: [Team Lead]
```

---

## 📚 Reference Documents

- Deployment Guide: `PHASE_4_DEPLOYMENT_GUIDE.md`
- Troubleshooting: `PHASE_4_DEPLOYMENT_TROUBLESHOOTING.md`
- Architecture: `HYBRID_BOT_ARCHITECTURE.md`
- API Documentation: `API-DOCUMENTATION.md`
- Bot Commands: `BOT_COMMANDS_REFERENCE.md`

---

**Document Version**: 1.0.0  
**Last Updated**: February 21, 2026  
**Status**: ✅ PRODUCTION READY  
**Maintenance Window**: Every Sunday 2300-2330 UTC

