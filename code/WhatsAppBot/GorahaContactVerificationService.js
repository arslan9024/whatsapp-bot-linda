/**
 * GorahaContactVerificationService.js
 * ======================================
 * Verifies all Goraha contacts saved in Google for Linda WhatsApp Bot
 * 
 * Features:
 * 1. Fetches all contacts from Google associated with Goraha
 * 2. Validates phone numbers (adds country code if missing)
 * 3. Checks WhatsApp presence for each number
 * 4. Generates comprehensive report
 * 5. Logs results and statistics
 * 
 * Integration:
 * - Uses ContactLookupHandler to access Google contacts
 * - Uses WhatsApp client to check presence via getChatById()
 * - Validates numbers using existing validation utilities
 */

import GoogleContactsBridge from '../GoogleAPI/GoogleContactsBridge.js';
import { validateContactNumber } from '../Contacts/validateContactNumber.js';
import ContactsSyncService from '../Services/ContactsSyncService.js';

class GorahaContactVerificationService {
  constructor(whatsAppClient = null) {
    this.whatsAppClient = whatsAppClient; // Can be set later
    this.googleBridge = null;
    this.initialized = false;
    
    // Statistics
    this.stats = {
      totalContacts: 0,
      validatedPhoneNumbers: 0,
      withWhatsApp: 0,
      withoutWhatsApp: 0,
      invalidNumbers: 0,
      verificationErrors: 0,
      numbersSansWhatsApp: [],
      detailedResults: [],
      timestamp: null
    };
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      this.googleBridge = new GoogleContactsBridge();
      await this.googleBridge.initialize();
      this.initialized = true;
      console.log('✅ GorahaContactVerificationService initialized');
      return true;
    } catch (error) {
      console.error('❌ Error initializing GorahaContactVerificationService:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Ensure service is initialized
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Set the WhatsApp client for presence checking
   */
  setWhatsAppClient(client) {
    this.whatsAppClient = client;
  }

  /**
   * Get all Goraha contacts from Google
   * @returns {Promise<Array>} - Array of contact objects
   */
  async fetchGorahaContacts() {
    try {
      await this._ensureInitialized();
      
      console.log('\n🔍 Fetching Goraha contacts from Google...');
      
      // Search for contacts with "Goraha" in the name
      const gorahaContacts = await this.googleBridge.fetchContactsByName('Goraha');
      
      console.log(`✅ Found ${gorahaContacts.length} Goraha-related contacts`);
      
      return gorahaContacts;
    } catch (error) {
      console.error('❌ Error fetching Goraha contacts:', error.message);
      return [];
    }
  }

  /**
   * Extract all phone numbers from a contact
   */
  _extractPhoneNumbers(contact) {
    const phones = [];
    
    if (contact.phoneNumbers && Array.isArray(contact.phoneNumbers)) {
      contact.phoneNumbers.forEach(phoneEntry => {
        if (phoneEntry.value) {
          phones.push({
            raw: phoneEntry.value,
            type: phoneEntry.type || 'Other',
            validated: null
          });
        }
      });
    }
    
    return phones;
  }

  /**
   * Validate a phone number using existing validation
   */
  _validatePhoneNumber(rawNumber) {
    try {
      // Extract only digits
      const cleaned = String(rawNumber)
        .replace(/[^\d+]/g, '')
        .replace(/^\+/, '');
      
      // Use the existing validation logic
      const validated = validateContactNumber(cleaned);
      
      return {
        original: rawNumber,
        cleaned: cleaned,
        formatted: validated,
        isValid: validated && validated.includes('@c.us')
      };
    } catch (error) {
      return {
        original: rawNumber,
        error: error.message,
        isValid: false
      };
    }
  }

  /**
   * Check if a WhatsApp number has an active WhatsApp account
   */
  async checkWhatsAppPresence(phoneNumber) {
    if (!this.whatsAppClient) {
      console.warn('⚠️  WhatsApp client not set - cannot check presence');
      return { hasWhatsApp: null, error: 'Client not initialized' };
    }

    try {
      // Extract the number part (without @c.us)
      const numberOnly = phoneNumber.replace('@c.us', '');
      
      // Try to get the chat
      const chat = await this.whatsAppClient.getChatById(numberOnly);
      
      if (chat) {
        return {
          hasWhatsApp: true,
          chatFound: true,
          lastSeen: chat.lastSeen || null,
          isGroup: chat.isGroup || false
        };
      } else {
        return {
          hasWhatsApp: false,
          chatFound: false
        };
      }
    } catch (error) {
      // No chat found = no WhatsApp account
      if (error.message && error.message.includes('not found')) {
        return {
          hasWhatsApp: false,
          chatFound: false,
          error: 'Chat not found'
        };
      }
      
      return {
        hasWhatsApp: false,
        error: error.message
      };
    }
  }

  /**
   * Verify all Goraha contacts
   * @param {Object} options - Verification options
   * @returns {Promise<Object>} - Verification report
   */
  async verifyAllContacts(options = {}) {
    const {
      autoFetch = true,
      checkWhatsApp = true,
      saveResults = true
    } = options;

    try {
      await this._ensureInitialized();
      
      // Reset statistics
      this.stats = {
        totalContacts: 0,
        validatedPhoneNumbers: 0,
        withWhatsApp: 0,
        withoutWhatsApp: 0,
        invalidNumbers: 0,
        verificationErrors: 0,
        numbersSansWhatsApp: [],
        detailedResults: [],
        timestamp: new Date().toISOString()
      };

      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║          GORAHA CONTACT VERIFICATION - Starting...            ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');

      // Step 1: Fetch contacts
      let contacts = [];
      if (autoFetch) {
        contacts = await this.fetchGorahaContacts();
      }

      this.stats.totalContacts = contacts.length;

      if (contacts.length === 0) {
        console.log('⚠️  No Goraha contacts found to verify');
        return this._generateReport();
      }

      // Step 2: Process each contact
      console.log(`\n📋 Processing ${contacts.length} contacts...\n`);

      for (let idx = 0; idx < contacts.length; idx++) {
        const contact = contacts[idx];
        const contactProgressMsg = `[${idx + 1}/${contacts.length}] ${contact.name || 'Unknown'}`;
        
        console.log(`\n───────────────────────────────────────────────────────`);
        console.log(`👤 ${contactProgressMsg}`);

        // Extract phone numbers
        const phones = this._extractPhoneNumbers(contact);
        
        if (phones.length === 0) {
          console.log('   ⚠️  No phone numbers found for this contact');
          continue;
        }

        console.log(`   📱 Found ${phones.length} phone number(s)`);

        // Process each phone number
        for (const phoneEntry of phones) {
          const validation = this._validatePhoneNumber(phoneEntry.raw);
          
          if (!validation.isValid) {
            console.log(`   ❌ Invalid: ${phoneEntry.raw} (${validation.error || 'Bad format'})`);
            this.stats.invalidNumbers++;
            
            this.stats.detailedResults.push({
              contactName: contact.name,
              originalNumber: phoneEntry.raw,
              type: phoneEntry.type,
              validated: null,
              hasWhatsApp: false,
              error: 'Invalid phone number'
            });
            continue;
          }

          this.stats.validatedPhoneNumbers++;
          console.log(`   ✅ Valid: ${validation.formatted}`);

          // Check WhatsApp presence if client is available
          let whatsAppStatus = { hasWhatsApp: null };
          if (checkWhatsApp && this.whatsAppClient) {
            whatsAppStatus = await this.checkWhatsAppPresence(validation.formatted);
            
            if (whatsAppStatus.hasWhatsApp) {
              console.log(`      ✓ WhatsApp account found`);
              this.stats.withWhatsApp++;
            } else {
              console.log(`      ✗ NO WhatsApp account`);
              this.stats.withoutWhatsApp++;
              this.stats.numbersSansWhatsApp.push({
                name: contact.name,
                number: validation.formatted,
                numberOnly: validation.cleaned,
                type: phoneEntry.type
              });
            }
          } else if (!this.whatsAppClient) {
            console.log(`      ⚠️  WhatsApp client not available (skipping check)`);
          }

          // Record detailed result
          this.stats.detailedResults.push({
            contactName: contact.name,
            originalNumber: phoneEntry.raw,
            validatedNumber: validation.formatted,
            type: phoneEntry.type,
            hasWhatsApp: whatsAppStatus.hasWhatsApp,
            whatsAppDetails: whatsAppStatus
          });
        }
      }

      // Generate and return report
      const report = this._generateReport();

      // Optionally save results
      if (saveResults) {
        await this._saveVerificationResults(report);
      }

      return report;

    } catch (error) {
      console.error('❌ Verification error:', error.message);
      this.stats.verificationErrors++;
      return this._generateReport();
    }
  }

  /**
   * Generate verification report
   */
  _generateReport() {
    const report = {
      summary: {
        timestamp: this.stats.timestamp,
        totalContacts: this.stats.totalContacts,
        totalPhoneNumbers: this.stats.validatedPhoneNumbers + this.stats.invalidNumbers,
        validPhoneNumbers: this.stats.validatedPhoneNumbers,
        invalidPhoneNumbers: this.stats.invalidNumbers,
        withWhatsApp: this.stats.withWhatsApp,
        withoutWhatsApp: this.stats.withoutWhatsApp,
        percentageWithWhatsApp: this.stats.validatedPhoneNumbers > 0 
          ? ((this.stats.withWhatsApp / this.stats.validatedPhoneNumbers) * 100).toFixed(2) + '%'
          : '0%'
      },
      numbersSansWhatsApp: this.stats.numbersSansWhatsApp,
      detailedResults: this.stats.detailedResults,
      status: 'completed'
    };

    return report;
  }

  /**
   * Print verification report
   */
  printReport(report) {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║               GORAHA VERIFICATION REPORT                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const { summary, numbersSansWhatsApp } = report;

    console.log('📊 SUMMARY:');
    console.log(`  Total Contacts:          ${summary.totalContacts}`);
    console.log(`  Total Phone Numbers:     ${summary.totalPhoneNumbers}`);
    console.log(`  Valid Numbers:           ${summary.validPhoneNumbers}`);
    console.log(`  Invalid Numbers:         ${summary.invalidPhoneNumbers}`);
    console.log(`  With WhatsApp:           ${summary.withWhatsApp}`);
    console.log(`  WITHOUT WhatsApp:        ${summary.withoutWhatsApp}`);
    console.log(`  Coverage:                ${summary.percentageWithWhatsApp}`);

    if (numbersSansWhatsApp.length > 0) {
      console.log('\n⚠️  NUMBERS WITHOUT WHATSAPP:');
      console.log(`\nTotal: ${numbersSansWhatsApp.length} number(s)\n`);
      
      numbersSansWhatsApp.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.name}`);
        console.log(`   📱 ${item.number} (${item.type})`);
        console.log(`   Number: ${item.numberOnly}`);
      });
    } else {
      console.log('\n✅ All contacts have WhatsApp accounts!');
    }

    console.log('\n' + '═'.repeat(65) + '\n');
  }

  /**
   * Save verification results
   */
  async _saveVerificationResults(report) {
    try {
      // Create a timestamp-based filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `GorahaVerification_${timestamp}.json`;
      
      // This would integrate with your file system
      console.log(`💾 Results can be saved to: ${filename}`);
      console.log(`📊 Statistics: ${report.summary.withoutWhatsApp} numbers need attention`);
      
      return true;
    } catch (error) {
      console.error('⚠️  Error saving results:', error.message);
      return false;
    }
  }

  /**
   * Get numbers without WhatsApp
   */
  getNumbersSansWhatsApp() {
    return this.stats.numbersSansWhatsApp;
  }

  /**
   * Get all detailed results
   */
  getDetailedResults() {
    return this.stats.detailedResults;
  }

  /**
   * Get current stats
   */
  getStats() {
    return { ...this.stats };
  }
}

// Export as default and named export
export default GorahaContactVerificationService;
export { GorahaContactVerificationService };
