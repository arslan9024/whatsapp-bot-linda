# Linda AI Assistant - Complete Command Reference

**Last Updated:** February 11, 2026  
**Status:** Production Ready  
**Version:** 1.0.0

---

## 📋 Quick Start

All Linda commands start with `!` and follow this format:

```
!command [arguments]
```

**Example:**
```
!ping                          # Simple test
!find-contact Ahmed Al-Mansoori  # Search contact
!status                        # View bot status
```

Type `!help` in chat to see all available commands.

---

## 🎯 Command Categories

### 1. **WhatsApp Device Management** (6 commands)
Manage WhatsApp device linking and status

### 2. **Google Contacts** (6 commands)  
Search, add, update, delete contacts from Google Contacts

### 3. **Google Sheets** (8 commands)
Query, add data, generate reports from Google Sheets

### 4. **Admin & System** (6 commands)
System health, configuration, diagnostics, logs

### 5. **Learning & Feedback** (3 commands)
Teach Linda, provide feedback for ML training

### 6. **Special Commands** (2 commands)
Help, ping

**Total Commands:** 31  
**Implemented:** 15  
**Planned:** 16

---

## 🔧 Command Reference

### ═════════════════════════════════════════════════════════════════════════════
### 1️⃣ WhatsApp Device Management
### ═════════════════════════════════════════════════════════════════════════════

#### **`!list-devices`**

**Description:** List all WhatsApp devices linked to Linda  
**Usage:** `!list-devices`  
**Aliases:** `!devices`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!list-devices
```

**Response:**
```
📱 **LINKED DEVICES** (2)

1. Master Account
   Phone: 971501234567
   Status: online
   Last Active: 2 mins ago

2. Office iPhone
   Phone: 971509876543
   Status: online
   Last Active: 1 hour ago
```

---

#### **`!device-status`**

**Description:** Get detailed status of a specific device  
**Usage:** `!device-status <device-number>`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!device-status 971501234567
!device-status master
```

**Response:**
```
📱 **DEVICE STATUS**

Name: Master Account
Phone: 971501234567
Status: online
Linked: 2025-12-01 14:30:22
Last Active: 2 mins ago
Role: master
```

---

#### **`!link-device`** [Planned]

**Description:** Link a new WhatsApp device to Linda  
**Usage:** `!link-device <device-name>`  
**Requires Auth:** No  
**Status:** ⏳ Coming Soon

**Examples:**
```
!link-device my-phone
!link-device office-iphone
```

**What it does:**
- Starts new device linking flow
- Shows QR code for scanning
- Saves device after authentication
- Adds to active device list

---

#### **`!relink-device`** [Planned]

**Description:** Re-authenticate an existing device  
**Usage:** `!relink-device <device-number>`  
**Requires Auth:** No  
**Status:** ⏳ Coming Soon

**Examples:**
```
!relink-device 971501234567
!relink-device master
```

**When to use:**
- Session expired
- WhatsApp logged out
- Device requires re-authentication

---

#### **`!unlink-device`** [Planned]

**Description:** Remove a device from Linda  
**Usage:** `!unlink-device <device-number>`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!unlink-device 971501234567
!unlink-device office-iphone
```

---

#### **`!switch-device`** [Planned]

**Description:** Set active device for outbound messages  
**Usage:** `!switch-device <device-number>`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!switch-device 971501234567
!switch-device default
```

---

### ═════════════════════════════════════════════════════════════════════════════
### 2️⃣ Google Contacts Management
### ═════════════════════════════════════════════════════════════════════════════

#### **`!find-contact`**

**Description:** Search for a contact in Google Contacts  
**Usage:** `!find-contact <name-or-number>`  
**Aliases:** `!find`, `!search-contact`  
**Requires Auth:** No  
**Status:** ✅ Implemented (Basic)

**Examples:**
```
!find-contact Ahmed Al-Mansoori
!find-contact 971501234567
!find Ahmed
```

