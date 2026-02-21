# Advanced Sheet Organization & AI Context Integration Guide

**Version:** 1.0  
**Last Updated:** February 8, 2026  
**Status:** ✅ Production Ready

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Services](#services)
4. [Quick Start](#quick-start)
5. [Implementation Steps](#implementation-steps)
6. [API Reference](#api-reference)
7. [Bot Integration Examples](#bot-integration-examples)

---

## Overview

This advanced system transforms raw Google Sheets into intelligent, deduplicated, code-referenced data sources that integrate directly with your WhatsApp bot for context-aware responses.

### Key Features

✅ **Multi-Stage Deduplication**: Remove exact duplicates and identify fuzzy matches  
✅ **Smart Code References**: Assign unique codes (P001, C001, F001) to all records  
✅ **Data Type Separation**: Automatically split into Contacts, Properties, Financials tabs  
✅ **In-Memory Context Access**: Load organized data for O(1) bot lookups  
✅ **AI-Aware Enrichment**: Extract context from messages for intelligent responses  
✅ **Comprehensive Analytics**: Quality metrics, deduplication stats, usage tracking  

## Architecture

```
Original Sheet
    ↓
EnhancedSheetOrganizer (Orchestrates all services)
    ├─ DeduplicationService (5-stage pipeline)
    ├─ CodeReferenceSystem (Unique codes: P001, C001, F001)
    └─ Creates 8-tab Google Sheet
    
New Sheet Created with Tabs:
    ├─ Master Data (All records with codes)
    ├─ Code Reference Map (For lookups)
    ├─ Data Viewer (Interactive interface)
    ├─ Contacts (C-codes only)
    ├─ Properties (P-codes only)
    ├─ Financials (F-codes only)
    ├─ Analytics (Quality metrics)
    └─ Metadata (Transformation info)

DataContextService (Loads into memory)
    ├─ Fast code lookup (O(1))
    ├─ Field-based search
    └─ Message context extraction

AIContextIntegration (Bridges to bot)
    ├─ Message enrichment
    ├─ Extract codes/contacts/properties
    └─ Context-aware response suggestions

Bot Message Handler
    └─ Uses context for intelligent replies
```

## Services Overview

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **DeduplicationService** | Remove exact/fuzzy duplicates | deduplicate(), analyzequality() |
| **CodeReferenceSystem** | Assign & lookup codes | assignCodes(), lookupByCode() |
| **EnhancedSheetOrganizer** | Main orchestrator | organizeSheet() |
| **DataContextService** | Load & access data | loadContext(), getByCode() |
| **AIContextIntegration** | Connect to bot | enrichMessage(), extractContext() |
| **AnalyticsService** | Analyze results | analyzeDeduplication(), generateReport() |

## Quick Start

### 1. Run Organization

```bash
node organizeAndAnalyzeSheet.js \
  --original-id "1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04" \
  --new-name "Akoya-Organized-V2"
```

### 2. Get New Sheet ID

The command outputs:
```
✅ New Sheet ID: 1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk
```

### 3. Verify Sheet Tabs

Visit: `https://docs.google.com/spreadsheets/d/[SHEET_ID]`

Check all 8 tabs created and populated.

### 4. Use in Your Bot

```javascript
import { DataContextService } from './code/Services/DataContextService.js';

const contextService = new DataContextService();

// At startup
await contextService.loadContext('[SHEET_ID]');

// In message handler
client.on('message', (message) => {
  const context = contextService.buildMessageContext(message.body);
  
  if (context.hasRecords) {
    const code = context.primaryRecord.code;
    message.reply(`Found record: ${code}`);
  }
});
```

## Implementation Steps  

### Phase 1: Organization (30 mins)
1. Get original sheet ID
2. Run orchestration script
3. Verify new sheet created
4. Register in MyProjects.js

### Phase 2: Bot Integration (2-4 hours)
1. Install DataContextService
2. Load at bot startup
3. Add message enrichment
4. Modify message handlers

### Phase 3: AI Enhancement (2-3 hours)
1. Integrate AIContextIntegration
2. Add context-aware logic
3. Test message extraction
4. Deploy to production

## API Quick Reference

### DataContextService

```javascript
// Initialize
const ctx = new DataContextService();
await ctx.loadContext(sheetId);

// Lookup
ctx.getByCode('P00001')              // Get by code
ctx.searchByField('Phone', '...')    // Search field
ctx.buildMessageContext(text)        // Extract context

// Advanced
ctx.fuzzySearch({phone, name})       // Fuzzy match
ctx.extractContext(messageText)      // Parse message
ctx.getStats()                       // Get metrics
```

### AIContextIntegration

```javascript
const ai = new AIContextIntegration(contextService);
await ai.initialize(sheetId);

// Enrich messages
const enriched = await ai.enrichMessage({body: text});

// Get bot decision input
const decision = ai.getDecisionInput(enriched);

// Extract codes
const codes = ai.extractCodesForAction(messageText);

// Get LLM context
const llmCtx = ai.getAIContext(enriched);
```

## Bot Integration Examples

### Example 1: Basic Code Lookup
```javascript
client.on('message', (msg) => {
  const ctx = contextService.buildMessageContext(msg.body);
  if (ctx.primaryRecord) {
    msg.reply(`Found: ${ctx.primaryRecord.code}`);
  }
});
```

### Example 2: Property Details
```javascript
client.on('message', (msg) => {
  const ctx = contextService.buildMessageContext(msg.body);
  if (ctx.extracted.properties.length > 0) {
    const prop = ctx.extracted.properties[0].record;
    msg.reply(`Project: ${prop.Project}, Unit: ${prop.Unit}`);
  }
});
```

### Example 3: Multiple Records
```javascript
client.on('message', (msg) => {
  const ctx = contextService.buildMessageContext(msg.body);
  let reply = `Found ${ctx.recordCount} records:\n`;
  ctx.allRecords.forEach((r, i) => {
    reply += `${i+1}. ${r.code} - ${r.record.Name}\n`;
  });
  msg.reply(reply);
});
```

---

**Status**: ✅ Ready to Deploy  
**Next**: Run orchestration script with your sheet ID
