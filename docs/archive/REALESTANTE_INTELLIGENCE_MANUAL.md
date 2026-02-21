# Real Estate Intelligence Engine - Complete Integration Manual

## Overview
This comprehensive manual provides step-by-step instructions for integrating Linda's multi-account WhatsApp bot with real estate intelligence capabilities, including deal tracking, agent commission management, and CLI dashboard.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    WhatsApp Multi-Account System                 │
│                   (SessionManager, WhatsApp Web.js)              │
└┬────────────────────────────────────────────────────────────────┘
 │
 ├─→ WhatsApp Account Registry (whatsapp-accounts.json)
 │   ├─ Master Account (has WhatsApp Premium)
 │   └─ Servant Accounts (linked to master)
 │
 ├─→ Session Management (SessionManager.js)
 │   ├─ Per-account session directories
 │   ├─ Session persistence (localStorage)
 │   └─ Automatic recovery on startup
 │
 └─→ Intelligence Layer
     ├─ PersonaDetectionEngine (Detect buyer/seller/tenant/landlord/agent)
     ├─ PropertyCatalogEngine (Manage property listings)
     ├─ ClientCatalogEngine (Manage client profiles)
     ├─ DealScoringEngine (Score client-property matches)
     ├─ DealMatchingEngine (Find optimal matches)
     ├─ DealLifecycleManager (Track deals through stages)
     └─ AgentDealManager (Track agent performance & commissions)
        │
        └─→ Google Integration
            ├─ GorahaBot Service Account (Contacts sync)
            ├─ PowerAgent Service Account (Sheets updates)
            └─ Context Injector (Enriches messages with deal context)
              │
              └─→ CLI Dashboard
                  ├─ AgentDashboard (Performance metrics)
                  └─ DashboardCLI (Interactive interface)
