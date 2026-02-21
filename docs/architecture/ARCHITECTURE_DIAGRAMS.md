# Security Guard & Contract Expiry Feature - Architecture & Data Flows

## Component Interaction Diagram

```mermaid
graph TB
    subgraph "Input Sources"
        A["📱 WhatsApp Messages"]
        B["📧 Google Contacts"]
        C["📄 PDF Contracts"]
    end

    subgraph "New Core Engines (Phase 1)"
        D["🔐 SecurityGuardContactMapper"]
        E["📑 PDFContractParser"]
        F["📋 TenancyContractManager"]
        G["⏰ ContractExpiryMonitor"]
        H["📢 BulkCampaignManager"]
    end

    subgraph "Enhanced Intelligence Engines"
        I["🎭 PersonaDetectionEngine"]
        J["📇 ClientCatalogEngine"]
        K["📊 DealLifecycleManager"]
    end

    subgraph "WhatsApp Output"
        L["💬 WhatsApp Messages"]
        M["📊 Campaign Reports"]
    end

    subgraph "Data Persistence"
        N["💾 persona-roles.json"]
        O["💾 client-database.json"]
        P["💾 deals-registry.json"]
        Q["💾 tenancy-contracts.json"]
        R["💾 bulk-campaigns.json"]
    end

    %% Input to Processors
    A --> I
    B --> D
    C --> E

    %% Processor to Engine Connections
    D --> I
    D --> J
    E --> F
    F --> G
    J --> K
    
    %% Engine to Engine
    I --> J
    G --> L

    %% Campaign Flow
    J --> H
    H --> L
    H --> M

    %% Persistence
    I --> N
    J --> O
    K --> P
    F --> Q
    H --> R

    style D fill:#e1f5ff
    style E fill:#e1f5ff
    style F fill:#e1f5ff
    style G fill:#e1f5ff
    style H fill:#e1f5ff
    style I fill:#fff3e0
    style J fill:#fff3e0
    style K fill:#fff3e0
```

---

## Security Guard Detection Flow

```mermaid
graph LR
    A["👥 Google Contacts"]
    B["🔐 SecurityGuardContactMapper"]
    C["Check Company = D2 Security"]
    D["Extract: location, phone, etc"]
    E["🎭 PersonaDetectionEngine"]
    F["Create/Update Persona"]
    G["📇 ClientCatalogEngine"]
    H["Add/Update Security Guard"]
    I["👨‍💼 Security Guard Profile"]

    A -->|Full Contact Data| B
    B --> C
    C -->|Match Found| D
    D -->|Mapped Data| E
    E -->|detectSecurityGuardFromGoogleContacts| F
    F -->|phone, location, company| G
    G -->|addSecurityGuard()| H
    H --> I

    style B fill:#c8e6c9
    style E fill:#c8e6c9
    style G fill:#c8e6c9
    style I fill:#a5d6a7
```

---

## Contract Expiry Monitoring Flow

```mermaid
graph LR
    A["📄 PDF Contract"]
    B["📑 PDFContractParser"]
    C["Extract Dates"]
    D["startDate, endDate"]
    E["📋 TenancyContractManager"]
    F["Store Contract"]
    G["🕐 ContractExpiryMonitor"]
    H{Days Until Expiry?}
    I["100 days - Renewal Eligible"]
    J["30 days - Final Renewal"]
    K["7 days - Urgent Reminder"]
    L["💬 WhatsApp Reminder"]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H -->|100 days| I
    H -->|30 days| J
    H -->|7 days| K
    I --> L
    J --> L
    K --> L

    style B fill:#ffccbc
    style E fill:#ffccbc
    style G fill:#ffccbc
    style L fill:#ff7043
```

---

## Bulk Campaign Flow

```mermaid
graph LR
    A["📇 ClientCatalogEngine"]
    B["getAllSecurityGuards()"]
    C["List of All Guards"]
    D["📢 BulkCampaignManager"]
    E["createCampaign()"]
    F["Filter Criteria"]
    G["Filters: location, company, shift, time"]
    H["Get Target Guards"]
    I["Execute Campaign"]
    J["scheduledMessage at preferred time"]
    K["💬 WhatsApp"]
    L["📊 Track Engagement"]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L

    style D fill:#b39ddb
    style E fill:#b39ddb
    style K fill:#ce93d8
    style L fill:#ba68c8
```