**Response:**
```
✅ **FOUND 2 CONTACTS**

1. Ahmed Al-Mansoori
   Phone: +971 50 123 4567
   Email: ahmed@realtygroup.ae
   Company: Realty Group
   WhatsApp: ✅ Available

2. Ahmed Ali Khan
   Phone: +971 55 987 6543
   Email: ahmedkhan@gmail.com
   WhatsApp: ❌ Not Available
```

---

#### **`!contact-stats`**

**Description:** Get statistics about your contacts  
**Usage:** `!contact-stats`  
**Aliases:** `!contacts-status`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!contact-stats
```

**Response:**
```
📊 **CONTACT STATISTICS**

Total Contacts: 247
WhatsApp Coverage: 89% (220 contacts)
Groups: 12
Last Sync: 2025-12-01 10:30:00
Most Recent: Ahmed Al-Mansoori (added today)
By Company:
  • Realty Group: 45
  • Dubai Properties: 32
  • Golden Homes: 28
  • Others: 142
```

---

#### **`!verify-contacts`**

**Description:** Check which contacts have WhatsApp  
**Usage:** `!verify-contacts [count]`  
**Aliases:** `!verify-goraha`, `!check-whatsapp`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!verify-contacts
!verify-contacts 100
!verify-goraha
```

**Response:**
```
✅ GORAHA VERIFICATION COMPLETE

📊 Summary:
• Contacts Checked: 247
• Valid Numbers: 220
• With WhatsApp: 196 (89%)
• WITHOUT WhatsApp: 24 (11%)

⚠️ 24 numbers need attention

Numbers without WhatsApp:
1. Old Client: 971501111111
2. Inactive Lead: 971502222222
... (showing first 10 of 24)
```

---

#### **`!add-contact`** [Planned]

**Description:** Add a new contact to Google Contacts  
**Usage:** `!add-contact <name> <phone> [email] [company]`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!add-contact Ahmed Al-Mansoori 971501234567 ahmed@realtygroup.ae Realty Group
!add-contact Fatima 971509876543
```

---

#### **`!update-contact`** [Planned]

**Description:** Update a contact's information  
**Usage:** `!update-contact <contact-id> <field> <value>`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!update-contact c123 phone 971501111111
!update-contact c456 email newemail@example.com
!update-contact c789 company Real Estate King
```

---

#### **`!delete-contact`** [Planned]

**Description:** Delete a contact from Google Contacts  
**Usage:** `!delete-contact <contact-id>`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!delete-contact c123
!delete-contact contact_abc123
```

---

#### **`!sync-contacts`** [Planned]

**Description:** Synchronize Google Contacts with WhatsApp  
**Usage:** `!sync-contacts [limit]`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!sync-contacts
!sync-contacts 50
!sync-contacts all
```

---

### ═════════════════════════════════════════════════════════════════════════════
### 3️⃣ Google Sheets Management
### ═════════════════════════════════════════════════════════════════════════════

#### **`!list-sheets`** [Planned]

**Description:** List all accessible Google Sheets  
**Usage:** `!list-sheets`  
**Aliases:** `!sheets`  
**Requires Auth:** No  
**Status:** ⏳ Coming Soon

**Examples:**
```
!list-sheets
!sheets
```

---

#### **`!sheet-info`** [Planned]

**Description:** Get information about a specific sheet  
**Usage:** `!sheet-info <sheet-id-or-name>`  
**Requires Auth:** No  
**Status:** ⏳ Coming Soon

**Examples:**
```
!sheet-info Leads Database
!sheet-info 1BxiMVs0XRA5nFMKUVfIstTZisDxQvDFrQH7YWrGYds
```

---

#### **`!query-sheet`** [Planned]

**Description:** Query data from a Google Sheet  
**Usage:** `!query-sheet <sheet-name> <query>`  
**Requires Auth:** No  
**Status:** ⏳ Coming Soon

**Examples:**
```
!query-sheet Leads "Dubai" "12-2025"
!query-sheet Sales status=active
```

---

#### **`!add-row`** [Planned]

