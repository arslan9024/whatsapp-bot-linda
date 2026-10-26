/**
 * ContactSyncScheduler.js
 * Background service that syncs phone numbers from MongoDB to Google Contacts
 * 
 * Workflow:
 * 1. Find all unsynced phones in MongoDB (syncedToGoogle: false)
 * 2. Search Google Contacts for each phone
 * 3. If found: Link googleContactId and mark as synced
 * 4. If not found: Create minimal contact in Google
 * 5. Update MongoDB with sync status and timestamps
 */

import ContactsSyncService from './ContactsSyncService.js';
import GoogleContactsBridge from '../GoogleAPI/GoogleContactsBridge.js';

class ContactSyncScheduler {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.intervalMs = 60 * 60 * 1000; // 1 hour default
    this.batchSize = 50; // Process up to 50 at a time
    this.bridge = null;
  }

  /**
   * Start the sync scheduler
   * @param {number} intervalMs - Interval in milliseconds (default 1 hour)
   */
  async start(intervalMs = 60 * 60 * 1000) {
    try {
      if (this.isRunning) {
        console.warn('⚠️  ContactSyncScheduler is already running');
        return;
      }

      this.intervalMs = intervalMs;
      this.bridge = new GoogleContactsBridge();
      await this.bridge.initialize();

      console.log(`✅ ContactSyncScheduler started (interval: ${this.intervalMs / 1000}s)`);

      // Run immediately on start
      await this.performSync();

      // Schedule subsequent runs
      this.syncInterval = setInterval(async () => {
        try {
          await this.performSync();
        } catch (error) {
          console.error('Error in scheduled sync:', error);
        }
      }, this.intervalMs);

      this.isRunning = true;
    } catch (error) {
      console.error('Error starting ContactSyncScheduler:', error);
      throw error;
    }
  }

  /**
   * Stop the sync scheduler
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️  ContactSyncScheduler stopped');
  }

  /**
   * Perform one sync cycle
   * @returns {Promise<Object>} - Sync statistics
   */
  async performSync() {
    const startTime = Date.now();
    const stats = {
      processed: 0,
      synced: 0,
      created: 0,
      updated: 0,
      failed: 0,
      duration: 0,
      timestamp: new Date(),
    };

    try {
      console.log('\n📊 Starting contact sync cycle...');

      // Get unsynced phones
      const unsynced = await ContactsSyncService.getAllUnsynced({
        limit: this.batchSize,
      });

      if (unsynced.length === 0) {
        console.log('✅ No unsynced contacts found');
        return stats;
      }

      console.log(`🔍 Found ${unsynced.length} unsynced contacts to sync`);

      // Process each unsynced contact
      for (const contactRef of unsynced) {
        try {
          stats.processed++;

          // Search in Google Contacts
          const googleContact = await this.bridge.fetchContactByPhone(contactRef.phoneNumber);

          if (googleContact) {
            // Contact exists in Google - link it
            await ContactsSyncService.updateSyncStatus(
              contactRef.phoneNumber,
              googleContact.googleContactId
            );
            
            // Update cached details
            await ContactsSyncService.updateCachedDetails(
              contactRef.phoneNumber,
              {
                name: googleContact.name,
                email: googleContact.primaryEmail,
              }
            );

            stats.synced++;
            console.log(`✅ Linked existing: ${contactRef.phoneNumber} → ${googleContact.name}`);
          } else {
            // Contact doesn't exist - create it in Google
            const newGoogleContact = await this.bridge.createContact({
              name: contactRef.name || `Unknown (${contactRef.phoneNumber})`,
              phoneNumbers: [{
                value: contactRef.phoneNumber,
                type: 'mobile',
              }],
              source: contactRef.source || 'whatsapp_bot_linda',
              firstSeen: contactRef.createdAt,
              notes: `Synced automatically via Linda Bot\nSource: ${contactRef.source}`,
            });

            if (newGoogleContact) {
              // Link the newly created contact
              await ContactsSyncService.updateSyncStatus(
                contactRef.phoneNumber,
                newGoogleContact.googleContactId
              );

              stats.created++;
              console.log(`✨ Created new: ${contactRef.phoneNumber}`);
            }
          }
        } catch (error) {
          stats.failed++;
          console.error(`❌ Failed to sync ${contactRef.phoneNumber}:`, error.message);
        }
      }

      // Get updated statistics
      const dbStats = await ContactsSyncService.getStatistics();

      stats.duration = Date.now() - startTime;

      console.log(`\n✅ Sync cycle complete:`);
      console.log(`   Processed: ${stats.processed}`);
      console.log(`   Synced: ${stats.synced}`);
      console.log(`   Created: ${stats.created}`);
      console.log(`   Failed: ${stats.failed}`);
      console.log(`   Duration: ${stats.duration}ms`);
      console.log(`   Total in DB: ${dbStats.totalContacts} (${dbStats.syncPercentage}% synced)\n`);

      return stats;
    } catch (error) {
      console.error('Error during sync cycle:', error);
      stats.duration = Date.now() - startTime;
      return stats;
    }
  }

  /**
   * Force immediate sync of specific phone
   * @param {string} phoneNumber - Phone to sync
   * @returns {Promise<Object>} - Sync result
   */
  async syncPhoneImmediate(phoneNumber) {
    try {
      if (!this.bridge) {
        this.bridge = new GoogleContactsBridge();
        await this.bridge.initialize();
      }

      console.log(`🔄 Syncing immediately: ${phoneNumber}`);

      const googleContact = await this.bridge.fetchContactByPhone(phoneNumber);

      if (googleContact) {
        await ContactsSyncService.updateSyncStatus(
          phoneNumber,
          googleContact.googleContactId
        );
        console.log(`✅ Synced: ${phoneNumber}`);
        return { success: true, type: 'linked', contact: googleContact };
      } else {
        const newContact = await this.bridge.createContact({
          name: `Contact (${phoneNumber})`,
          phoneNumbers: [{
            value: phoneNumber,
            type: 'mobile',
          }],
        });

        if (newContact) {
          await ContactsSyncService.updateSyncStatus(phoneNumber, newContact.googleContactId);
          console.log(`✨ Created and synced: ${phoneNumber}`);
          return { success: true, type: 'created', contact: newContact };
        }
      }

      return { success: false, error: 'Could not sync' };
    } catch (error) {
      console.error('Error syncing phone immediately:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all contacts from Google back to MongoDB (reverse sync)
   * Useful for initial import or reconciliation
   * @returns {Promise<Object>} - Import statistics
   */
  async syncFromGoogleToDB() {
    const stats = {
      imported: 0,
      updated: 0,
      failed: 0,
      duration: 0,
    };

    const startTime = Date.now();

    try {
      console.log('\n📥 Starting reverse sync (Google → MongoDB)...');

      if (!this.bridge) {
        this.bridge = new GoogleContactsBridge();
        await this.bridge.initialize();
      }

      let pageToken = null;
      let hasMore = true;

      while (hasMore) {
        const result = await this.bridge.listAllContacts({ pageToken, pageSize: 50 });

        for (const contact of result.contacts) {
          try {
            // Extract primary phone
            const primaryPhone = contact.primaryPhone;
            if (!primaryPhone) continue;

            // Check if exists
            const exists = await ContactsSyncService.checkIfPhoneExists(primaryPhone);

            if (exists) {
              // Update existing
              await ContactsSyncService.updateSyncStatus(
                primaryPhone,
                contact.googleContactId
              );
              await ContactsSyncService.updateCachedDetails(
                primaryPhone,
                {
                  name: contact.name,
                  email: contact.primaryEmail,
                }
              );
              stats.updated++;
            } else {
              // Create new reference
              await ContactsSyncService.createContactReference(primaryPhone, {
                googleContactId: contact.googleContactId,
                countryCode: this._extractCountryCode(primaryPhone),
              });
              stats.imported++;
            }
          } catch (error) {
            stats.failed++;
            console.error(`Failed to sync ${contact.name}:`, error.message);
          }
        }

        pageToken = result.nextPageToken;
        hasMore = !!pageToken;
      }

      stats.duration = Date.now() - startTime;

      console.log(`\n✅ Reverse sync complete:`);
      console.log(`   Imported: ${stats.imported}`);
      console.log(`   Updated: ${stats.updated}`);
      console.log(`   Failed: ${stats.failed}`);
      console.log(`   Duration: ${stats.duration}ms\n`);

      return stats;
    } catch (error) {
      console.error('Error during reverse sync:', error);
      stats.duration = Date.now() - startTime;
      return stats;
    }
  }

  /**
   * Get sync status/statistics
   * @returns {Promise<Object>} - Detailed statistics
   */
  async getStatus() {
    try {
      const dbStats = await ContactsSyncService.getStatistics();
      
      return {
        isRunning: this.isRunning,
        intervalMs: this.intervalMs,
        batchSize: this.batchSize,
        ...dbStats,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Extract country code from phone
   */
  _extractCountryCode(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('971')) return '971'; // UAE
    if (cleaned.startsWith('92')) return '92';   // Pakistan
    if (cleaned.startsWith('91')) return '91';   // India
    if (cleaned.startsWith('966')) return '966'; // Saudi
    
    return '971'; // Default
  }
}

// Export singleton instance
export default new ContactSyncScheduler();
