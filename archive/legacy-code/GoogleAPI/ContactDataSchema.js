/**
 * ContactDataSchema.js
 * 
 * Defines the data structure for contacts in the system
 * 
 * Two-System Storage Model:
 * 
 * MongoDB (ContactReference)
 * ─────────────────────────
 * Lightweight registry of phone numbers linked to Google contacts
 * File: code/Database/schemas.js
 * 
 * Google Contacts (via GorahaBot)
 * ──────────────────────────────
 * Complete contact details, source of truth
 * Account: gorahabot@white-caves-fb-486818.iam.gserviceaccount.com
 * Linked to: goraha.properties@gmail.com
 * 
 * ============================================================
 */

/**
 * MONGODB: ContactReference Schema
 * ───────────────────────────────
 * Collection: contact_references
 * Purpose: Lightweight phone registry with sync tracking
 * Storage: ~500 bytes per record
 */
export const mongoContactSchema = {
  _id: 'ObjectId',
  
  // Primary identifier and index
  phoneNumber: {
    type: 'String',
    required: true,
    unique: true,
    description: 'Normalized phone number (digits only). E.g., "971501234567"',
  },

  // Location and format info
  countryCode: {
    type: 'String',
    default: '971',
    description: 'Country code extracted from phone. Values: 971 (UAE), 92 (PK), etc.',
  },

  formattedPhone: {
    type: 'String',
    description: 'Display format. E.g., "+971 50 123 4567"',
  },

  // Link to Google Contacts
  googleContactId: {
    type: 'String',
    indexed: true,
    nullable: true,
    description: 'Google contact resource ID. E.g., "c123456789". Null until synced.',
  },

  // Sync tracking
  syncedToGoogle: {
    type: 'Boolean',
    default: false,
    indexed: true,
    description: 'true = googleContactId is valid and contact exists in Google',
  },

  lastSyncedAt: {
    type: 'Date',
    nullable: true,
    description: 'Timestamp of last successful sync with Google',
  },

  // Source tracking
  source: {
    type: 'String',
    enum: ['whatsapp_message', 'manual_import', 'sheet_import', 'whatsapp_lookup', 'whatsapp_save'],
    default: 'whatsapp_message',
    description: 'How this contact was added to the system',
  },

  // Cached details (from Google)
  name: {
    type: 'String',
    nullable: true,
    description: 'Cached contact name from Google (updated on sync)',
  },

  email: {
    type: 'String',
    nullable: true,
    description: 'Cached primary email from Google (updated on sync)',
  },

  // Usage tracking
  interactionCount: {
    type: 'Number',
    default: 0,
    description: 'Number of times this contact was referenced',
  },

  lastInteractionAt: {
    type: 'Date',
    nullable: true,
    description: 'Timestamp of last lookup or access',
  },

  // Metadata
  metadata: {
    type: 'Object',
    properties: {
      importedFrom: {
        type: 'String',
        description: 'Sheet name, bot name, etc. where initially found',
      },
      notes: {
        type: 'String',
        description: 'User notes about this contact',
      },
    },
  },

  // Timestamps
  createdAt: {
    type: 'Date',
    indexed: true,
    description: 'When this reference was first created in MongoDB',
  },

  updatedAt: {
    type: 'Date',
    description: 'Last modification time',
  },
};

/**
 * Example MongoDB Document:
 * {
 *   _id: ObjectId("65a1b2c3d4e5f6g7h8i9j0k1"),
 *   phoneNumber: "971501234567",
 *   countryCode: "971",
 *   formattedPhone: "+971 50 123 4567",
 *   googleContactId: "c123456789abc",
 *   syncedToGoogle: true,
 *   lastSyncedAt: ISODate("2026-02-08T10:30:00Z"),
 *   source: "whatsapp_message",
 *   name: "Ahmed Mohammed",
 *   email: "ahmed@example.com",
 *   interactionCount: 5,
 *   lastInteractionAt: ISODate("2026-02-08T14:45:00Z"),
 *   metadata: {
 *     importedFrom: "Linda Bot",
 *     notes: "Regular customer"
 *   },
 *   createdAt: ISODate("2026-02-08T09:00:00Z"),
 *   updatedAt: ISODate("2026-02-08T14:45:00Z")
 * }
 */

