# Quick Reference Guide - Contact Management System

**For:** WhatsApp Bot Linda Team  
**Created:** February 8, 2026  
**Keep This Handy!**

---

## 🚀 30-Second Startup

```javascript
// Add to code/main.js in bot initialization:

import ContactLookupHandler from './code/WhatsAppBot/ContactLookupHandler.js';
import ContactSyncScheduler from './code/Services/ContactSyncScheduler.js';

// When bot is ready:
await ContactLookupHandler.initialize();
await ContactSyncScheduler.start(60 * 60 * 1000); // 1 hour
```

That's it! ✅ Contact system is running.

---

## 📱 Main API (What You'll Use)

### Lookup a Contact
```javascript
const result = await ContactLookupHandler.lookupContact(phoneNumber);
// Returns: { success, isSynced, contact, error }

if (result.success && result.contact) {
  console.log(result.contact.name, result.contact.phone);
}
```

### Save a Contact
```javascript
const result = await ContactLookupHandler.saveContact(phoneNumber, {
  name: 'John Doe',
  category: 'Client'
});
// Returns: { success, contactId, error }
```

### Get System Status
```javascript
const stats = await ContactsSyncService.getStatistics();
console.log(`Total: ${stats.total}, Synced: ${stats.synced} (${stats.percentage}%)`);
```

### Check Sync Status
```javascript
const status = await ContactSyncScheduler.getStatus();
console.log('Running:', status.isRunning);
console.log('Contacts:', status.totalContacts);
console.log('Synced %:', status.syncPercentage);
```

---

## 💾 File Locations

```
code/
├── Services/
│   ├── ContactsSyncService.js      ← Database layer
│   └── ContactSyncScheduler.js     ← Background sync
├── GoogleAPI/
│   ├── GoogleContactsBridge.js     ← Google API
│   └── ContactDataSchema.js        ← Documentation
├── WhatsAppBot/
│   └── ContactLookupHandler.js     ← Main API
└── Database/
    └── schemas.js                  ← MongoDB schema
```

---

## 📊 Data Structures

### MongoDB Contact Reference
```javascript
{
  _id: ObjectId,
  phoneNumber: "+971501234567",
  countryCode: "971",
  syncStatus: "synced|pending|error",
  googleContactId: "c123456789",
  metadata: {
    name: "John Doe",
    category: "Client"
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Contact Result Object
```javascript
{
  success: true,
  isNew: false,
  isSynced: true,
  phone: "+971501234567",
  contact: {
    id: "c123456789",
    name: "John Doe",
    phone: "+971501234567",
    email: "john@example.com",
    notes: "VIP Client"
  },
  error: null
}
```

---

## 🧪 Quick Tests

### Test Database
```bash
node -e "
import { ContactReference } from './code/Database/schemas.js';
const count = await ContactReference.countDocuments();
console.log('✅ DB Ready:', count, 'contacts');
"
```

### Test Services
```bash
npm test -- contact.test.js
```

### Check Sync Status
```bash
node -e "
import ContactSyncScheduler from './code/Services/ContactSyncScheduler.js';
const status = await ContactSyncScheduler.getStatus();
console.log(JSON.stringify(status, null, 2));
"
```

---

## 🔧 Common Tasks

### Add Contact from Message
```javascript
// Extract phone from message
const phone = userMessage.match(/[0-9]{7,9}/)[0];

// Save to system
const result = await ContactLookupHandler.saveContact(phone, {
  name: extractNameFromMessage(userMessage),
  source: 'whatsapp'
});

if (result.success) {
  await sendMessage(chatId, `✅ Contact saved: ${result.contactId}`);
}
```

### Get Contact Details
```javascript
const phone = "+971501234567";
const result = await ContactLookupHandler.lookupContact(phone);

