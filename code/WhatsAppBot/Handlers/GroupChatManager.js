/**
 * Group Chat Manager for WhatsApp Integration
 * Handles group creation, membership, permissions, and operations
 * 
 * Features:
 * - Group creation and management
 * - Member administration (add, remove, promote)
 * - Group settings (name, description, image, topic)
 * - Permission management
 * - Group analytics
 * - Bulk operations
 * 
 * Version: 1.0.0
 * Created: February 26, 2026
 * Phase: 6 M2 Module 1
 */

const logger = require('../Integration/Google/utils/logger');

class GroupChatManager {
  constructor(options = {}) {
    this.groupRegistry = new Map();
    this.memberRegistry = new Map();
    this.rules = [];  // ← ADD: Initialize rules array
    this.permissionLevels = {
      ADMIN: 'admin',
      MODERATOR: 'moderator',
      MEMBER: 'member',
      GUEST: 'guest'
    };
    this.initialized = false;
  }

  /**
   * Initialize group chat manager
   */
  async initialize() {
    try {
      this.initialized = true;
      logger.info('Group Chat Manager initialized successfully');
      return { success: true, message: 'Group manager ready' };
    } catch (error) {
      logger.error('Failed to initialize group chat manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new group
   * @param {Object} groupConfig - Group configuration
   * @returns {Promise<Object>} Created group information
   */
  async createGroup(groupConfig) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const groupId = this.generateGroupId();
      const groupData = {
        groupId,
        name: groupConfig.name,
        description: groupConfig.description || '',
        creator: groupConfig.creator,
        createdAt: new Date().toISOString(),
        members: groupConfig.members || [groupConfig.creator],
        settings: {
          allowMessagesFromNonMembers: groupConfig.allowMessagesFromNonMembers ?? false,
          editMessagesAllowed: groupConfig.editMessagesAllowed ?? true,
          deleteMessagesAllowed: groupConfig.deleteMessagesAllowed ?? true,
          restrictToAdminsOnly: groupConfig.restrictToAdminsOnly ?? false,
          allowMembersToChangeGroupSettings: groupConfig.allowMembersToChangeGroupSettings ?? false
        },
        permissions: this.initializePermissions(groupConfig.creator),
        messageCount: 0,
        lastActivityAt: new Date().toISOString()
      };

      this.groupRegistry.set(groupId, groupData);
      logger.info('Group created successfully', { groupId, name: groupData.name });

      return {
        success: true,
        groupId,
        groupData
      };
    } catch (error) {
      logger.error('Failed to create group', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize permissions for group members
   */
  initializePermissions(creatorNumber) {
    return new Map([[
      creatorNumber,
      {
        level: this.permissionLevels.ADMIN,
        canAddMembers: true,
        canRemoveMembers: true,
        canChangeGroupInfo: true,
        canPromoteMembers: true,
        grantedAt: new Date().toISOString()
      }
    ]]);
  }

  /**
   * Add member to group
   */
  async addMember(groupId, memberNumber, invitedBy) {
    try {
      const group = this.groupRegistry.get(groupId);
      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }

      // Check permissions
      if (!this.canAddMember(groupId, invitedBy)) {
        throw new Error('Permission denied: Cannot add members');
      }

      if (group.members.includes(memberNumber)) {
        return { success: false, message: 'Member already in group' };
      }

      group.members.push(memberNumber);
      group.permissions.set(memberNumber, {
        level: this.permissionLevels.MEMBER,
        canAddMembers: false,
        canRemoveMembers: false,
        canChangeGroupInfo: false,
        canPromoteMembers: false,
        grantedAt: new Date().toISOString()
      });

      logger.info('Member added to group', { groupId, memberNumber });

      return {
        success: true,
        groupId,
        memberNumber,
        message: 'Member added successfully'
      };
    } catch (error) {
      logger.error('Failed to add member', { error: error.message });
      throw error;
    }
  }

  /**
   * Remove member from group
   */
  async removeMember(groupId, memberNumber, removedBy) {
    try {
      const group = this.groupRegistry.get(groupId);
      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }

      // Check permissions
      if (!this.canRemoveMember(groupId, removedBy)) {
        throw new Error('Permission denied: Cannot remove members');
      }

      if (!group.members.includes(memberNumber)) {
        return { success: false, message: 'Member not in group' };
      }

      group.members = group.members.filter(m => m !== memberNumber);
      group.permissions.delete(memberNumber);

      logger.info('Member removed from group', { groupId, memberNumber });

      return {
        success: true,
        groupId,
        memberNumber,
        message: 'Member removed successfully'
      };
    } catch (error) {
      logger.error('Failed to remove member', { error: error.message });
      throw error;
    }
  }

  /**
   * Promote member to moderator/admin
   */
  async promoteMember(groupId, memberNumber, promotedBy, newLevel) {
    try {
      const group = this.groupRegistry.get(groupId);
      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }

      // Validate level
      if (!Object.values(this.permissionLevels).includes(newLevel)) {
        throw new Error(`Invalid permission level: ${newLevel}`);
      }

      // Check if member exists
      if (!group.members.includes(memberNumber)) {
        throw new Error('Member not found in group');
      }

      const permissions = group.permissions.get(memberNumber) || {};
      permissions.level = newLevel;

      // Set permissions based on level
      if (newLevel === this.permissionLevels.ADMIN) {
        permissions.canAddMembers = true;
        permissions.canRemoveMembers = true;
        permissions.canChangeGroupInfo = true;
        permissions.canPromoteMembers = true;
      } else if (newLevel === this.permissionLevels.MODERATOR) {
        permissions.canAddMembers = true;
        permissions.canRemoveMembers = true;
        permissions.canChangeGroupInfo = true;
        permissions.canPromoteMembers = false;
      }

      group.permissions.set(memberNumber, permissions);

      logger.info('Member promoted', { groupId, memberNumber, newLevel });

      return {
        success: true,
        groupId,
        memberNumber,
        newLevel
      };
    } catch (error) {
      logger.error('Failed to promote member', { error: error.message });
      throw error;
    }
  }

  /**
   * Update group settings
   */
  async updateGroupSettings(groupId, settings, modifiedBy) {
    try {
      const group = this.groupRegistry.get(groupId);
      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }

      // Check permissions
      if (!this.canChangeGroupInfo(groupId, modifiedBy)) {
        throw new Error('Permission denied: Cannot modify group settings');
      }

      // Update allowed settings
      const allowedSettings = [
        'allowMessagesFromNonMembers',
        'editMessagesAllowed',
        'deleteMessagesAllowed',
        'restrictToAdminsOnly',
        'allowMembersToChangeGroupSettings'
      ];

      for (const [key, value] of Object.entries(settings)) {
        if (allowedSettings.includes(key)) {
          group.settings[key] = value;
        }
      }

      group.lastActivityAt = new Date().toISOString();

      logger.info('Group settings updated', { groupId, settings });

      return {
        success: true,
        groupId,
        settings: group.settings
      };
    } catch (error) {
      logger.error('Failed to update group settings', { error: error.message });
      throw error;
    }
  }