/**
 * GOOGLE CONTACTS: Contact Schema
 * ────────────────────────────────
 * Source: Google People API (people_v1)
 * Account: GorahaBot (service account)
 * Purpose: Complete contact details (source of truth)
 * Storage: Unlimited (Google's system)
 */
export const googleContactSchema = {
  // Google identifiers
  resourceName: {
    type: 'String',
    description: 'Google resource ID. E.g., "people/c123456789abc"',
  },

  etag: {
    type: 'String',
    description: 'Version tag for conflict resolution in updates',
  },

  // Primary contact info
  names: {
    type: 'Array<Object>',
    items: {
      givenName: 'String',      // First name
      familyName: 'String',      // Last name
      displayName: 'String',     // Full display name
      prefix: 'String',          // Mr., Dr., etc.
      suffix: 'String',          // Jr., Sr., III, etc.
    },
    description: 'Multiple name entries supported by Google',
  },

  phoneNumbers: {
    type: 'Array<Object>',
    items: {
      value: 'String',           // E.g., "+971501234567"
      type: 'String',            // E.g., "mobile", "home", "work"
      canonicalForm: 'String',   // Google-normalized format
      formattedValue: 'String',  // Human-readable format
    },
    description: 'Multiple phone numbers per contact',
  },

  emailAddresses: {
    type: 'Array<Object>',
    items: {
      value: 'String',           // E.g., "ahmed@example.com"
      type: 'String',            // E.g., "personal", "work"
      formattedValue: 'String',  // Display format
    },
    description: 'Multiple emails per contact',
  },

  addresses: {
    type: 'Array<Object>',
    items: {
      streetAddress: 'String',
      city: 'String',
      region: 'String',
      postalCode: 'String',
      countryCode: 'String',
      type: 'String',
    },
    description: 'Physical addresses (optional)',
  },

  // Additional info
  photos: {
    type: 'Array<Object>',
    items: {
      url: 'String',             // Photo URL
      default: 'Boolean',
    },
    description: 'Contact photo (if available)',
  },

  notes: {
    type: 'Array<Object>',
    items: {
      value: 'String (JSON)',    // Stores metadata as JSON string
    },
    description: 'Notes field contains sync metadata as JSON',
  },

  // Metadata
  metadata: {
    type: 'Object',
    properties: {
      sources: 'Array',          // Where data came from
      updateTime: 'DateTime',    // Last update on Google\'s side
    },
  },
};

/**
 * Example Google Contact (JSON from API):
 * {
 *   "resourceName": "people/c123456789abc",
 *   "etag": "%EAioAjoICAMYqL00B",
 *   "names": [
 *     {
 *       "displayName": "Ahmed Mohammed",
 *       "givenName": "Ahmed",
 *       "familyName": "Mohammed"
 *     }
 *   ],
 *   "phoneNumbers": [
 *     {
 *       "value": "+971501234567",
 *       "type": "mobile",
 *       "canonicalForm": "+971501234567",
 *       "formattedValue": "+971 50 123 4567"
 *     }
 *   ],
 *   "emailAddresses": [
 *     {
 *       "value": "ahmed@example.com",
 *       "type": "personal"
 *     }
 *   ],
 *   "notes": [
 *     {
 *       "value": "{\"source\":\"whatsapp_bot_linda\",\"importedDate\":\"2026-02-08T09:00:00Z\",\"firstSeen\":\"2026-02-08T09:00:00Z\"}"
 *     }
 *   ],
 *   "metadata": {
 *     "sources": [{
 *       "type": "CONTACT",
 *       "id": "..."
 *     }],
 *     "updateTime": "2026-02-08T10:30:00Z"
 *   }
 * }
 */

