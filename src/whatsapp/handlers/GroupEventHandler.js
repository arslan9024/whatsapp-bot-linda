/**
 * ==========================================
 * GROUP EVENT HANDLER (Phase 1)
 * ==========================================
 * 
 * Listens to group-related events:
 * - Member joins/leaves
 * - Admin changes
 * - Group updates (name, description, picture)
 * - Membership requests
 * 
 * Events:
 * - client.on('group_join')
 * - client.on('group_leave')
 * - client.on('group_update')
 * - client.on('group_admin_changed')
 * - client.on('group_membership_request')
 * 
 * Author: WhatsApp Bot Linda
 * Date: February 11, 2026
 */

export class GroupEventHandler {
  constructor(mongoDb = null) {
    this.db = mongoDb;
    this.logger = console;
    this.groupEventsCollection = 'groupEvents';
  }

  /**
   * Handle group join event
   * Called when a member joins group
   * @param {GroupNotification} notification - Join notification
   */
  async handleGroupJoin(notification) {
    try {
      this.logger.log(`\n👥 [GROUP JOIN]`);
      this.logger.log(`Group: ${notification.chatId}`);
      this.logger.log(`Members joined: ${notification.contact.length}`);

      notification.contact.forEach((contact) => {
        this.logger.log(`  ➕ ${contact.number} (${contact.pushname || 'Unknown'})`);
      });

      // Log event to database
      if (this.db) {
        await this._logGroupEvent({
          eventType: 'join',
          groupId: notification.chatId,
          members: notification.contact.map((c) => c.number),
          timestamp: new Date(),
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error handling group join:`, error.message);
    }
  }

  /**
   * Handle group leave event
   * Called when a member leaves group
   * @param {GroupNotification} notification - Leave notification
   */
  async handleGroupLeave(notification) {
    try {
      this.logger.log(`\n👤 [GROUP LEAVE]`);
      this.logger.log(`Group: ${notification.chatId}`);
      this.logger.log(`Members left: ${notification.contact.length}`);

      notification.contact.forEach((contact) => {
        this.logger.log(`  ➖ ${contact.number} (${contact.pushname || 'Unknown'})`);
      });

      if (this.db) {
        await this._logGroupEvent({
          eventType: 'leave',
          groupId: notification.chatId,
          members: notification.contact.map((c) => c.number),
          timestamp: new Date(),
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error handling group leave:`, error.message);
    }
  }

  /**
   * Handle group update event
   * Called when group info changes (name, description, picture)
   * @param {GroupNotification} notification - Update notification
   */
  async handleGroupUpdate(notification) {
    try {
      this.logger.log(`\n📝 [GROUP UPDATE]`);
      this.logger.log(`Group: ${notification.chatId}`);

      if (notification.type === 'subject') {
        this.logger.log(`Name changed to: "${notification.body}"`);
      } else if (notification.type === 'description') {
        this.logger.log(`Description updated: "${notification.body}"`);
      } else if (notification.type === 'picture') {
        this.logger.log(`Picture updated`);
      } else {
        this.logger.log(`Update type: ${notification.type}`);
      }

      if (this.db) {
        await this._logGroupEvent({
          eventType: 'update',
          updateType: notification.type,
          groupId: notification.chatId,
          details: notification.body,
          timestamp: new Date(),
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error handling group update:`, error.message);
    }
  }

  /**
   * Handle group admin change event
   * Called when member is promoted/demoted to admin
   * @param {GroupNotification} notification - Admin change notification
   */
  async handleGroupAdminChange(notification) {
    try {
      this.logger.log(`\n⭐ [GROUP ADMIN CHANGE]`);
      this.logger.log(`Group: ${notification.chatId}`);

      const action = notification.type === 'promote' ? 'Promoted' : 'Demoted';

      notification.contact.forEach((contact) => {
        this.logger.log(`  ${action}: ${contact.number} (${contact.pushname || 'Unknown'})`);
      });

      if (this.db) {
        await this._logGroupEvent({
          eventType: 'admin_change',
          action: notification.type,
          groupId: notification.chatId,
          members: notification.contact.map((c) => c.number),
          timestamp: new Date(),
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error handling admin change:`, error.message);
    }
  }

  /**
   * Handle membership request event
   * Called when someone requests to join group
   * @param {GroupNotification} notification - Membership request notification
   */
  async handleMembershipRequest(notification) {
    try {
      this.logger.log(`\n🔔 [MEMBERSHIP REQUEST]`);
      this.logger.log(`Group: ${notification.chatId}`);
      this.logger.log(`Requester: ${notification.contact[0]?.number || 'Unknown'}`);

      if (this.db) {
        await this._logGroupEvent({
          eventType: 'membership_request',
          groupId: notification.chatId,
          requester: notification.contact[0]?.number,
          timestamp: new Date(),
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error handling membership request:`, error.message);
    }
  }

  /**
   * Get all group events for a group
   * @param {string} groupId - Group ID
   * @returns {Promise<Array>} Group events
   */
  async getGroupEvents(groupId) {
    try {
      if (!this.db) {
        return [];
      }

      const collection = this.db.collection(this.groupEventsCollection);
      const events = await collection
        .find({ groupId })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();

      this.logger.log(`📋 Retrieved ${events.length} events for group`);
      return events;
    } catch (error) {
      this.logger.error(`❌ Error getting group events:`, error.message);
      return [];
    }
  }

  /**
   * Get group summary/statistics
   * @param {string} groupId - Group ID
   * @returns {Promise<Object>} Group summary
   */
  async getGroupSummary(groupId) {
    try {
      if (!this.db) {
        return null;
      }

      const collection = this.db.collection(this.groupEventsCollection);
      const events = await collection.find({ groupId }).toArray();

      const summary = {
        groupId,
        totalEvents: events.length,
        joins: events.filter((e) => e.eventType === 'join').length,
        leaves: events.filter((e) => e.eventType === 'leave').length,
        updates: events.filter((e) => e.eventType === 'update').length,
        adminChanges: events.filter((e) => e.eventType === 'admin_change').length,
        membershipRequests: events.filter((e) => e.eventType === 'membership_request').length,
        lastActivity: events[0]?.timestamp || null,
      };

      this.logger.log(`📊 Group summary retrieved`);
      return summary;
    } catch (error) {
      this.logger.error(`❌ Error getting group summary:`, error.message);
      return null;
    }
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Log group event to database
   * @private
   */
  async _logGroupEvent(eventData) {
    try {
      if (!this.db) return;

      const collection = this.db.collection(this.groupEventsCollection);
      await collection.insertOne({
        ...eventData,
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error logging group event:`, error.message);
    }
  }
}

export default GroupEventHandler;
