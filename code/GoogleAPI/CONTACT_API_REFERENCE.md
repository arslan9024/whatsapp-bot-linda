# Contact Management API Reference

**Version:** 1.0  
**Date:** February 8, 2026  
**Stability:** Production Ready  

---

## Quick Navigation

- [ContactLookupHandler](#contactlookuphandler) - Main bot API
- [ContactsSyncService](#contactssyncservice) - MongoDB operations
- [GoogleContactsBridge](#googlecontactsbridge) - Google API interface
- [ContactSyncScheduler](#contactsyncscheduler) - Background sync
- [Common Patterns](#common-patterns) - Usage examples
- [Return Types](#return-types) - Response formats

---

## ContactLookupHandler

**File:** `code/WhatsAppBot/ContactLookupHandler.js`  
**Type:** Singleton  
**Purpose:** Main API for WhatsApp bot to interact with contacts

### Methods

#### `async initialize()`

Initialize the handler (called automatically on first use).

```javascript
await ContactLookupHandler.initialize();
```

**Returns:** `Promise<void>`  
**Throws:** Error if Google auth fails  
**Side effects:** Initializes GoogleContactsBridge

---

#### `async lookupContact(phoneNumber)`

Main lookup method - returns complete contact details.

```javascript
const result = await ContactLookupHandler.lookupContact('971501234567');

// Typical response when found:
{
  success: true,
  type: 'found',
  phone: '971501234567',
  googleContactId: 'c123456789',
  contact: {
    name: 'Ahmed Mohammed',
    phones: [
      { value: '+971501234567', type: 'mobile', formattedValue: '+971 50 123 4567' }
    ],
    emails: [
      { value: 'ahmed@example.com', type: 'personal' }
    ],
    photo: 'https://...'
  },
  isSynced: true
}

// Response when not found (new contact):
{
  success: true,
  type: 'not_found',
  phone: '971501234567',
  contact: {
    name: null,
    phones: [{ value: '971501234567', type: 'mobile' }],
    emails: []
  },
  isSynced: false,
  message: 'Contact not in Google - will be added during next sync'
}

// Response on error:
{
  success: false,
  error: 'Error message',
  phone: '971501234567'
}
```

**Parameters:**
- `phoneNumber` (string): Phone number (any format, validated internally)

**Returns:** `Promise<Object>` - Contact lookup result

**Time Complexity:** O(1) MongoDB lookup + O(n) Google API search where n << 10K  
**Cache:** Cached details in MongoDB for future lookups

---

#### `async phoneExists(phoneNumber)`

Quick existence check.

```javascript
const exists = await ContactLookupHandler.phoneExists('971501234567');
// Returns: true | false
```

**Parameters:**
- `phoneNumber` (string): Phone to check

**Returns:** `Promise<boolean>`  
**Performance:** O(1) - very fast

---

#### `async getContact(identifier)`

Get contact by any identifier (phone, email, or Google ID).

```javascript
// By phone
const contact = await ContactLookupHandler.getContact('971501234567');

// By email
const contact = await ContactLookupHandler.getContact('ahmed@example.com');

// By Google Contact ID
const contact = await ContactLookupHandler.getContact('c123456789');

// Returns: { success: true, contact: {...}, phone: '...' } or null
```

**Parameters:**
- `identifier` (string): Phone, email, or Google contact ID

**Returns:** `Promise<Object|null>`

---

#### `async saveContact(contactData)`

Create new contact in both Google and MongoDB.

```javascript
const result = await ContactLookupHandler.saveContact({
  name: 'Ahmed Mohammed',
  phone: '971501234567',
  email: 'ahmed@example.com',
  notes: 'Regular customer',
  source: 'whatsapp_save'
});

// Returns:
{
  success: true,
  contact: {
    googleContactId: 'c987654321',
    name: 'Ahmed Mohammed',
    // ... full contact details
  },
  message: 'Saved contact: Ahmed Mohammed'
}

// On error:
{
  success: false,
  error: 'Contact already exists'
}
```

**Parameters:**
- `contactData` (Object):
  - `name` (string, required): Contact name
  - `phone` (string, required): Phone number
  - `email` (string, optional): Email address
  - `notes` (string, optional): User notes
  - `source` (string, optional): Source identifier

**Returns:** `Promise<Object>` - Save result

---

#### `async updateContact(phoneNumber, updates)`

Update existing contact.

```javascript
const result = await ContactLookupHandler.updateContact('971501234567', {
  names: [{ displayName: 'Ahmed Mohammed', givenName: 'Ahmed' }]
});

// Returns:
{
  success: true,
  contact: { /* updated contact */ },
  message: 'Contact updated'
}
```

**Parameters:**
- `phoneNumber` (string): Contact phone
- `updates` (Object): Fields to update (Google Contact format)

**Returns:** `Promise<Object>` - Update result

---

#### `async deleteContact(phoneNumber)`

Delete contact from both Google and MongoDB.

```javascript
const result = await ContactLookupHandler.deleteContact('971501234567');

// Returns:
{
  success: true,
  message: 'Deleted contact: 971501234567'
}
```

**Parameters:**
- `phoneNumber` (string): Contact phone

**Returns:** `Promise<Object>` - Delete result

---

#### `formatContactForMessage(contact)`

Format contact for WhatsApp message.

```javascript
const message = ContactLookupHandler.formatContactForMessage(contact);
// Returns formatted text ready for WhatsApp

// Example output:
// *Ahmed Mohammed*
//
// 📱 Phones:
//   • +971 50 123 4567 (mobile)
//
// 📧 Emails:
//   • ahmed@example.com (personal)
```

**Parameters:**
- `contact` (Object): Contact object from lookup

**Returns:** `string` - WhatsApp-formatted text

---

#### `async getStatistics()`

Get system statistics.

```javascript
const stats = await ContactLookupHandler.getStatistics();

// Returns:
{
  totalContacts: 1234,
  syncedContacts: 1100,
  unsyncedContacts: 134,
  syncPercentage: 89
}
```

**Returns:** `Promise<Object>` - Contact statistics

---

## ContactsSyncService

**File:** `code/Services/ContactsSyncService.js`  
**Type:** Singleton (internal service)  
**Purpose:** Manage phone references in MongoDB

### Methods

#### `async checkIfPhoneExists(phoneNumber)`

Check if phone exists in MongoDB.

```javascript
const exists = await ContactsSyncService.checkIfPhoneExists('971501234567');
// Returns: true | false
```

**Returns:** `Promise<boolean>`  
**Performance:** O(1) - indexed lookup

---

#### `async getContactReference(phoneNumber)`

Get contact reference from MongoDB.

```javascript
const ref = await ContactsSyncService.getContactReference('971501234567');

// Returns:
{
  _id: ObjectId,
  phoneNumber: '971501234567',
  countryCode: '971',
  formattedPhone: '+971 50 123 4567',
  googleContactId: 'c123456789',
  syncedToGoogle: true,
  lastSyncedAt: ISODate(...),
  name: 'Ahmed Mohammed',
  email: 'ahmed@example.com',
  interactionCount: 5,
  lastInteractionAt: ISODate(...),
  // ... other fields
}

// Or null if not found
```

**Side effects:** Increments `interactionCount` and updates `lastInteractionAt`

**Returns:** `Promise<Object|null>`

---

#### `async createContactReference(phoneNumber, options)`

Create new contact reference.

```javascript
const ref = await ContactsSyncService.createContactReference('971501234567', {
  source: 'whatsapp_message',
  countryCode: '971',
  googleContactId: 'c123456789',
  importedFrom: 'Linda Bot'
});

// Returns: created reference object
```

**Parameters:**
- `phoneNumber` (string): Phone number
- `options` (Object, optional):
  - `source` (string): Import source
  - `countryCode` (string): Country code
  - `googleContactId` (string): Google ID if known
  - `importedFrom` (string): Where data came from
  - `notes` (string): User notes

**Returns:** `Promise<Object>` - Created or existing reference

---

#### `async updateSyncStatus(phoneNumber, googleContactId)`

Update after successful Google sync.

```javascript
await ContactsSyncService.updateSyncStatus('971501234567', 'c123456789');

// Updates MongoDB with:
// - googleContactId
// - syncedToGoogle: true
// - lastSyncedAt: now
```

**Parameters:**
- `phoneNumber` (string): Phone number
- `googleContactId` (string): Google contact ID

**Returns:** `Promise<Object>` - Updated contact

---

#### `async getAllUnsynced(options)`

Get all unsynced contacts (for background jobs).

```javascript
const unsynced = await ContactsSyncService.getAllUnsynced({
  limit: 50
});

// Returns array of unsynced contact references
```

**Parameters:**
- `options` (Object, optional):
  - `limit` (number): Max records to return (default: 100)

**Returns:** `Promise<Array>` - Unsynced contacts

---

#### `async getNeedsRefresh(hoursSinceSync)`

Get contacts that need refresh.

```javascript
const stale = await ContactsSyncService.getNeedsRefresh(24); // 24 hours old
```

**Parameters:**
- `hoursSinceSync` (number): Age threshold in hours (default: 24)

**Returns:** `Promise<Array>` - Stale contacts

---

#### `async updateCachedDetails(phoneNumber, details)`

Cache contact details from Google.

```javascript
await ContactsSyncService.updateCachedDetails('971501234567', {
  name: 'Ahmed Mohammed',
  email: 'ahmed@example.com'
});
```

**Parameters:**
- `phoneNumber` (string): Phone number
- `details` (Object): Cached details
  - `name` (string): Contact name
  - `email` (string): Email address

**Returns:** `Promise<Object>` - Updated contact

---

#### `async getRecentInteractions(days)`

Get recently accessed contacts.

```javascript
const recent = await ContactsSyncService.getRecentInteractions(7); // Last 7 days
```

**Parameters:**
- `days` (number): Days to look back (default: 7)

**Returns:** `Promise<Array>` - Recent contacts

---

#### `async deleteContact(phoneNumber)`

Delete contact reference from MongoDB.

```javascript
const deleted = await ContactsSyncService.deleteContact('971501234567');
```

**Returns:** `Promise<Object>` - Deleted document

---

#### `async getStatistics()`

Get sync statistics.

```javascript
const stats = await ContactsSyncService.getStatistics();

// Returns:
{
  totalContacts: 1234,
  syncedContacts: 1100,
  unsyncedContacts: 134,
  syncPercentage: 89
}
```

**Returns:** `Promise<Object>` - Statistics

---

#### `async cleanup()`

Remove duplicate entries.

```javascript
const result = await ContactsSyncService.cleanup();

// Returns:
{ duplicatesRemoved: 3 }
```

**Returns:** `Promise<Object>` - Cleanup results

---

## GoogleContactsBridge

**File:** `code/GoogleAPI/GoogleContactsBridge.js`  
**Type:** Class  
**Purpose:** Interface with Google Contacts API

### Methods

#### `async initialize()`

Initialize with GorahaBot account.

```javascript
const bridge = new GoogleContactsBridge();
await bridge.initialize();
```

---

#### `async fetchContactByPhone(phoneNumber)`

Search for contact by phone.

```javascript
const contact = await bridge.fetchContactByPhone('971501234567');

// Returns:
{
  googleContactId: 'c123456789',
  resourceName: 'people/c123456789',
  name: 'Ahmed Mohammed',
  phoneNumbers: [
    { value: '+971501234567', type: 'mobile', formattedValue: '+971 50 123 4567' }
  ],
  emails: [
    { value: 'ahmed@example.com', type: 'personal' }
  ],
  primaryPhone: '+971501234567',
  primaryEmail: 'ahmed@example.com',
  photo: 'https://...',
  notes: '...'
}

// Or null if not found
```

**Returns:** `Promise<Object|null>`

---

#### `async fetchContactById(googleContactId)`

Direct fetch by Google contact ID (faster).

```javascript
const contact = await bridge.fetchContactById('c123456789');
```

**Returns:** `Promise<Object|null>` - Contact details or null

---

#### `async listAllContacts(options)`

Get all contacts (paginated).

```javascript
const result = await bridge.listAllContacts({
  pageSize: 50,
  pageToken: null
});

// Returns:
{
  contacts: [ {...}, {...}, ... ],
  nextPageToken: 'token123',
  totalCount: 1234
}
```

**Parameters:**
- `options` (Object, optional):
  - `pageSize` (number): Items per page (default: 50)
  - `pageToken` (string): Pagination token

**Returns:** `Promise<Object>` - Paginated results

---

#### `async searchContacts(query)`

Full-text search.

```javascript
const results = await bridge.searchContacts('Ahmed');
// Returns: Array of matching contacts
```

**Parameters:**
- `query` (string): Search term

**Returns:** `Promise<Array>` - Matching contacts

---

#### `async createContact(contactData)`

Create new contact in Google.

```javascript
const contact = await bridge.createContact({
  name: 'Ahmed Mohammed',
  phoneNumbers: [
    { value: '971501234567', type: 'mobile' }
  ],
  emails: [
    { value: 'ahmed@example.com' }
  ],
  notes: 'Contact notes'
});
```

**Parameters:**
- `contactData` (Object): Contact information
  - `name` (string): Contact name
  - `phoneNumbers` (Array): Phone array
  - `emails` (Array, optional): Email array

**Returns:** `Promise<Object>` - Created contact

---

#### `async updateContact(googleContactId, updates)`

Update contact in Google.

```javascript
const updated = await bridge.updateContact('c123456789', {
  names: [{ displayName: 'New Name' }]
});
```

**Parameters:**
- `googleContactId` (string): Google contact ID
- `updates` (Object): Fields to update

**Returns:** `Promise<Object>` - Updated contact

---

#### `async deleteContact(googleContactId)`

Delete contact from Google.

```javascript
await bridge.deleteContact('c123456789');
```

**Returns:** `Promise<boolean>` - True if deleted

---

#### `async getAccountInfo()`

Get account details (for verification).

```javascript
const info = await bridge.getAccountInfo();

// Returns:
{
  name: 'Ahmed User',
  email: 'goraha.properties@gmail.com',
  resourceName: 'people/me'
}
```

**Returns:** `Promise<Object>` - Account info

---

## ContactSyncScheduler

**File:** `code/Services/ContactSyncScheduler.js`  
**Type:** Singleton  
**Purpose:** Background synchronization

### Methods

#### `async start(intervalMs)`

Start automatic sync scheduler.

```javascript
// Default: 1 hour
await ContactSyncScheduler.start(60 * 60 * 1000);

// Or custom interval
await ContactSyncScheduler.start(30 * 60 * 1000); // 30 minutes
```

**Parameters:**
- `intervalMs` (number): Interval in milliseconds (default: 3,600,000)

**Side effects:**
- Initializes GoogleContactsBridge
- Runs first sync immediately
- Schedules subsequent syncs

---

#### `stop()`

Stop the scheduler.

```javascript
ContactSyncScheduler.stop();
```

---

#### `async performSync()`

Run one sync cycle manually.

```javascript
const result = await ContactSyncScheduler.performSync();

// Returns:
{
  processed: 50,
  synced: 35,
  created: 15,
  updated: 0,
  failed: 0,
  duration: 12345,
  timestamp: ISODate(...)
}
```

**Returns:** `Promise<Object>` - Sync statistics

---

#### `async syncPhoneImmediate(phoneNumber)`

Force sync of specific phone.

```javascript
const result = await ContactSyncScheduler.syncPhoneImmediate('971501234567');

// Returns:
{
  success: true,
  type: 'linked' | 'created',
  contact: {...}
}
```

**Returns:** `Promise<Object>` - Sync result

---

#### `async syncFromGoogleToDB()`

Reverse sync (Google → MongoDB).

```javascript
const result = await ContactSyncScheduler.syncFromGoogleToDB();

// Returns:
{
  imported: 100,
  updated: 50,
  failed: 2,
  duration: 45000
}
```

**Returns:** `Promise<Object>` - Import statistics

---

#### `async getStatus()`

Get current scheduler status.

```javascript
const status = await ContactSyncScheduler.getStatus();

// Returns:
{
  isRunning: true,
  intervalMs: 3600000,
  batchSize: 50,
  totalContacts: 1234,
  syncedContacts: 1100,
  unsyncedContacts: 134,
  syncPercentage: 89
}
```

**Returns:** `Promise<Object>` - Status info

---

## Common Patterns

### Pattern 1: Handle Phone from Message

```javascript
import ContactLookupHandler from './code/WhatsAppBot/ContactLookupHandler.js';

async function handlePhoneInMessage(phoneNumber) {
  const result = await ContactLookupHandler.lookupContact(phoneNumber);
  
  if (!result.success) {
    return `Error: ${result.error}`;
  }
  
  if (result.isSynced) {
    // Contact has full details
    return ContactLookupHandler.formatContactForMessage(result.contact);
  } else {
    // Contact will be synced soon
    return `Added contact. Will sync to Google next cycle.`;
  }
}
```

### Pattern 2: Save New Contact

```javascript
async function saveContactFromUserInput(name, phone, email) {
  const result = await ContactLookupHandler.saveContact({
    name,
    phone,
    email,
    source: 'whatsapp_save'
  });
  
  if (result.success) {
    return `✅ Saved: ${result.contact.name}`;
  } else {
    return `❌ Error: ${result.error}`;
  }
}
```

### Pattern 3: Get Contact Statistics

```javascript
async function showStats() {
  const stats = await ContactLookupHandler.getStatistics();
  
  return `
📊 Contact Statistics:
  Total: ${stats.totalContacts}
  Synced: ${stats.syncedContacts}
  Pending: ${stats.unsyncedContacts}
  Sync %: ${stats.syncPercentage}%
  `;
}
```

---

## Return Types

### Contact Object

```typescript
{
  googleContactId: string,      // Google's ID
  resourceName: string,          // Full resource path
  name: string,                  // Display name
  givenName: string,             // First name
  familyName: string,            // Last name
  phoneNumbers: Array<{
    value: string,               // +971501234567
    type: string,                // 'mobile', 'work', etc
    formattedValue: string       // +971 50 123 4567
  }>,
  emails: Array<{
    value: string,               // email@example.com
    type: string                 // 'personal', 'work'
  }>,
  primaryPhone: string,          // First phone
  primaryEmail: string,          // First email
  photo: string,                 // Photo URL
  notes: string,                 // Notes/metadata
  metadata: Object               // Google metadata
}
```

### MongoDB ContactReference

```typescript
{
  _id: ObjectId,
  phoneNumber: string,           // Normalized
  countryCode: string,           // e.g., '971'
  formattedPhone: string,        // Display format
  googleContactId: string,       // Link to Google
  syncedToGoogle: boolean,       // Sync status
  lastSyncedAt: Date,           // Last sync time
  source: string,                // How it was added
  name: string,                  // Cached name
  email: string,                 // Cached email
  interactionCount: number,     // Lookup count
  lastInteractionAt: Date,      // Last access
  createdAt: Date,              // Creation time
  updatedAt: Date               // Modification time
}
```

---

**Last Updated:** February 8, 2026  
**Status:** Production Ready  
**Support:** See CONTACT_MANAGEMENT_WORKFLOW.md for detailed guide