/**
 * DATA FLOW AND SYNCHRONIZATION
 * ════════════════════════════════════════════════════════════
 * 
 * 1. BOT RECEIVES PHONE NUMBER
 *    User WhatsApp message: "Contact: +971 50 123 4567"
 *         ↓
 * 
 * 2. VALIDATE AND NORMALIZE
 *    Validate format, normalize to: "971501234567"
 *         ↓
 * 
 * 3. CHECK MONGODB
 *    Query: ContactReference.findOne({ phoneNumber: "971501234567" })
 *    Result:
 *      - NOT FOUND → Create new reference (syncedToGoogle: false)
 *      - FOUND → Get reference and check googleContactId
 *         ↓
 * 
 * 4. FETCH FROM GOOGLE (if googleContactId exists)
 *    GoogleContactsBridge.fetchContactById(googleContactId)
 *    Returns: Full contact details
 *         ↓
 * 
 * 5. BACKGROUND SYNC (every 1 hour)
 *    ContactSyncScheduler.performSync()
 *    Find all unsynced contacts in MongoDB
 *    For each phone:
 *      - Search in Google Contacts
 *      - If found: Update googleContactId, mark synced
 *      - If not found: Create minimal contact in Google
 *         ↓
 * 
 * 6. RESPONSE TO BOT
 *    ContactLookupHandler returns formatted response:
 *    {
 *      success: true,
 *      type: "found",
 *      contact: {
 *        name: "Ahmed Mohammed",
 *        phones: [...],
 *        emails: [...]
 *      }
 *    }
 * 
 * ════════════════════════════════════════════════════════════
 */

/**
 * INDEXING STRATEGY
 * ════════════════════════════════════════════════════════════
 * 
 * Primary Indexes (in MongoDB):
 * 1. phoneNumber (UNIQUE) - Fast phone lookups [O(1)]
 * 2. googleContactId - Link verification
 * 3. syncedToGoogle - Find unsynced records
 * 4. createdAt - Sort recent additions
 * 
 * Query Patterns:
 * 
 * // Fast phone lookup
 * db.contact_references.findOne({ phoneNumber: "971501234567" })
 * Execution: O(1) - direct index lookup
 * 
 * // Find unsynced (for background job)
 * db.contact_references.find({ syncedToGoogle: false }).limit(50)
 * Execution: O(n) where n = number of unsynced (usually small)
 * 
 * // Find by Google ID (verification)
 * db.contact_references.findOne({ googleContactId: "c123456789" })
 * Execution: O(1) - index lookup
 * 
 * ════════════════════════════════════════════════════════════
 */

/**
 * MEMORY OPTIMIZATION
 * ════════════════════════════════════════════════════════════
 * 
 * MongoDB Storage Per Contact:
 * - phoneNumber: 15 bytes
 * - countryCode: 5 bytes
 * - formattedPhone: 20 bytes
 * - googleContactId: 20 bytes
 * - sync flags + dates: 50 bytes
 * - Other fields: 100 bytes
 * ────────────────────────
 * TOTAL: ~210 bytes per contact
 * 
 * Contrast with Full Contact Storage:
 * - Full contact object would be ~2-3 KB
 * ────────────────────────
 * SAVINGS: 90% less storage!
 * 
 * For 10,000 contacts:
 * - This approach: ~2 MB
 * - Full storage: ~20-30 MB
 * - SAVINGS: 15-20 MB
 * 
 * ════════════════════════════════════════════════════════════
 */

/**
 * API USAGE PATTERNS
 * ════════════════════════════════════════════════════════════
 * 
 * // Look up a contact (from WhatsApp message)
 * const result = await ContactLookupHandler.lookupContact("971501234567");
 * 
 * // Check if phone exists
 * const exists = await ContactLookupHandler.phoneExists("971501234567");
 * 
 * // Save new contact
 * const saved = await ContactLookupHandler.saveContact({
 *   name: "Ahmed Mohammed",
 *   phone: "971501234567",
 *   email: "ahmed@example.com"
 * });
 * 
 * // Update existing contact
 * const updated = await ContactLookupHandler.updateContact("971501234567", {
 *   givenName: "Ahmed",
 *   familyName: "Mohammed"
 * });
 * 
 * // Delete contact
 * const deleted = await ContactLookupHandler.deleteContact("971501234567");
 * 
 * // Get statistics
 * const stats = await ContactLookupHandler.getStatistics();
 * // Returns: { totalContacts, syncedContacts, unsyncedContacts, syncPercentage }
 * 
 * ════════════════════════════════════════════════════════════
 */

export default {
  mongoContactSchema,
  googleContactSchema,
};