**Description:** Add a new row to a Google Sheet  
**Usage:** `!add-row <sheet-name> <field1:value1> <field2:value2> ...`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!add-row Leads name:Ahmed phone:971501234567 location:Dubai
!add-row Sales product:Villa amount:2500000 date:2025-12-25
```

---

#### **`!update-row`** [Planned]

**Description:** Update a row in a Google Sheet  
**Usage:** `!update-row <sheet-name> <row-id> <field:value> ...`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!update-row Leads row123 status:qualified date:2025-12-26
!update-row Sales row456 amount:2700000
```

---

#### **`!delete-row`** [Planned]

**Description:** Delete a row from a Google Sheet  
**Usage:** `!delete-row <sheet-name> <row-id>`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!delete-row Leads row123
!delete-row Sales row456
```

---

#### **`!create-report`** [Planned]

**Description:** Generate a report from sheet data  
**Usage:** `!create-report <sheet-name> [filters]`  
**Requires Auth:** No  
**Status:** ⏳ Coming Soon

**Examples:**
```
!create-report Sales
!create-report Leads location=Dubai status=active
```

---

#### **`!export-sheet`** [Planned]

**Description:** Export sheet data to file  
**Usage:** `!export-sheet <sheet-name> [format]`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!export-sheet Leads csv
!export-sheet Sales json
!export-sheet Contacts xlsx
```

---

### ═════════════════════════════════════════════════════════════════════════════
### 4️⃣ Admin & System Commands
### ═════════════════════════════════════════════════════════════════════════════

#### **`!ping`**

**Description:** Check if Linda is responsive  
**Usage:** `!ping`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!ping
```

**Response:**
```
🏓 pong!
```

---

#### **`!status`**

**Description:** Get Linda's current status  
**Usage:** `!status`  
**Aliases:** `!health`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!status
```

**Response:**
```
📊 **LINDA STATUS**

✅ Status: Online
⏱️  Uptime: 2d 4h 30m
📈 Total Commands: 247
✅ Successful: 243
❌ Errors: 4
🔌 Connected Devices: 2
💾 Memory: 245MB
```

---

#### **`!health`**

**Description:** Get detailed system health report  
**Usage:** `!health [detail-level]`  
**Aliases:** `!diagnostics`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!health
!health full
!diagnostics
```

**Response:**
```
💚 **SYSTEM HEALTH**

Status: ✅ Healthy
Memory: 245MB / 512MB (48%)
Uptime: 2d 4h 30m
Commands Processed: 247
Error Rate: 1.6%

🔌 Connections:
  • WhatsApp: ✅ 2 devices
  • Google Contacts: ✅ Connected
  • Google Sheets: ✅ Connected
  • MongoDB: ✅ Connected

📊 Performance:
  • Avg Response: 245ms
  • Peak Memory: 340MB
  • Errors (24h): 4
```

---

#### **`!authenticate`**

**Description:** Sign in for admin commands  
**Usage:** `!authenticate <password>`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!authenticate mypassword
```

**Response:**
```
✅ Authenticated!

You now have access to admin commands.
Session valid for 1 hour.
```

---

#### **`!config`** [Planned]

**Description:** View or update Linda's configuration  
**Usage:** `!config [key] [value]`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!config
!config auto-reply on
!config response-timeout 30
```

---

#### **`!logs`** [Planned]

**Description:** Get recent system logs  
**Usage:** `!logs [count] [level]`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!logs
!logs 50
!logs 100 error
```

---

#### **`!restart`** [Planned]

**Description:** Restart Linda bot  
**Usage:** `!restart [delay]`  
**Requires Auth:** Yes (Admin)  
**Status:** ⏳ Coming Soon

**Examples:**
```
!restart
!restart 60
```

---

### ═════════════════════════════════════════════════════════════════════════════
### 5️⃣ Learning & Conversation Logging
### ═════════════════════════════════════════════════════════════════════════════

#### **`!learn`**