---

## Data Model: Security Guard Client

```mermaid
graph TB
    A["Security Guard Client"]
    B["Basic Info"]
    C["Google Contacts Data"]
    D["Profile Data"]
    E["Campaign Tracking"]

    A --> B
    A --> C
    A --> D
    A --> E

    B --> B1["id: string"]
    B --> B2["phone: string"]
    B --> B3["name: string"]
    B --> B4["type: 'security_guard'"]

    C --> C1["contactId: string"]
    C --> C2["email: string"]
    C --> C3["address: string"]

    D --> D1["location: string"]
    D --> D2["company: string"]
    D --> D3["companyId: string"]
    D --> D4["shift: day|night|weekend"]
    D --> D5["yearsOfExperience: number"]

    E --> E1["bulkCampaignsMembership: []"]
    E --> E2["preferredNotificationTimes: []"]
    E --> E3["communicationPreferences: []"]
    E --> E4["optedIn: boolean"]

    style A fill:#a5d6a7
    style B fill:#c8e6c9
    style C fill:#c8e6c9
    style D fill:#c8e6c9
    style E fill:#c8e6c9
```

---

## Data Model: Deal Contract Metadata

```mermaid
graph TB
    A["Deal Object"]
    B["Basic Info"]
    C["Contract Metadata"]

    A --> B
    A --> C

    B --> B1["dealId: string"]
    B --> B2["clientId: string"]
    B --> B3["stage: string"]

    C --> C1["contractId: string"]
    C --> C2["contractType: sales|lease"]
    C --> C3["contractSignedDate: ISO String"]
    C --> C4["contractExpiryDate: ISO String"]
    C --> C5["renewalEligibleDate: ISO String"]
    C --> C5a["(Auto-calc: 100 days before expiry)"]
    C --> C6["daysUntilExpiry: number"]
    C --> C7["renewalReminderSentDate: ISO String"]

    style A fill:#fff3e0
    style B fill:#ffe0b2
    style C fill:#ffe0b2
    style C5a fill:#ffcc80
```

---

## Method Interaction Matrix

```mermaid
graph TB
    subgraph "PersonaDetectionEngine"
        P1["detectPersona(msg, phone)"]
        P2["detectSecurityGuardFromGoogleContacts(phone, contacts)"]
        P3["setPersonaRole(phone, role, details)"]
    end

    subgraph "SecurityGuardContactMapper"
        S1["identifySecurityGuardByPhone(phone, contacts)"]
        S2["getAllSecurityGuards(contacts)"]
        S3["getSecurityGuardsByCompany(company, contacts)"]
        S4["getSecurityGuardsByLocation(location, contacts)"]
    end

    subgraph "ClientCatalogEngine"
        C1["addSecurityGuard(phone, details)"]
        C2["getAllSecurityGuards()"]
        C3["getClientByPhone(phone)"]
    end

    subgraph "TenancyContractManager"
        T1["importContract(contractData)"]
        T2["getContractById(id)"]
        T3["getContractsByTenant(phone)"]
        T4["getContractsExpiringIn(days)"]
    end

    subgraph "ContractExpiryMonitor"
        E1["initialize()"]
        E2["checkContractExpiry()"]
        E3["generateReminderMessage(contract, days)"]
        E4["getContractsNeedingReminder()"]
    end

    subgraph "BulkCampaignManager"
        B1["createCampaign(campaignData)"]
        B2["getTargetGuards(filters)"]
        B3["executeCampaign(campaignId)"]
        B4["trackEngagement(campaignId, phone, action)"]
    end

    subgraph "DealLifecycleManager"
        D1["createDeal(clientId, propertyId)"]
        D2["progressDealStage(dealId, stage)"]
        D3["updateContractExpiry(dealId, metadata)"]
    end

    P2 --> S1
    C1 --> P3
    T1 --> T2
    E2 --> T4
    B2 --> C2
    D3 --> T4

    style P1 fill:#fff3e0
    style P2 fill:#c8e6c9
    style C1 fill:#c8e6c9
    style T1 fill:#ffccbc
    style E2 fill:#ffccbc
    style B3 fill:#b39ddb
    style D3 fill:#fff3e0
```

