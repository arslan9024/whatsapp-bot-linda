/**
 * ==========================================
 * GROUP MANAGEMENT SERVICE (Phase 1)
 * ==========================================
 * 
 * Handles group operations:
 * - Create groups
 * - Add/remove/promote participants
 * - Set group info (name, description, image)
 * - Manage invite codes
 * - Handle membership requests
 * 
 * Author: WhatsApp Bot Linda
 * Date: February 11, 2026
 */

class GroupManagementService {
  constructor(botManager = null) {
    this.botManager = botManager;
    this.logger = console;
  }

  /**
   * Create a new group
   * @param {string} title - Group name
   * @param {Array<string>} phoneNumbers - Array of phone numbers to add
   * @param {Object} options - Additional options {description, picture}
   * @returns {Promise<Chat>} Created group chat object
   */
  async createGroup(title, phoneNumbers = [], options = {}) {
    try {
      if (!this.botManager || !this.botManager.client) {
        throw new Error("Bot manager with WhatsApp client required");
      }

      if (!title || title.trim().length === 0) {
        throw new Error("Group title is required");
      }

      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        throw new Error("At least one phone number is required");
      }

      // Create group with participants
      const group = await this.botManager.client.createGroup(title, phoneNumbers);

      this.logger.log(`✅ Group created: "${title}" with ${phoneNumbers.length} members`);

      // Set description if provided
      if (options.description) {
        await group.setDescription(options.description);
        this.logger.log(`📝 Group description set`);
      }

      // Set picture if provided
      if (options.picture) {
        await group.setPicture(options.picture);
        this.logger.log(`🖼️  Group picture set`);
      }

      return group;
    } catch (error) {
      this.logger.error(`❌ Error creating group:`, error.message);
      throw error;
    }
  }

  /**
   * Add participants to group
   * @param {Chat} group - Group chat object
   * @param {Array<string>} phoneNumbers - Phone numbers to add
   * @returns {Promise<boolean>} Success status
   */
  async addParticipants(group, phoneNumbers) {
    try {
      if (!group || !group.addParticipants) {
        throw new Error("Valid group object required");
      }

      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        throw new Error("At least one phone number required");
      }

      await group.addParticipants(phoneNumbers);
      this.logger.log(`👥 Added ${phoneNumbers.length} participants to group`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error adding participants:`, error.message);
      throw error;
    }
  }

  /**
   * Remove participants from group
   * @param {Chat} group - Group chat object
   * @param {Array<string>} phoneNumbers - Phone numbers to remove
   * @returns {Promise<boolean>} Success status
   */
  async removeParticipants(group, phoneNumbers) {
    try {
      if (!group || !group.removeParticipants) {
        throw new Error("Valid group object required");
      }

      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        throw new Error("At least one phone number required");
      }

      await group.removeParticipants(phoneNumbers);
      this.logger.log(`👤 Removed ${phoneNumbers.length} participants from group`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error removing participants:`, error.message);
      throw error;
    }
  }

  /**
   * Promote participant to admin
   * @param {Chat} group - Group chat object
   * @param {Array<string>} phoneNumbers - Phone numbers to promote
   * @returns {Promise<boolean>} Success status
   */
  async promoteToAdmin(group, phoneNumbers) {
    try {
      if (!group || !group.promoteParticipants) {
        throw new Error("Valid group object required");
      }

      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        throw new Error("At least one phone number required");
      }

      await group.promoteParticipants(phoneNumbers);
      this.logger.log(`⭐ Promoted ${phoneNumbers.length} participants to admin`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error promoting to admin:`, error.message);
      throw error;
    }
  }

  /**
   * Demote participant from admin
   * @param {Chat} group - Group chat object
   * @param {Array<string>} phoneNumbers - Phone numbers to demote
   * @returns {Promise<boolean>} Success status
   */
  async demoteFromAdmin(group, phoneNumbers) {
    try {
      if (!group || !group.demoteParticipants) {
        throw new Error("Valid group object required");
      }

      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        throw new Error("At least one phone number required");
      }

      await group.demoteParticipants(phoneNumbers);
      this.logger.log(`📍 Demoted ${phoneNumbers.length} participants from admin`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error demoting from admin:`, error.message);
      throw error;
    }
  }

  /**
   * Set group subject/name
   * @param {Chat} group - Group chat object
   * @param {string} newName - New group name
   * @returns {Promise<boolean>} Success status
   */
  async setGroupName(group, newName) {
    try {
      if (!group || !group.setSubject) {
        throw new Error("Valid group object required");
      }

      if (!newName || newName.trim().length === 0) {
        throw new Error("Group name is required");
      }

      await group.setSubject(newName);
      this.logger.log(`📛 Group name changed to: "${newName}"`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error setting group name:`, error.message);
      throw error;
    }
  }

  /**
   * Set group description
   * @param {Chat} group - Group chat object
   * @param {string} description - Group description
   * @returns {Promise<boolean>} Success status
   */
  async setGroupDescription(group, description) {
    try {
      if (!group || !group.setDescription) {
        throw new Error("Valid group object required");
      }

      await group.setDescription(description);
      this.logger.log(`📝 Group description updated`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error setting group description:`, error.message);
      throw error;
    }
  }

  /**
   * Set group picture
   * @param {Chat} group - Group chat object
   * @param {MessageMedia} media - Image media object
   * @returns {Promise<boolean>} Success status
   */
  async setGroupPicture(group, media) {
    try {
      if (!group || !group.setPicture) {
        throw new Error("Valid group object required");
      }

      if (!media) {
        throw new Error("Media object required for group picture");
      }

      await group.setPicture(media);
      this.logger.log(`🖼️  Group picture updated`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error setting group picture:`, error.message);
      throw error;
    }
  }

  /**
   * Get group invite code/link
   * @param {Chat} group - Group chat object
   * @returns {Promise<string>} Invite code/link
   */
  async getInviteCode(group) {
    try {
      if (!group || !group.getInviteCode) {
        throw new Error("Valid group object required");
      }

      const inviteCode = await group.getInviteCode();
      this.logger.log(`🔗 Invite code retrieved`);
      return inviteCode;
    } catch (error) {
      this.logger.error(`❌ Error getting invite code:`, error.message);
      throw error;
    }
  }

  /**
   * Revoke group invite link
   * @param {Chat} group - Group chat object
   * @returns {Promise<boolean>} Success status
   */
  async revokeInviteCode(group) {
    try {
      if (!group || !group.revokeInvite) {
        throw new Error("Valid group object required");
      }

      await group.revokeInvite();
      this.logger.log(`🚫 Group invite link revoked`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error revoking invite:`, error.message);
      throw error;
    }
  }

  /**
   * Get pending membership requests
   * @param {Chat} group - Group chat object
   * @returns {Promise<Array>} Pending request objects
   */
  async getMembershipRequests(group) {
    try {
      if (!group || !group.getGroupMembershipRequests) {
        throw new Error("Valid group object required");
      }

      const requests = await group.getGroupMembershipRequests();
      this.logger.log(`📋 Retrieved ${requests?.length || 0} membership requests`);
      return requests || [];
    } catch (error) {
      this.logger.error(`❌ Error getting membership requests:`, error.message);
      return [];
    }
  }

  /**
   * Approve membership request(s)
   * @param {Chat} group - Group chat object
   * @param {Array<string>} requestIds - Request IDs to approve
   * @returns {Promise<boolean>} Success status
   */
  async approveMembershipRequest(group, requestIds) {
    try {
      if (!group || !group.approveGroupMembershipRequests) {
        throw new Error("Valid group object required");
      }

      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        throw new Error("At least one request ID required");
      }

      await group.approveGroupMembershipRequests(requestIds);
      this.logger.log(`✅ Approved ${requestIds.length} membership requests`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error approving requests:`, error.message);
      throw error;
    }
  }

  /**
   * Reject membership request(s)
   * @param {Chat} group - Group chat object
   * @param {Array<string>} requestIds - Request IDs to reject
   * @returns {Promise<boolean>} Success status
   */
  async rejectMembershipRequest(group, requestIds) {
    try {
      if (!group || !group.rejectGroupMembershipRequests) {
        throw new Error("Valid group object required");
      }

      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        throw new Error("At least one request ID required");
      }

      await group.rejectGroupMembershipRequests(requestIds);
      this.logger.log(`❌ Rejected ${requestIds.length} membership requests`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error rejecting requests:`, error.message);
      throw error;
    }
  }

  /**
   * Get group members/participants
   * @param {Chat} group - Group chat object
   * @returns {Array} Array of participant objects
   */
  getGroupMembers(group) {
    try {
      if (!group || !group.participants) {
        throw new Error("Valid group object required");
      }

      const members = group.participants || [];
      this.logger.log(`👥 Retrieved ${members.length} group members`);
      return members;
    } catch (error) {
      this.logger.error(`❌ Error getting group members:`, error.message);
      return [];
    }
  }

  /**
   * Get group info summary
   * @param {Chat} group - Group chat object
   * @returns {Object} Group information
   */
  getGroupInfo(group) {
    try {
      if (!group) {
        throw new Error("Valid group object required");
      }

      return {
        name: group.name,
        id: group.id,
        participantCount: group.participants?.length || 0,
        admins: group.participants?.filter((p) => p.isAdmin).length || 0,
        owner: group.owner,
        description: group.description || 'N/A',
        timestamp: group.groupMetadata?.creation || null,
      };
    } catch (error) {
      this.logger.error(`❌ Error getting group info:`, error.message);
      return null;
    }
  }

  /**
   * Leave group
   * @param {Chat} group - Group chat object
   * @returns {Promise<boolean>} Success status
   */
  async leaveGroup(group) {
    try {
      if (!group || !group.leave) {
        throw new Error("Valid group object required");
      }

      await group.leave();
      this.logger.log(`👋 Left group successfully`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error leaving group:`, error.message);
      throw error;
    }
  }
}

export function getGroupManagementService(botManager = null) {
  return new GroupManagementService(botManager);
}

export default GroupManagementService;