**Description:** Teach Linda about conversations for future auto-replies  
**Usage:** `!learn <question> => <answer>`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!learn What are your rates? => We offer competitive market rates for all properties.
!learn Can I schedule a tour? => Yes, tours available Monday-Friday 9am-6pm.
```

**Response:**
```
✅ Learned: "What are your rates?" → "We offer competitive market rates for all properties."
```

**How it works:**
- Stores Q&A pairs for ML training
- Linda will remember these for future similar questions
- Used to train auto-reply responses
- All learning is tracked for analytics

---

#### **`!feedback`**

**Description:** Rate Linda's response for improvement  
**Usage:** `!feedback <positive|negative> <message-id> "<comment>"`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!feedback positive msg123 "Perfect response!"
!feedback negative msg456 "Should have offered tour information"
```

**Response:**
```
✅ Feedback recorded: positive
```

**How it works:**
- Trains Linda on response quality
- Positive feedback improves similar future responses
- Negative feedback flags for human review
- Contributes to overall ML model improvement

---

#### **`!conversation-stats`**

**Description:** Get learning and conversation statistics  
**Usage:** `!conversation-stats`  
**Aliases:** `!learn-stats`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!conversation-stats
!learn-stats
```

**Response:**
```
📊 **CONVERSATION STATISTICS**

Total Messages: 1,247
Learned Patterns: 89
Feedback Entries: 156
Users: 23
Last Updated: 2025-12-01 14:30:22

Top Questions:
  1. What are your rates? (47 times)
  2. Can I visit? (38 times)
  3. Location details? (32 times)

Feedback Ratio: 92% Positive
```

---

### ═════════════════════════════════════════════════════════════════════════════
### 6️⃣ Special Commands
### ═════════════════════════════════════════════════════════════════════════════

#### **`!help`**

**Description:** Show command help  
**Usage:** `!help [command-name]`  
**Aliases:** `!?`  
**Requires Auth:** No  
**Status:** ✅ Implemented

**Examples:**
```
!help
!help find-contact
!?
```

**Response:**
```
📚 **LINDA COMMAND HELP**

Type `!help <command>` for details.

**WHATSAPP**
• `!list-devices` - List all linked WhatsApp devices
• `!device-status` - Get device status
• `!link-device` - Link new device
...
```

---

## 🔐 Authentication

Some commands require admin authentication:

1. **Get Password:** From system administrator
2. **Authenticate:** `!authenticate <password>`
3. **Duration:** Valid for 1 hour per session
4. **Commands Requiring Auth:** 
   - `!unlink-device`
   - `!switch-device`
   - `!add-contact` / `!update-contact` / `!delete-contact`
   - `!add-row` / `!update-row` / `!delete-row`
   - `!config`
   - `!logs`
   - `!restart`

---

## 📊 Command Statistics

**Status:** Real-time tracking enabled

Get statistics with:
```
!status          # Quick overview
!health          # Detailed health
!conversation-stats  # Learning stats
```

---

## 🚀 Next Planned Features

**Phase 2 (Coming Soon):**
- Full Google Sheets integration
- Advanced contact management
- Auto-reply system
- ML-based response generation
- Report generation and export

**Phase 3 (Future):**
- Conversation memory across sessions
- Intent recognition
- Multi-language support
- WhatsApp group management
- Advanced analytics dashboard

---

## ❓ FAQ

**Q: How do I know if authentication is required?**  
A: Check the command response. Admin commands need `!authenticate` first.

**Q: Can I create my own commands?**  
A: Custom command extensions are coming in a future update.

**Q: How long is my authentication valid?**  
A: 1 hour per session. Re-authenticate if needed.

**Q: Where is my conversation data stored?**  
A: Locally in `/logs` directory with JSON format.

**Q: How can I export my data?**  
A: Use conversation analytics endpoints (API docs TODO).

---

## 📞 Support

**Issue Found?**
- Type `!help` for command details
- Check error message carefully
- Authenticate if needed
- Contact system administrator

Last Updated: **February 11, 2026**  
Linda Version: **1.0.0 Production Ready**
