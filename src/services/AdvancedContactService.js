/**
 * ==========================================
 * ADVANCED CONTACT SERVICE (Phase 1)
 * ==========================================
 * 
 * Handles advanced contact operations:
 * - Block/unblock users
 * - Get contact status/bio
 * - Get profile picture
 * - Find common groups
 * - Verify on WhatsApp
 * - Get device count
 * - Check business/enterprise status
 * 
 * Author: WhatsApp Bot Linda
 * Date: February 11, 2026
 */

class AdvancedContactService {
  constructor(botManager = null, mongoDb = null) {
    this.botManager = botManager;
    this.db = mongoDb;
    this.logger = console;
    this.blockedCollection = 'blockedContacts';
  }

  /**
   * Block a contact
   * @param {Contact} contact - Contact object to block
   * @returns {Promise<boolean>} Success status
   */
  async blockContact(contact) {
    try {
      if (!contact || !contact.block) {
        throw new Error("Valid contact object required");
      }

      await contact.block();
      this.logger.log(`🚫 Contact blocked`);

      // Log to database
      if (this.db) {
        await this._logBlockedContact(contact, true);
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error blocking contact:`, error.message);
      throw error;
    }
  }

  /**
   * Unblock a contact
   * @param {Contact} contact - Contact object to unblock
   * @returns {Promise<boolean>} Success status
   */
  async unblockContact(contact) {
    try {
      if (!contact || !contact.unblock) {
        throw new Error("Valid contact object required");
      }

      await contact.unblock();
      this.logger.log(`🟢 Contact unblocked`);

      if (this.db) {
        await this._logBlockedContact(contact, false);
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error unblocking contact:`, error.message);
      throw error;
    }
  }

  /**
   * Check if contact is blocked
   * @param {Contact} contact - Contact object
   * @returns {boolean} Block status
   */
  isBlocked(contact) {
    try {
      if (!contact) {
        throw new Error("Contact object required");
      }

      const blocked = contact.isBlocked || false;
      this.logger.log(`🔍 Contact is ${blocked ? 'blocked' : 'not blocked'}`);
      return blocked;
    } catch (error) {
      this.logger.error(`❌ Error checking block status:`, error.message);
      return false;
    }
  }

  /**
   * Get contact's about/status text
   * @param {Contact} contact - Contact object
   * @returns {Promise<string>} Contact's about text
   */
  async getContactStatus(contact) {
    try {
      if (!contact || !contact.getAbout) {
        throw new Error("Valid contact object required");
      }

      const aboutText = await contact.getAbout();
      this.logger.log(`📝 Contact status: ${aboutText || 'N/A'}`);
      return aboutText || null;
    } catch (error) {
      this.logger.error(`❌ Error getting contact status:`, error.message);
      return null;
    }
  }

  /**
   * Get contact's profile picture URL
   * @param {Contact} contact - Contact object
   * @returns {Promise<string>} Profile picture URL
   */
  async getProfilePicture(contact) {
    try {
      if (!contact || !contact.getProfilePicUrl) {
        throw new Error("Valid contact object required");
      }

      const picUrl = await contact.getProfilePicUrl();
      this.logger.log(`🖼️  Profile picture URL retrieved`);
      return picUrl || null;
    } catch (error) {
      this.logger.error(`❌ Error getting profile picture:`, error.message);
      return null;
    }
  }

  /**
   * Get common groups with contact
   * @param {Contact} contact - Contact object
   * @returns {Promise<Array>} Array of common group chats
   */
  async getCommonGroups(contact) {
    try {
      if (!contact || !contact.getCommonGroups) {
        throw new Error("Valid contact object required");
      }

      const commonGroups = await contact.getCommonGroups();
      this.logger.log(`👥 Found ${commonGroups?.length || 0} common groups`);
      return commonGroups || [];
    } catch (error) {
      this.logger.error(`❌ Error getting common groups:`, error.message);
      return [];
    }
  }

  /**
   * Get chat with contact
   * @param {Contact} contact - Contact object
   * @returns {Promise<Chat>} One-on-one chat object
   */
  async getChat(contact) {
    try {
      if (!contact || !contact.getChat) {
        throw new Error("Valid contact object required");
      }

      const chat = await contact.getChat();
      this.logger.log(`💬 Chat with contact retrieved`);
      return chat || null;
    } catch (error) {
      this.logger.error(`❌ Error getting chat with contact:`, error.message);
      return null;
    }
  }

  /**
   * Check if contact is registered on WhatsApp
   * @param {string} phoneNumber - Phone number to check
   * @returns {Promise<boolean>} Registration status
   */
  async isRegisteredOnWhatsApp(phoneNumber) {
    try {
      if (!this.botManager || !this.botManager.client) {
        throw new Error("Bot manager with client required");
      }

      if (!phoneNumber || phoneNumber.trim().length === 0) {
        throw new Error("Phone number required");
      }

      const isRegistered = await this.botManager.client.isRegisteredUser(phoneNumber);
      this.logger.log(`📱 Phone ${phoneNumber} is ${isRegistered ? 'registered' : 'not registered'} on WhatsApp`);
      return isRegistered || false;
    } catch (error) {
      this.logger.error(`❌ Error checking WhatsApp registration:`, error.message);
      return false;
    }
  }