```

## Component Files Location Map

### Core Intelligence Engines
| Component | File Path | Purpose |
|-----------|-----------|---------|
| PersonaDetectionEngine | `code/Intelligence/PersonaDetectionEngine.js` | Detects user roles (buyer/seller/tenant/landlord/agent) |
| PropertyCatalogEngine | `code/Intelligence/PropertyCatalogEngine.js` | Manages property listings and inventory |
| ClientCatalogEngine | `code/Intelligence/ClientCatalogEngine.js` | Manages client profiles and requirements |
| DealScoringEngine | `code/Intelligence/DealScoringEngine.js` | Scores client-property matches (0-100) |
| DealMatchingEngine | `code/Intelligence/DealMatchingEngine.js` | Finds optimal property matches for clients |
| DealLifecycleManager | `code/Intelligence/DealLifecycleManager.js` | Tracks deals through all lifecycle stages |
| AgentDealManager | `code/Intelligence/AgentDealManager.js` | Agent performance & commission tracking |

### Configuration Files
| Config | File Path | Purpose |
|--------|-----------|---------|
| WhatsApp Accounts | `code/Data/whatsapp-accounts.json` | Multi-account registry with session metadata |
| Persona Roles | `code/Data/persona-roles.json` | Persona detection keywords and patterns |
| Intelligence Config | `code/Data/linda-intelligence-config.json` | Engine settings and feature flags |
| Deals Registry | `code/Data/deals-registry.json` | Deal lifecycle and status tracking |

### Integration & Services
| Service | File Path | Purpose |
|---------|-----------|---------|
| DealContextInjector | `code/WhatsAppBot/Handlers/DealContextInjector.js` | Enriches messages with deal context |
| RealEstateCommands | `code/Commands/RealEstateCommands.js` | Real estate-specific bot commands |
| DealNotificationService | `code/Services/DealNotificationService.js` | Sends notifications for deal events |

### CLI Dashboard
| Component | File Path | Purpose |
|-----------|-----------|---------|
| AgentDashboard | `code/CLI/AgentDashboard.js` | Performance metrics and visualizations |
| DashboardCLI | `code/CLI/DashboardCLI.js` | Interactive CLI interface for operators |
| CLI Index | `code/CLI/index.js` | Module exports and initialization |

## Detailed Component Integration

### 1. WhatsApp Accounts Registry

**Location**: `code/Data/whatsapp-accounts.json`

```json
{
  "accounts": [
    {
      "accountId": "acc_001",
      "phoneNumber": "+971501234567",
      "accountType": "master",
      "status": "active",
      "sessionDir": "./sessions/acc_001",
      "googleServiceAccounts": {
        "contacts": "gorahabot-service@linda-ai.iam.gserviceaccount.com",
        "sheets": "poweragent-service@linda-ai.iam.gserviceaccount.com"
      },
      "metadata": {
        "agency": "DAMAC Properties",
        "region": "Dubai",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    },
    {
      "accountId": "acc_002",
      "phoneNumber": "+971502234567",
      "accountType": "servant",
      "masterAccountId": "acc_001",
      "status": "active",
      "sessionDir": "./sessions/acc_002",
      "googleServiceAccounts": {
        "contacts": "gorahabot-service@linda-ai.iam.gserviceaccount.com",
        "sheets": "poweragent-service@linda-ai.iam.gserviceaccount.com"
      }
    }
  ]
}
```

### 2. Persona Roles Configuration

**Location**: `code/Data/persona-roles.json`

```json
{
  "personas": [
    {
      "roleId": "buyer",
      "displayName": "Property Buyer",
      "keywords": [
        "buying", "purchase", "interested in property",
        "looking for apartment", "want to buy", "budget"
      ],
      "properties": ["budget", "location", "bedrooms", "amenities"],
      "classification": "buyer",
      "dealStage": "inquiry"
    },
    {
      "roleId": "seller",
      "displayName": "Property Seller",
      "keywords": [
        "selling", "sell property", "want to sell",
        "price my property", "list my property"
      ],
      "properties": ["location", "property_type", "bedrooms", "asking_price"],
      "classification": "seller",
      "dealStage": "listing"
    },
    {
      "roleId": "tenant",
      "displayName": "Rental Tenant",
      "keywords": [
        "rent", "lease", "monthly rent",
        "looking for rent", "want to rent"
      ],
      "properties": ["budget", "location", "bedrooms", "amenities"],
      "classification": "tenant",
      "dealStage": "inquiry"
    },
    {
      "roleId": "landlord",
      "displayName": "Property Landlord",
      "keywords": [
        "renting out", "rent my property",
        "tenant", "rental income"
      ],
      "properties": ["location", "rent_price", "maintenance"],
      "classification": "landlord",
      "dealStage": "listing"
    },
    {
      "roleId": "agent",
      "displayName": "Real Estate Agent",
      "keywords": [
        "agent", "broker", "property manager",
        "client", "deal", "commission"
      ],
      "properties": ["agency", "commission_rate", "deal_status"],
      "classification": "agent",
      "dealStage": "negotiation"
    }
  ]
}
```

### 3. Intelligence Engine Configuration

**Location**: `code/Data/linda-intelligence-config.json`

```json
{
  "engines": {
    "personaDetection": {
      "enabled": true,
      "languages": ["en", "ar"],
      "fuzzyMatching": true,
      "confidenceThreshold": 0.7
    },
    "propertyMatching": {
      "enabled": true,
      "minimumScore": 0.6,
      "returnLimit": 5,
      "updateFrequency": "hourly"
    },
    "dealTracking": {
      "enabled": true,
      "autoTransition": false,
      "notificationEnabled": true
    }
  },
  "sessionManagement": {
    "sessionTimeout": 3600000,
    "recoveryAttempts": 5,
    "recoveryDelay": 5000,
    "persistenceEnabled": true
  },
  "googleIntegration": {
    "contactsSyncInterval": 1800000,
    "sheetsSyncInterval": 600000,
    "batchOperations": true
  }
}
```

### 4. Deals Registry Structure

**Location**: `code/Data/deals-registry.json`

```json
{
  "deals": [
    {
      "dealId": "deal_20250126_001",
      "clientId": "client_001",
      "propertyId": "prop_001",
      "agentId": "agent_001",
      "stage": "inquiry",
      "status": "active",
      "stageHistory": [
        {
          "stage": "inquiry",
          "timestamp": "2025-01-26T10:00:00Z",
          "actor": "system",
          "notes": "Initial inquiry from buyer"
        }
      ],
      "createdAt": "2025-01-26T10:00:00Z",
      "closedAt": null,
      "commission": {
        "percentage": 2.5,
        "amount": null,
        "status": "pending"
      }
    }
  ]
}
```

## Integration Workflow

### Step 1: Initialize Session Manager

```javascript
// app.js or bot.js
import SessionManager from './code/WhatsAppBot/SessionManager.js';
import accountsRegistry from './code/Data/whatsapp-accounts.json' assert { type: 'json' };

const sessionManager = new SessionManager({
  accountsRegistry: accountsRegistry.accounts,
  sessionDir: './sessions',
  recoveryStrategy: 'robust',
  maxRetries: 5,
  persistenceEnabled: true
});

// Load all accounts on startup
await sessionManager.loadAllAccounts();

// Listen to session events
sessionManager.on('session-created', (accountId) => {
  console.log(`✅ Session created for account: ${accountId}`);
  notificationService.sendAlert(`Account ${accountId} is now active`);
});

sessionManager.on('message-received', async (accountId, message) => {
  // Route to message processor
  await processIncomingMessage(accountId, message);
});
```

### Step 2: Initialize Intelligence Engines

```javascript
// intelligence-init.js
import PersonaDetectionEngine from './code/Intelligence/PersonaDetectionEngine.js';
import PropertyCatalogEngine from './code/Intelligence/PropertyCatalogEngine.js';
import ClientCatalogEngine from './code/Intelligence/ClientCatalogEngine.js';
import DealScoringEngine from './code/Intelligence/DealScoringEngine.js';
import DealMatchingEngine from './code/Intelligence/DealMatchingEngine.js';
import DealLifecycleManager from './code/Intelligence/DealLifecycleManager.js';
import AgentDealManager from './code/Intelligence/AgentDealManager.js';

// Initialize all engines
const personaEngine = new PersonaDetectionEngine({ config: personaConfig });
const propertyEngine = new PropertyCatalogEngine({ googleServiceAccount: powerAgent });
const clientEngine = new ClientCatalogEngine({ googleServiceAccount: gorahaBot });
const scoringEngine = new DealScoringEngine();
const matchingEngine = new DealMatchingEngine({ scoringEngine });
const dealManager = new DealLifecycleManager();
const agentManager = new AgentDealManager();

// Export as singleton
export {
  personaEngine,
  propertyEngine,
  clientEngine,
  scoringEngine,
  matchingEngine,
  dealManager,
  agentManager
};
```

### Step 3: Implement Message Processing Pipeline

```javascript
// message-processor.js
import { personaEngine, propertyEngine, clientEngine, matchingEngine, dealManager, agentManager } from './intelligence-init.js';

async function processIncomingMessage(accountId, message) {
  try {
    const { body, from } = message;

    // 1. Detect persona from message
    const persona = personaEngine.detectPersona(body);
    console.log(`Detected persona: ${persona.primaryPersona} (${persona.confidence}%)`);

    // 2. Create/update client profile based on persona
    const client = await clientEngine.addClient({
      clientId: from,
      name: message.notifyName || 'Unknown',
      clientType: persona.primaryPersona,
      contact: from,
      whatsappAccount: accountId,
      requirements: persona.properties,
      lastMessageAt: new Date(),
      messageContent: body
    });

    // 3. If buyer/tenant, find matching properties
    if (['buyer', 'tenant'].includes(persona.primaryPersona)) {
      const matches = matchingEngine.getMatchesForClient(client.clientId, {
        limit: 5,
        minScore: 0.6
      });

      if (matches.length > 0) {
        // 4. Create deals for each match
        for (const match of matches) {
          const deal = await dealManager.createDeal({
            dealId: `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            clientId: client.clientId,
            propertyId: match.propertyId,
            agentId: match.agentId,
            initialStage: 'inquiry',
            scoreSnapshot: match.score
          });

          // 5. Add deal to agent's tracking
          await agentManager.addDealToAgent(match.agentId, deal.dealId);

          console.log(`Created deal: ${deal.dealId} (Score: ${match.score})`);
        }

        // 6. Send response with property matches
        const responseMessage = await formatPropertyMatches(matches);
        await sessionManager.sendMessage(accountId, from, responseMessage);
      }
    }

    return { success: true, clientId: client.clientId };

  } catch (error) {
    logger.error(`Message processing failed: ${error.message}`, { accountId, from: message.from });
    return { success: false, error: error.message };
  }
}
```

### Step 4: Set Up Deal Lifecycle Tracking

```javascript
// deal-tracking.js
async function transitionDealStage(dealId, newStage) {
  try {
    const deal = dealManager.getDeal(dealId);
    
    // Validate transition
    const validTransitions = {
      'inquiry': ['viewing-requested', 'declined'],
      'viewing-requested': ['viewed', 'no-show'],
      'viewed': ['offer-made', 'not-interested'],
      'offer-made': ['negotiating', 'offer-rejected'],
      'negotiating': ['agreement', 'deal-closed'],
      'agreement': ['deal-closed'],
      'deal-closed': ['commission-paid']
    };

    if (!validTransitions[deal.stage]?.includes(newStage)) {
      throw new Error(`Invalid transition from ${deal.stage} to ${newStage}`);
    }

    // Update deal stage
    await dealManager.updateDealStage(dealId, newStage, {
      actor: 'agent',
      notes: `Automatically transitioned from ${deal.stage}`
    });

    // If deal closed, track commission
    if (newStage === 'deal-closed') {
      const finalPrice = deal.propertyDetails?.price || 0;
      await agentManager.trackCommission({
        dealId: dealId,
        finalPrice: finalPrice,
        commissionRate: deal.agentCommissionRate || 2.5
      });
    }

    logger.info(`Deal ${dealId} transitioned to ${newStage}`);
    return true;

  } catch (error) {
    logger.error(`Deal transition failed: ${error.message}`);
    return false;
  }
}
```

### Step 5: Implement Context Injector

```javascript
// deal-context-injector.js
import { dealManager, agentManager } from './intelligence-init.js';

class DealContextInjector {
  async enrichMessage(baseMessage, dealIds, clientId) {
    try {
      const deals = dealIds.map(id => dealManager.getDeal(id));
      
      let enrichedMessage = baseMessage + '\n\n';
      
      for (const deal of deals) {
        const agent = agentManager.getAgent(deal.agentId);
        
        enrichedMessage += `📍 ${deal.propertyDetails?.location}\n`;
        enrichedMessage += `💰 ${deal.propertyDetails?.price} AED\n`;
        enrichedMessage += `👤 Agent: ${agent?.agentName}\n`;
        enrichedMessage += `📞 ${agent?.contact}\n\n`;
      }

      enrichedMessage += 'Reply with SHOW to schedule viewing or MORE to see other properties';
      
      return enrichedMessage;

    } catch (error) {
      logger.error(`Context enrichment failed: ${error.message}`);
      return baseMessage;
    }
  }
}

export default DealContextInjector;
```

### Step 6: Initialize CLI Dashboard

```javascript
// dashboard-init.js
import { AgentDashboard, DashboardCLI } from './code/CLI/index.js';
import { agentManager, dealManager, propertyEngine, clientEngine } from './intelligence-init.js';

// Initialize dashboard components
const agentDashboard = new AgentDashboard({
  agentDealManager: agentManager,
  dealLifecycleManager: dealManager,
  propertyEngine: propertyEngine,
  clientEngine: clientEngine
});

const dashboardCLI = new DashboardCLI({
  agentDealManager: agentManager,
  dealLifecycleManager: dealManager,
  propertyEngine: propertyEngine,
  clientEngine: clientEngine,
  agentDashboard: agentDashboard
});

// Start dashboard in separate process
console.log('Starting Agent Dashboard CLI...');
dashboardCLI.start();
```

## CLI Dashboard Commands Reference

### Agent Commands
```bash
# Display full agent dashboard
$ agent dashboard agent_001

# Quick agent summary
$ agent summary agent_001

# Compare all agents performance
$ agent list

# View commission payment schedule
$ agent payments agent_001
```

### Deal Commands
```bash
# Show deal status and history
$ deal status deal_20250126_001

# List all deals for an agent
$ deal list agent_001
```

### Property Commands
```bash
# List all properties
$ property list

# List properties by type
$ property list apartment

# Search properties
$ property search dubai marina
```

### Client Commands
```bash
# List all clients
$ client list

# Search for client
$ client search ahmed
```

### System Commands
```bash
# Show system statistics
$ stats

# Clear screen
$ clear

# Show help
$ help

# Exit dashboard
$ exit
```

## Real-World Data Flow Example

### Scenario: Buyer Ahmed Messages with Property Interest

```
TIME: 10:00 AM
------------------------------------------

1. WhatsApp Message In
   From: +971501234567
   To: acc_001 (Master Account)
   Message: "Hi, I'm looking for a 2-bedroom apartment in Dubai Marina, budget around 1M AED"

2. SessionManager Routes Message
   Account: acc_001 (Master)
   Calls: processIncomingMessage(acc_001, message)

3. PersonaDetectionEngine Analyzes
   Input: "looking for a 2-bedroom apartment in Dubai Marina, budget around 1M AED"
   Output:
   {
     "primaryPersona": "buyer",
     "confidence": 0.98,
     "properties": {
       "location": "Dubai Marina",
       "bedrooms": 2,
       "budget": 1000000
     }
   }

4. ClientCatalogEngine Creates Client
   Input: +971501234567, buyer, Dubai Marina, 2 bed, 1M budget
   Syncs to: GorahaBot Contacts
   Output:
   {
     "clientId": "+971501234567",
     "clientType": "buyer",
     "requirements": { location: "Dubai Marina", bedrooms: 2, maxBudget: 1000000 }
   }

5. DealMatchingEngine Finds Properties
   Query: 2-bed apartments in Dubai Marina, price ≤ 1M
   Scoring matches based on:
     - Location similarity (0-100)
     - Price fit (0-100)
     - Amenities match (0-100)
     - Availability (0-100)
   
   Results: 3 properties with scores:
   - prop_marina_001: 0.95 (Perfect match)
   - prop_marina_002: 0.87 (Good match)
   - prop_marina_003: 0.78 (Acceptable match)

6. DealLifecycleManager Creates Deals
   For each property:
   - dealId: "deal_20250126_123456789"
   - clientId: "+971501234567"
   - propertyId: "prop_marina_001"
   - agentId: "agent_001" (property owner/lister)
   - stage: "inquiry"
   - Saves to: PowerAgent Sheets

7. AgentDealManager Tracks
   Agent: "Mohammed Al-Farsi"
   New active deal added
   Commission: Pending (0 at inquiry stage)

8. DealContextInjector Enriches Response
   Base: "Found 3 matching properties!"
   Enriched with:
   - Property details (location, price, amenities)
   - Agent contact info
   - Suggested next steps

9. Response Sent to WhatsApp
   Message to +971501234567:
   ---
   Found 3 matching properties in Dubai Marina!
   
   📍 Dubai Marina - 2 BR, 1M AED
   👤 Agent: Mohammed Al-Farsi
   📞 +971501234567
   
   📍 Dubai Marina - 2 BR, 950K AED
   👤 Agent: Fatima Al-Mansouri
   📞 +971502234567
   
   📍 Dubai Marina - 2 BR, 900K AED
   👤 Agent: Ahmed Al-Khoori
   📞 +971503234567
   
   Reply with SHOW to schedule viewing or MORE to see other properties
   ---

10. AgentDashboard Reflects Update
    Agent Mohammed: +1 active deal (now has 5 active deals)
    Commission tracking: Initiated for deal_20250126_123456789
    Status: Inquiry stage

11. Client Responds: "SHOW TIME TOMORROW 2PM"

12. Deal Transitions to "viewing-requested"
    AgentDealManager notifies agent via WhatsApp
    Calendar event created for viewing
    Commission still pending

13. Agent Reports Viewing Completed: "COOL PROPERTY"

14. Deal Transitions to "viewed"
    Agent waits for client decision

15. Client Sends: "OFFER 950K"

16. Deal Transitions to "offer-made"
    AgentDealManager calculates:
    - Commission: 950K × 2.5% = 23,750 AED
    - Status: Agreed (pending payment)

17. Deal Closed (After Agreement Signed)
    Stage: "deal-closed"
    AgentDealManager marks commission as "agreed"
    
    Mohammed Al-Farsi Dashboard Shows:
    - New closed deal
    - Commission pending payment: 23,750 AED
    - Performance updated

18. Commission Paid (After Paperwork)
    Status: "paid"
    Payment tracked in PaymentSchedule
    
    Mohammed Al-Farsi Commission Summary:
    - This Month Earned: 23,750 AED (from 1 deal)
    - Pending: 0 AED
    - Paid: 23,750 AED
```

## Deployment Checklist

- [ ] Create `/code/Data/` directory structure
- [ ] Set up all JSON configuration files with sample data
- [ ] Create `/code/Intelligence/` directory with all engines
- [ ] Implement SessionManager with multi-account support
- [ ] Set up Google Service Accounts (GorahaBot, PowerAgent)
- [ ] Create DealContextInjector and integration handlers
- [ ] Develop RealEstateCommands module
- [ ] Implement DealNotificationService
- [ ] Build CLI Dashboard components
- [ ] Integrate message processing pipeline
- [ ] Test session recovery workflow
- [ ] Test deal lifecycle transitions
- [ ] Verify commission calculations
- [ ] Deploy CLI dashboard
- [ ] Create operator training documentation
- [ ] Set up monitoring and alerts
- [ ] Go live with initial agent group

## Performance Optimization

### Session Recovery
- Cache session metadata in memory
- Implement exponential backoff for failed reconnections
- Limit recovery attempts to prevent resource exhaustion

### Property Matching
- Pre-compute match scores hourly
- Cache results in Redis (if available)
- Use background jobs for expensive calculations

### Google Sync
- Batch updates into 5-minute intervals
- Use sheet append operations for new deals
- Sync every 30 minutes for non-critical updates

### Memory Management
- Archive completed deals after 6 months
- Clean up old session files weekly
- Implement periodic database optimization

## Monitoring & Alerts

### Key Metrics
- Session uptime per account
- Message processing latency
- Deal creation rate
- Agent commission accuracy
- Deal completion rate

### Alert Conditions
- Session disconnection (automated recovery)
- Message processing error rate > 5%
- Deal transition failures
- Commission calculation errors
- Google sync failures

## Next Steps

1. **Week 1**: Deploy configuration files and intelligence engines
2. **Week 2**: Test message processing pipeline with sample data
3. **Week 3**: Deploy CLI dashboard and train support team
4. **Week 4**: Go live with initial agent group
5. **Ongoing**: Monitor metrics and optimize performance

---

**Status**: Complete - Ready for Deployment  
**Version**: 1.0.0  
**Last Updated**: January 26, 2025  
**Maintained By**: Linda AI Development Team