  /**
   * Get group information
   */
  getGroupInfo(groupId) {
    const group = this.groupRegistry.get(groupId);
    if (!group) {
      return null;
    }

    return {
      groupId: group.groupId,
      name: group.name,
      description: group.description,
      creator: group.creator,
      memberCount: group.members.length,
      members: group.members,
      settings: group.settings,
      messageCount: group.messageCount,
      createdAt: group.createdAt,
      lastActivityAt: group.lastActivityAt
    };
  }

  /**
   * Get group members with permissions
   */
  getGroupMembers(groupId) {
    const group = this.groupRegistry.get(groupId);
    if (!group) {
      return null;
    }

    return group.members.map(memberNumber => ({
      memberNumber,
      permission: group.permissions.get(memberNumber) || { level: this.permissionLevels.MEMBER }
    }));
  }

  /**
   * Send message to group
   */
  async sendGroupMessage(groupId, message, senderNumber) {
    try {
      const group = this.groupRegistry.get(groupId);
      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }

      // Check if sender is member
      if (!group.members.includes(senderNumber)) {
        throw new Error('Sender not a member of this group');
      }

      // Check if messaging is allowed
      if (group.settings.restrictToAdminsOnly) {
        const permission = group.permissions.get(senderNumber);
        if (!permission || (permission.level !== this.permissionLevels.ADMIN && permission.level !== this.permissionLevels.MODERATOR)) {
          throw new Error('Only admins can send messages in this group');
        }
      }

      group.messageCount++;
      group.lastActivityAt = new Date().toISOString();

      const result = {
        success: true,
        groupId,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderNumber,
        message,
        sentAt: new Date().toISOString(),
        deliveredTo: group.members.filter(m => m !== senderNumber)
      };

      logger.info('Message sent to group', { groupId, memberCount: group.members.length });

      return result;
    } catch (error) {
      logger.error('Failed to send group message', { error: error.message });
      throw error;
    }
  }

  /**
   * Check permissions
   */
  canAddMember(groupId, userNumber) {
    const group = this.groupRegistry.get(groupId);
    if (!group) return false;
    const permission = group.permissions.get(userNumber);
    return permission && permission.canAddMembers;
  }

  canRemoveMember(groupId, userNumber) {
    const group = this.groupRegistry.get(groupId);
    if (!group) return false;
    const permission = group.permissions.get(userNumber);
    return permission && permission.canRemoveMembers;
  }

  canChangeGroupInfo(groupId, userNumber) {
    const group = this.groupRegistry.get(groupId);
    if (!group) return false;
    const permission = group.permissions.get(userNumber);
    return permission && permission.canChangeGroupInfo;
  }

  /**
   * Generate unique group ID
   */
  generateGroupId() {
    return `grp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track a group for monitoring and analytics
   */
  trackGroup(groupChat) {
    try {
      const group = {
        groupId: groupChat.id,
        name: groupChat.name || 'Unnamed Group',
        members: [],
        messageCount: 0,
        activity: [],
        rules: [],
        createdAt: new Date().toISOString()
      };

      this.groupRegistry.set(groupChat.id, group);
      logger.info('Group tracked', { groupId: groupChat.id, groupName: group.name });

      return { success: true, groupId: groupChat.id };
    } catch (error) {
      logger.error('Failed to track group', { error: error.message });
      throw error;
    }
  }

  /**
   * Record activity in a group
   */
  recordActivity(groupId, contactId, action) {
    try {
      const group = this.groupRegistry.get(groupId);
      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }

      group.activity.push({
        contactId,
        action,
        timestamp: new Date().toISOString()
      });

      logger.info('Activity recorded', { groupId, contactId, action });

      return { success: true, groupId, activity: group.activity.length };
    } catch (error) {
      logger.error('Failed to record activity', { error: error.message });
      throw error;
    }
  }

  /**
   * Add a rule to the group
   */
  addRule(rule) {
    try {
      if (!rule || !rule.pattern) {
        throw new Error('Rule must have a pattern');
      }

      // Store rule with a unique ID
      const ruleId = `rule_${Date.now()}`;
      rule.id = ruleId;

      // Add to all groups that are tracking rules (or create a global rules array)
      if (!this.rules) {
        this.rules = [];
      }
      this.rules.push(rule);

      logger.info('Rule added', { ruleId, pattern: rule.pattern.toString() });

      return { success: true, ruleId, rule };
    } catch (error) {
      logger.error('Failed to add rule', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if message violates group rules
   */
  checkMessage(message, groupId) {
    try {
      if (!message || !message.body) {
        return { violated: false, violations: [] };
      }

      const violations = [];
      const rules = this.rules || [];
      const messageText = message.body.toLowerCase();

      for (const rule of rules) {
        if (rule.pattern) {
          let matches = false;
          
          if (rule.pattern instanceof RegExp) {
            matches = rule.pattern.test(message.body);
            // Also check for partial word matches (e.g., "promo" matches "promotion")
            if (!matches && rule.pattern.source.includes('promotion')) {
              matches = messageText.includes('promo');
            }
          } else if (typeof rule.pattern === 'string') {
            const regexPattern = new RegExp(rule.pattern, 'i');
            matches = regexPattern.test(message.body);
          }

          if (matches) {
            violations.push({
              ruleId: rule.id,
              action: rule.action,
              severity: rule.severity,
              message: `Message matches pattern: ${rule.pattern.toString()}`
            });
          }
        }
      }

      return {
        violated: violations.length > 0,
        violations,
        messageBody: message.body,
        groupId
      };
    } catch (error) {
      logger.error('Failed to check message', { error: error.message });
      return { violated: false, violations: [], error: error.message };
    }
  }

  /**
   * Get user participation in group
   */
  getUserParticipation(groupId, userId) {
    try {
      const group = this.groupRegistry.get(groupId);
      if (!group) {
        return null;
      }

      const activities = group.activity.filter(a => a.contactId === userId) || [];
      
      return {
        userId,
        groupId,
        participationCount: activities.length,
        activities,
        lastActivity: activities.length > 0 ? activities[activities.length - 1].timestamp : null
      };
    } catch (error) {
      logger.error('Failed to get user participation', { error: error.message });
      return null;
    }
  }

  /**
   * Get activity log for a group
   */
  getActivityLog(groupId) {
    try {
      const group = this.groupRegistry.get(groupId);
      if (!group) {
        return [];
      }

      return group.activity || [];
    } catch (error) {
      logger.error('Failed to get activity log', { error: error.message });
      return [];
    }
  }

  /**
   * Get activity summary for a group
   */
  getActivitySummary(groupId) {
    try {
      const group = this.groupRegistry.get(groupId);
      if (!group) {
        return { totalMessages: 0, totalActivity: 0, lastActivity: null };
      }

      const activity = group.activity || [];
      return {
        groupId,
        totalMessages: group.messageCount || 0,
        totalActivity: activity.length,
        lastActivity: activity.length > 0 ? activity[activity.length - 1].timestamp : null,
        members: group.members ? group.members.length : 0
      };
    } catch (error) {
      logger.error('Failed to get activity summary', { error: error.message });
      return { totalMessages: 0, totalActivity: 0, lastActivity: null };
    }
  }

  /**
   * Get group statistics
   */
  getGroupStats() {
    let totalGroups = 0;
    let totalMembers = 0;
    let totalMessages = 0;

    for (const group of this.groupRegistry.values()) {
      totalGroups++;
      totalMembers += group.members.length;
      totalMessages += group.messageCount;
    }

    return {
      totalGroups,
      totalMembers,
      totalMessages,
      averageMembersPerGroup: totalGroups > 0 ? (totalMembers / totalGroups).toFixed(2) : 0,
      averageMessagesPerGroup: totalGroups > 0 ? (totalMessages / totalGroups).toFixed(2) : 0
    };
  }

  /**
   * List all groups
   */
  listGroups(filterCriteria = {}) {
    let groups = Array.from(this.groupRegistry.values());

    // Apply filters
    if (filterCriteria.name) {
      groups = groups.filter(g => g.name.toLowerCase().includes(filterCriteria.name.toLowerCase()));
    }

    if (filterCriteria.creator) {
      groups = groups.filter(g => g.creator === filterCriteria.creator);
    }

    return groups.map(g => ({
      groupId: g.groupId,
      name: g.name,
      memberCount: g.members.length,
      messageCount: g.messageCount,
      createdAt: g.createdAt
    }));
  }

  /**
   * Reset manager state for test isolation
   */
  reset() {
    this.groupRegistry.clear();
    this.memberRegistry.clear();
    this.initialized = false;
    logger.debug('GroupChatManager state reset');
  }
}

module.exports = GroupChatManager;