  /**
   * Get number of linked devices for contact
   * @param {Contact} contact - Contact object
   * @returns {Promise<number>} Device count
   */
  async getDeviceCount(contact) {
    try {
      if (!contact) {
        throw new Error("Contact object required");
      }

      // Try to get device count if supported
      let deviceCount = 0;

      if (contact.getContactDeviceCount) {
        deviceCount = await contact.getContactDeviceCount();
      } else if (contact.deviceCount) {
        deviceCount = contact.deviceCount;
      }

      this.logger.log(`📱 Contact has ${deviceCount} linked devices`);
      return deviceCount;
    } catch (error) {
      this.logger.error(`❌ Error getting device count:`, error.message);
      return 0;
    }
  }

  /**
   * Check if contact is a business account
   * @param {Contact} contact - Contact object
   * @returns {boolean} Business status
   */
  isBusinessAccount(contact) {
    try {
      if (!contact) {
        throw new Error("Contact object required");
      }

      const isBusiness = contact.isBusiness || false;
      this.logger.log(
        `${isBusiness ? '💼' : '👤'} Contact is ${isBusiness ? 'business' : 'personal'} account`
      );
      return isBusiness;
    } catch (error) {
      this.logger.error(`❌ Error checking business status:`, error.message);
      return false;
    }
  }

  /**
   * Check if contact is an enterprise account
   * @param {Contact} contact - Contact object
   * @returns {boolean} Enterprise status
   */
  isEnterpriseAccount(contact) {
    try {
      if (!contact) {
        throw new Error("Contact object required");
      }

      const isEnterprise = contact.isEnterprise || false;
      this.logger.log(
        `${isEnterprise ? '🏢' : '👤'} Contact is ${isEnterprise ? 'enterprise' : 'regular'} account`
      );
      return isEnterprise;
    } catch (error) {
      this.logger.error(`❌ Error checking enterprise status:`, error.message);
      return false;
    }
  }

  /**
   * Get all blocked contacts
   * @returns {Promise<Array>} Array of blocked contact IDs
   */
  async getBlockedContacts() {
    try {
      if (!this.botManager || !this.botManager.client) {
        throw new Error("Bot manager with client required");
      }

      const blockedContacts = await this.botManager.client.getBlockedContacts();
      this.logger.log(`🚫 Retrieved ${blockedContacts?.length || 0} blocked contacts`);
      return blockedContacts || [];
    } catch (error) {
      this.logger.error(`❌ Error getting blocked contacts:`, error.message);
      return [];
    }
  }

  /**
   * Get detailed contact information
   * @param {Contact} contact - Contact object
   * @returns {Promise<Object>} Complete contact info
   */
  async getContactInfo(contact) {
    try {
      if (!contact) {
        throw new Error("Contact object required");
      }

      const profilePic = await this.getProfilePicture(contact);
      const status = await this.getContactStatus(contact);
      const commonGroups = await this.getCommonGroups(contact);
      const deviceCount = await this.getDeviceCount(contact);

      return {
        id: contact.id,
        number: contact.number || contact.id,
        name: contact.name || contact.pushname || 'Unknown',
        isBusiness: this.isBusinessAccount(contact),
        isEnterprise: this.isEnterpriseAccount(contact),
        isBlocked: this.isBlocked(contact),
        profilePicture: profilePic,
        status: status,
        commonGroups: commonGroups?.length || 0,
        linkedDevices: deviceCount,
        isMe: contact.isMe || false,
      };
    } catch (error) {
      this.logger.error(`❌ Error getting contact info:`, error.message);
      return null;
    }
  }

  /**
   * Verify contact before sending message
   * @param {string} phoneNumber - Phone number to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyContactBeforeSending(phoneNumber) {
    try {
      if (!phoneNumber) {
        throw new Error("Phone number required");
      }

      const isRegistered = await this.isRegisteredOnWhatsApp(phoneNumber);

      if (!isRegistered) {
        this.logger.warn(`⚠️  Phone ${phoneNumber} is NOT on WhatsApp`);
      }

      return {
        phoneNumber,
        isRegistered,
        canSend: isRegistered,
        checkedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Error verifying contact:`, error.message);
      return {
        phoneNumber,
        isRegistered: false,
        canSend: false,
        error: error.message,
      };
    }
  }

  /**
   * Get blocked contacts list from database
   * @returns {Promise<Array>} Blocked contacts list
   */
  async getBlockedContactsList() {
    try {
      if (!this.db) {
        return [];
      }

      const collection = this.db.collection(this.blockedCollection);
      const blockedList = await collection.find({ isBlocked: true }).toArray();

      this.logger.log(`🚫 Retrieved ${blockedList.length} blocked contacts from database`);
      return blockedList;
    } catch (error) {
      this.logger.error(`❌ Error getting blocked contacts list:`, error.message);
      return [];
    }
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Log blocked/unblocked contact to database
   * @private
   */
  async _logBlockedContact(contact, isBlocked) {
    try {
      if (!this.db) return;

      const collection = this.db.collection(this.blockedCollection);
      const contactId = contact.id.toString();

      await collection.updateOne(
        { contactId },
        {
          $set: {
            contactId,
            phoneNumber: contact.number || contact.id,
            name: contact.name || contact.pushname,
            isBlocked,
            blockedAt: isBlocked ? new Date() : null,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (error) {
      this.logger.error(`Error logging blocked contact:`, error.message);
    }
  }
}

export function getAdvancedContactService(botManager = null, mongoDb = null) {
  return new AdvancedContactService(botManager, mongoDb);
}

export default AdvancedContactService;