if (result.success && result.contact) {
  const msg = `📱 ${result.contact.name}\n📞 ${result.contact.phone}`;
  await sendMessage(chatId, msg);
} else {
  await sendMessage(chatId, 'Contact not found');
}
```

### Manual Sync Trigger
```javascript
const result = await ContactSyncScheduler.performSync();
console.log(`Processed ${result.processed}, Synced ${result.synced}`);
```

### Format for WhatsApp
```javascript
const contact = {
  name: "John Doe",
  phone: "+971501234567",
  email: "john@example.com"
};

const formatted = ContactLookupHandler.formatContactForMessage(contact);
await client.sendMessage(chatId, formatted);
```

---

## ⚙️ Configuration

### Change Sync Interval
```javascript
// In main.js
// Every 15 minutes instead of 1 hour
await ContactSyncScheduler.start(15 * 60 * 1000);
```

### Change Batch Size
```javascript
// In ContactSyncScheduler.js, line ~120
this.batchSize = 100; // Process 100 per cycle instead of 50
```

### Add Phone Validation
```javascript
// In ContactsSyncService._normalizePhone()
// Add custom validation for your country codes
```

---

## 🚨 Troubleshooting

### Contacts not syncing to Google
```javascript
// 1. Check if scheduler is running
const status = await ContactSyncScheduler.getStatus();
console.log('Running:', status.isRunning); // Should be true

// 2. Manually trigger sync
const result = await ContactSyncScheduler.performSync();
console.log('Result:', result); // Check for errors

// 3. Check unsynced count
const stats = await ContactsSyncService.getStatistics();
console.log('Unsynced:', stats.unsynced);
```

### Google API connection failed
```javascript
// Verify GorahaBot authentication
const bridge = new GoogleContactsBridge();
await bridge.initialize();
const account = await bridge.getAccountInfo();
console.log('Connected as:', account.email); // Should be goraha.properties@gmail.com
```

### Database connection issues
```javascript
// Check MongoDB
const count = await ContactReference.countDocuments();
console.log('✅ Connected, documents:', count);
```

### Duplicate contacts
```javascript
// Clean up duplicates
const result = await ContactsSyncService.cleanup();
console.log('Removed:', result.removed);
```

---

## 📈 Monitoring Checklist

Copy this to your monitoring dashboard/alerts:

```
☐ Sync percentage > 90% (alert if < 70%)
☐ Lookup success rate > 99% (alert if < 95%)
☐ Sync cycle duration < 30 sec (alert if > 60 sec)
☐ Error rate < 1% (alert if > 5%)
☐ Database size < 20 MB for 100K contacts
☐ No unhandled rejections in logs
☐ Google API response time < 1 sec
```

---

## 🎯 Integration Points

### In MessageAnalyzer
```javascript
// Extract phones and check contacts
const phones = userMessage.match(/[0-9]{7,9}/g);
if (phones?.length > 0) {
  context.contacts = [];
  for (const phone of phones) {
    const result = await ContactLookupHandler.lookupContact(phone);
    context.contacts.push(result);
  }
}
```

### In Command Handlers
```javascript
// /add-contact [phone] [name]
if (cmd === '/add-contact') {
  const [phone, ...nameParts] = args;
  const result = await ContactLookupHandler.saveContact(phone, {
    name: nameParts.join(' ')
  });
  return result.success ? '✅ Contact saved' : '❌ Error: ' + result.error;
}

// /get-contact [phone]
if (cmd === '/get-contact') {
  const result = await ContactLookupHandler.lookupContact(args[0]);
  return result.success ? formatContact(result.contact) : '❌ Not found';
}