---

## Integration Points - How Phase 2 Will Connect

```mermaid
graph TB
    A["Main WhatsApp Bot"]
    B["Message Received"]
    C["PersonaDetectionEngine"]
    D["Google Contacts Sync"]
    E["SecurityGuardContactMapper"]
    F["ClientCatalogEngine"]
    G["DealLifecycleManager"]
    H["ContractExpiryMonitor"]
    I["BulkCampaignManager"]

    A --> B
    B --> C
    C -->|Updated persona| F
    D --> E
    E -->|Security guard data| C
    F -->|Client updated| G
    G -->|Contract dates updated| H
    H -->|Time-based trigger| I
    I -->|Send WhatsApp| A

    A -->|Scheduled job: Every hour| H
    A -->|Admin command: /campaign| I

    style A fill:#e3f2fd
    style H fill:#ffccbc
    style I fill:#b39ddb
```

---

## Error Handling & Recovery

```mermaid
graph TB
    A["Operation Starts"]
    B["Input Validation"]
    C{Valid?}
    D["Process Data"]
    E{Error?}
    F["Log Error"]
    G["Return Null/Partial"]
    H["Success: Persist Data"]
    I["Return Result"]

    A --> B
    B --> C
    C -->|No| F
    F --> G
    G --> A
    C -->|Yes| D
    D --> E
    E -->|Yes| F
    E -->|No| H
    H --> I

    style H fill:#c8e6c9
    style G fill:#ffccbc
    style F fill:#ffccbc
```

---

## Data Persistence Strategy

```mermaid
graph LR
    A["In-Memory Maps"]
    B["Data Change"]
    C["Async Write to JSON"]
    D["File System"]

    A -->|detectPersona()| B
    A -->|setPersonaRole()| B
    A -->|addSecurityGuard()| B
    A -->|importContract()| B
    A -->|createCampaign()| B
    A -->|executeCampaign()| B

    B --> C
    C --> D

    D -->|On Startup| A

    style A fill:#b3e5fc
    style C fill:#ffe0b2
    style D fill:#c8e6c9
```

---

## File Organization & Data Flow

```
code/
├── Intelligence/
│   ├── PersonaDetectionEngine.js
│   │   ├── detectPersona(msg, phone)
│   │   └── detectSecurityGuardFromGoogleContacts(phone, contacts)  ← NEW
│   │
│   ├── ClientCatalogEngine.js
│   │   ├── addBuyer/addTenant/addSecurityGuard()  ← addSecurityGuard NEW
│   │   └── getAllSecurityGuards()  ← NEW
│   │
│   ├── DealLifecycleManager.js
│   │   ├── createDeal()
│   │   ├── progressDealStage()
│   │   └── updateContractExpiry()  ← NEW
│   │
│   ├── SecurityGuardContactMapper.js  ← NEW FILE
│   │   ├── identifySecurityGuardByPhone()
│   │   ├── getAllSecurityGuards()
│   │   ├── getSecurityGuardsByCompany()
│   │   └── getSecurityGuardsByLocation()
│   │
│   └── TenancyContractManager.js  ← NEW FILE
│       ├── importContract()
│       ├── getContractById()
│       ├── getContractsByTenant()
│       └── getContractsExpiringIn()
│
├── Services/
│   ├── PDFContractParser.js  ← NEW FILE
│   │   ├── parseContractPDF(pdfPath)
│   │   ├── extractCompanyData(company)
│   │   └── validateContractDates(contract)
│   │
│   ├── ContractExpiryMonitor.js  ← NEW FILE
│   │   ├── initialize()
│   │   ├── checkContractExpiry()
│   │   ├── generateReminderMessage()
│   │   └── getContractsNeedingReminder()
│   │
│   └── BulkCampaignManager.js  ← NEW FILE
│       ├── createCampaign()
│       ├── getTargetGuards()
│       ├── executeCampaign()
│       └── trackEngagement()
│
└── Data/
    ├── persona-roles.json
    ├── client-database.json
    ├── deals-registry.json
    ├── tenancy-contracts.json  ← NEW PERSISTENCE
    └── bulk-campaigns.json  ← NEW PERSISTENCE
```

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **PDF Parsing** | pdf-parse npm | Extract contract dates |
| **Google Contacts** | Google Contacts API | Identify security guards |
| **WhatsApp** | whatsapp-web.js | Send messages & campaigns |
| **Data Storage** | JSON files (./code/Data/) | Persistent data |
| **Logging** | logger utility | Operation tracking |
| **Date Handling** | Native JavaScript Date | Calculate expiry windows |

