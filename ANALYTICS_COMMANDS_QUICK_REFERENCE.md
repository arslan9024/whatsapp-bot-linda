# Phase 29e Analytics Commands - Quick Reference Guide

## Terminal Dashboard Integration Complete ✅

Your WhatsApp bot now has four new analytics dashboard commands for real-time monitoring and reporting.

---

## Available Commands

### 1. **`analytics` or `metrics`**
Shows the real-time metrics dashboard with overall and per-account statistics.

**Output includes:**
- Total messages sent (all accounts)
- Total errors (all accounts)
- System uptime
- Number of active accounts
- Per-account breakdown:
  - Messages sent
  - Errors encountered
  - Success rate
  - Uptime duration

**Usage:**
```
▶ Linda Bot > analytics
▶ Linda Bot > metrics
```

Example output:
```
📊 REAL-TIME METRICS DASHBOARD - Phase 29e
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 OVERALL METRICS
  Total Messages Sent:     1,243
  Total Errors:            12
  System Uptime:           24h 15m 32s
  Active Accounts:         2

📱 PER-ACCOUNT METRICS
  +971505760056:
    Messages:             850
    Errors:               5
    Success Rate:         99.41%
    Uptime:               24h 15m

  +971553633595:
    Messages:             393
    Errors:               7
    Success Rate:         98.22%
    Uptime:               18h 42m
```

---

### 2. **`analytics report`**
Generates a comprehensive analytics report with performance metrics, SLA compliance, incident tracking, and health checks. Can be exported in JSON, CSV, or text format.

**Output includes:**
- Performance metrics across all accounts
- SLA compliance percentages
- Incident history and analysis
- Health check results
- Recommendations

**Usage:**
```
▶ Linda Bot > analytics report
```

Example output:
```
📊 FULL ANALYTICS REPORT - PHASE 29e
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PERFORMANCE METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Messages Processed: 1,243
Success Rate: 99.04%
Average Response Time: 524ms
Peak Load: 12:34 PM (234 msg/hour)

SLA COMPLIANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: 99.90%
Current: 98.96%
Status: ⚠️  at risk

INCIDENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Connection drop on 2026-02-19 14:22 (5 min)
2. Rate limit on 2026-02-19 15:45 (2 min)
```

---

### 3. **`analytics uptime`**
Shows detailed uptime metrics for all accounts with SLA compliance percentages for each.

**Output includes:**
- List of all accounts
- Uptime duration per account
- SLA compliance percentage per account
- Last health check timestamp
- Target SLA percentage (default 99.9%)

**Usage:**
```
▶ Linda Bot > analytics uptime
```

Example output:
```
⏱️  UPTIME METRICS - ALL ACCOUNTS (Phase 29e)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ACCOUNT UPTIME SUMMARY
  Total Accounts:          2

  🟢 +971505760056
     Uptime:               24h 15m 32s
     SLA Compliance:       99.94%
     Last Check:           3:45:22 PM

  🟢 +971553633595
     Uptime:               18h 42m 15s
     SLA Compliance:       97.86%
     Last Check:           3:45:18 PM

💡 SLA Target: 99.9% availability
```

---

### 4. **`analytics account <+phone-number>`**
Shows detailed metrics and health status for a specific WhatsApp account.

**Output includes:**
- Phone number and connection status
- Message activity (sent, errors, success rate)
- Uptime metrics (total uptime, SLA compliance, last heartbeat)
- Recent issues and errors
- Related helpful commands

**Usage:**
```
▶ Linda Bot > analytics account +971505760056
▶ Linda Bot > analytics account +971553633595
```

Example output:
```
📈 ACCOUNT ANALYTICS - +971505760056
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ACCOUNT PERFORMANCE
  Phone Number:            +971505760056
  Status:                  online
  Connection:              🟢 ONLINE

📈 ACTIVITY METRICS
  Messages Sent:           850
  Errors Encountered:      5
  Success Rate:            99.41%

⏱️  UPTIME METRICS
  Total Uptime:            24h 15m 32s
  SLA Compliance:          99.94%
  Last Heartbeat:          3:45:22 PM

💡 Commands:
  • 'analytics'            → Real-time metrics dashboard
  • 'analytics report'     → Full analytics report
  • 'health <phone>'       → Detailed health report
```

---

## Understanding the Metrics

### Message Metrics
- **Total Messages:** All messages sent across all accounts
- **Success Rate:** (Messages Sent - Errors) / Messages Sent × 100
- **Per-account Messages:** Individual message count for each account

### Error Metrics
- **Total Errors:** All errors across all accounts
- **Error Types:** Message processing errors, validation errors, etc.
- **Error Rate:** Errors / Messages × 100

### Uptime Metrics
- **System Uptime:** Time since bot startup
- **Account Uptime:** Time account has been online
- **SLA Compliance:** (Uptime / Total Time) × 100
- **Target SLA:** Default 99.9% (customizable)

### Status Indicators
- 🟢 **ONLINE** - Account is connected and active
- 🔴 **OFFLINE** - Account disconnected
- 🟡 **CONNECTING** - Account in process of linking
- ❌ **ERROR** - Account in error state

---

## Command Tips

### Quick Status Check
```
▶ Linda Bot > analytics
```
Get a quick overview of all accounts in one command.

### Account-Specific Investigation
```
▶ Linda Bot > analytics account +971505760056
```
Drill down into a specific account that might be having issues.

### SLA Monitoring
```
▶ Linda Bot > analytics uptime
```
Check compliance with service level agreements for all accounts.

### Detailed Report
```
▶ Linda Bot > analytics report
```
Generate a comprehensive report for documentation or analysis.

---

## Related Commands

You can also use these existing commands alongside analytics:

```
▶ Linda Bot > health              → Full health dashboard
▶ Linda Bot > health <+phone>     → Account health details
▶ Linda Bot > stats <+phone>      → Account metrics
▶ Linda Bot > accounts            → List all accounts
▶ Linda Bot > status              → Overall system status
```

---

## Troubleshooting

### Command Not Found
If you see "Unknown command" for analytics commands:
1. Ensure you're using the exact command format: `analytics`, not `analytic`
2. Commands are case-insensitive, but with space: `analytics account`
3. Phone number must have `+` prefix: `+971505760056`, not `971505760056`

### No Data Showing
If metrics show 0 or empty:
1. Give the bot a few minutes after startup to collect data
2. Send a few test messages to start generating metrics
3. Check that accounts are online: `status`
4. Metrics accumulate in real-time; historical data requires database persistence

### SLA Below Target
If SLA compliance is below 99.9%:
1. Check account health: `health <+phone>`
2. Review error patterns: `analytics account <+phone>`
3. Look for connection issues: `status`
4. Check logs for specific error types

---

## References

For more details, see:
- **PHASE_29e_INTEGRATION_COMPLETE.md** - Technical integration details
- **PHASE_29e_ANALYTICS_COMPLETE.md** - Analytics system documentation
- **SESSION_SUMMARY_PHASE_29e_INTEGRATION.md** - Implementation summary

---

## Status: Ready for Production ✅

All analytics commands are production-ready and tested. Start using them to monitor your bot's performance!