// /contacts-status
if (cmd === '/contacts-status') {
  const stats = await ContactsSyncService.getStatistics();
  return `📊 Total: ${stats.total}, Synced: ${stats.percentage}%`;
}
```

---

## 🎓 Key Concepts

**Phone Number**: Always stored in international format (+971xxxxxxxxx)

**Sync Status**: 
- `pending` = In MongoDB, waiting for Google sync
- `synced` = Successfully in Google Contacts
- `error` = Failed to sync, will retry

**Background Sync**: Automatic process that:
1. Finds all "pending" contacts in MongoDB
2. Creates them in Google Contacts
3. Updates MongoDB to "synced"
4. Runs every 1 hour (configurable)

**Lookup**: Fast operation that:
1. Checks MongoDB first
2. If found, returns it
3. If not found, checks Google Contacts
4. Returns result from either source

---

## 💡 Pro Tips

1. **Phone extraction**: Use `ContactLookupHandler._normalizePhone()` to clean user input
2. **Batch operations**: Use sync scheduler instead of manual saves when possible
3. **Error handling**: Always check `result.success` before using data
4. **Performance**: Lookups are cached in MongoDB, very fast after first usage
5. **Scaling**: System handles 100K+ contacts easily with current config

---

## 📞 Need Help?

### Check These Files First:
1. **For API questions**: CONTACT_API_REFERENCE.md
2. **For setup issues**: CONTACT_MANAGEMENT_WORKFLOW.md
3. **For deployment**: PHASE_C_INTEGRATION_CHECKLIST.md
4. **For status**: PHASE_B_IMPLEMENTATION_STATUS.md
5. **For overview**: DELIVERY_PACKAGE_SUMMARY.md

### Quick Support Links:
- Method not found? → CONTACT_API_REFERENCE.md
- How to integrate? → PHASE_C_INTEGRATION_CHECKLIST.md
- Something broken? → Troubleshooting section above
- Want stats? → Check getStatistics() method

---

## ✅ Standard Integration Template

Copy this into your message handler:

```javascript
import ContactLookupHandler from '../WhatsAppBot/ContactLookupHandler.js';

async function handleMessage(userMessage, chatId) {
  // 1. Extract phone
  const phoneMatch = userMessage.match(/(?:\+?971|0)?[1-9]\d{7,8}/);
  
  if (phoneMatch) {
    const phone = phoneMatch[0];
    
    // 2. Lookup contact
    try {
      const result = await ContactLookupHandler.lookupContact(phone);
      
      if (result.success && result.contact) {
        // 3. Send contact details
        const msg = ContactLookupHandler.formatContactForMessage(result.contact);
        await client.sendMessage(chatId, msg);
      } else if (!result.isSynced) {
        // 4. Contact pending sync
        await client.sendMessage(chatId, 
          `📱 Contact _${phone}_ added to system. Syncing...`
        );
      } else {
        // 5. Not found
        await client.sendMessage(chatId, `No contact found for _${phone}_`);
      }
    } catch (error) {
      console.error('Contact lookup error:', error);
      await client.sendMessage(chatId, '⚠️ Could not process contact');
    }
  }
  
  // Continue with regular message handling...
}
```

Save time by using this template!

---

## 🎯 Quick Decision Tree

```
Do you want to...

├─ Look up a contact?
│  └─ await ContactLookupHandler.lookupContact(phone)
│
├─ Save a contact?
│  └─ await ContactLookupHandler.saveContact(phone, metadata)
│
├─ Get system stats?
│  └─ await ContactsSyncService.getStatistics()
│
├─ Check sync status?
│  └─ await ContactSyncScheduler.getStatus()
│
├─ Trigger sync manually?
│  └─ await ContactSyncScheduler.performSync()
│
├─ Remove duplicates?
│  └─ await ContactsSyncService.cleanup()
│
└─ Something else?
   └─ Check CONTACT_API_REFERENCE.md
```

---

## 🚀 You're Ready!

1. ✅ Files created and tested
2. ✅ Documentation complete
3. ✅ API ready to use
4. ✅ Examples provided
5. ✅ Troubleshooting guide ready

**Start with:** PHASE_C_INTEGRATION_CHECKLIST.md

---

**Bookmark This Page!** 📌

*Keep this quick reference handy while integrating the contact management system.*

*Last updated: February 8, 2026*