---

## Security & Privacy Considerations

```mermaid
graph TB
    A["User Data"]
    B["Google Contacts"]
    C["WhatsApp Numbers"]
    D["Contract Data"]

    B -->|One-way sync| E["Linda System"]
    C -->|Read-only| E
    D -->|Encrypted| E

    E --> F["JSON Files"]
    F -->|File system ACLs| G["Server"]

    A -.->|Anonymized| E
    D -.->|Sensitive: Dates Only| E

    style A fill:#ffebee
    style E fill:#f3e5f5
    style F fill:#e0f2f1
```

---

## Sequence Diagram: Security Guard Detection

```mermaid
sequenceDiagram
    participant User as User/Admin
    participant WhatsApp as WhatsApp Bot
    participant PersonaEngine as PersonaDetectionEngine
    participant Mapper as SecurityGuardContactMapper
    participant GoogleAPI as Google Contacts API
    participant ClientEngine as ClientCatalogEngine
    participant Storage as JSON Files

    User->>WhatsApp: New WhatsApp message
    WhatsApp->>PersonaEngine: detectPersona(msg, phone)
    alt Message contains security_guard keywords
        PersonaEngine->>PersonaEngine: Calculate score
        PersonaEngine->>Storage: Save persona
        PersonaEngine-->>WhatsApp: { role: security_guard, confidence: 0.7 }
    else Check Google Contacts
        WhatsApp->>GoogleAPI: Get contacts for company
        GoogleAPI-->>Mapper: Contact list with "D2 Security"
        Mapper->>Mapper: Match phone with contact
        Mapper-->>PersonaEngine: { name, location, company }
        PersonaEngine->>PersonaEngine: detectSecurityGuardFromGoogleContacts()
        PersonaEngine->>ClientEngine: addSecurityGuard()
        ClientEngine->>Storage: Save guard profile
        PersonaEngine-->>WhatsApp: { role: security_guard, confidence: 1.0 }
    end
    WhatsApp-->>User: Persona detected & stored
```

---

## Sequence Diagram: Contract Expiry Reminder

```mermaid
sequenceDiagram
    participant Bot as WhatsApp Bot
    participant Monitor as ContractExpiryMonitor
    participant Manager as TenancyContractManager
    participant WhatsApp as WhatsApp API
    participant User as Tenant/Landlord

    Bot->>Monitor: checkContractExpiry() [hourly]
    Monitor->>Manager: getContractsExpiringIn(100)
    Manager-->>Monitor: [contract1, contract2, ...]
    
    loop For each contract needing reminder
        Monitor->>Monitor: Calculate days until expiry
        alt Days = 100
            Monitor->>Monitor: generateReminderMessage(renewal_eligible)
        else Days = 30
            Monitor->>Monitor: generateReminderMessage(final_renewal)
        else Days = 7
            Monitor->>Monitor: generateReminderMessage(urgent)
        end
        
        Monitor->>WhatsApp: Send WhatsApp message
        WhatsApp->>User: 📌 Renewal reminder
        User-->>WhatsApp: Message delivered ✓
        Monitor->>Manager: markReminderSent(contract, reminderType)
    end
    
    Monitor-->>Bot: { remindersTriggered: N, nextCheck: ... }
```

---

**Document Purpose:** Visual reference for system architecture, data flows, and integration points
**Created:** Session 8
**Status:** Phase 1 Complete - Ready for Phase 2 Integration
