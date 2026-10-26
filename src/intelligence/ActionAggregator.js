/**
 * ============================================
 * ACTION AGGREGATOR (Phase 17)
 * ============================================
 * 
 * Aggregates WhatsApp message actions (reactions,
 * edits, deletions, forwards, read receipts) into
 * a unified event stream for analysis.
 */

export class ActionAggregator {
  constructor() {
    this.actions = new Map();  // actionId -> action object
    this.actionsByMessage = new Map();  // messageId -> actions array
    this.actionsByActor = new Map();  // actor -> actions array
    this.actionsByType = new Map();  // actionType -> actions array
    this.actionSequence = [];  // chronological sequence of all actions
  }

  /**
   * Register a message action
   */
  registerAction(actionObj) {
    try {
      // Validate required fields
      if (!actionObj.actionId || !actionObj.messageId || !actionObj.actionType || !actionObj.actor) {
        console.warn('⚠️ Invalid action object');
        return false;
      }

      // Normalize action object
      const action = {
        actionId: actionObj.actionId,
        messageId: actionObj.messageId,
        conversationId: actionObj.conversationId,
        actionType: actionObj.actionType,
        actor: actionObj.actor,
        data: actionObj.data || {},
        timestamp: actionObj.timestamp || new Date(),
        processed: false,
      };

      // Store in main map
      this.actions.set(action.actionId, action);

      // Index by message
      if (!this.actionsByMessage.has(action.messageId)) {
        this.actionsByMessage.set(action.messageId, []);
      }
      this.actionsByMessage.get(action.messageId).push(action);

      // Index by actor
      if (!this.actionsByActor.has(action.actor)) {
        this.actionsByActor.set(action.actor, []);
      }
      this.actionsByActor.get(action.actor).push(action);

      // Index by type
      if (!this.actionsByType.has(action.actionType)) {
        this.actionsByType.set(action.actionType, []);
      }
      this.actionsByType.get(action.actionType).push(action);

      // Add to sequence
      this.actionSequence.push(action);

      console.log(`✅ Action registered: ${action.actionType} on message ${action.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Error registering action:', error.message);
      return false;
    }
  }

  /**
   * Get actions for a message
   */
  getMessageActions(messageId) {
    return this.actionsByMessage.get(messageId) || [];
  }

  /**
   * Get actions by actor
   */
  getActorActions(actor) {
    return this.actionsByActor.get(actor) || [];
  }

  /**
   * Get actions by type
   */
  getActionsByType(actionType) {
    return this.actionsByType.get(actionType) || [];
  }

  /**
   * Get action timeline for message
   */
  getMessageTimeline(messageId) {
    try {
      const actions = this.getMessageActions(messageId);
      if (actions.length === 0) return [];

      return actions.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('❌ Error getting timeline:', error.message);
      return [];
    }
  }

  /**
   * Get action summary for message
   */
  getMessageActionSummary(messageId) {
    try {
      const actions = this.getMessageActions(messageId);
      if (actions.length === 0) return null;

      const summary = {
        messageId,
        totalActions: actions.length,
        actionBreakdown: {},
        actors: new Set(),
        firstAction: null,
        lastAction: null,
        timeline: [],
      };

      for (const action of actions) {
        summary.actionBreakdown[action.actionType] = 
          (summary.actionBreakdown[action.actionType] || 0) + 1;
        summary.actors.add(action.actor);
      }

      summary.actors = Array.from(summary.actors);

      const timeline = this.getMessageTimeline(messageId);
      if (timeline.length > 0) {
        summary.firstAction = timeline[0];
        summary.lastAction = timeline[timeline.length - 1];
        summary.timeline = timeline.map(a => ({
          type: a.actionType,
          actor: a.actor,
          timestamp: a.timestamp,
          data: a.data,
        }));
      }

      return summary;
    } catch (error) {
      console.error('❌ Error getting summary:', error.message);
      return null;
    }
  }

  /**
   * Get action statistics
   */
  getStats() {
    try {
      const stats = {
        totalActions: this.actions.size,
        actionsByType: {},
        topActors: [],
        messagesWithActions: this.actionsByMessage.size,
        timeSpan: null,
      };

      // Count by type
      for (const [type, actions] of this.actionsByType) {
        stats.actionsByType[type] = actions.length;
      }

      // Get top actors
      const actorCounts = Array.from(this.actionsByActor.entries())
        .map(([actor, actions]) => ({ actor, count: actions.length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      stats.topActors = actorCounts;

      // Time span
      if (this.actionSequence.length > 0) {
        const times = this.actionSequence.map(a => a.timestamp.getTime());
        stats.timeSpan = {
          start: new Date(Math.min(...times)),
          end: new Date(Math.max(...times)),
          durationMs: Math.max(...times) - Math.min(...times),
        };
      }

      return stats;
    } catch (error) {
      console.error('❌ Error getting stats:', error.message);
      return {};
    }
  }

  /**
   * Check if message was edited
   */
  wasEdited(messageId) {
    const edits = this.getMessageActions(messageId)
      .filter(a => a.actionType === 'edit');
    return edits.length > 0;
  }

  /**
   * Get all edits for a message
   */
  getEdits(messageId) {
    return this.getMessageActions(messageId)
      .filter(a => a.actionType === 'edit')
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Check if message was deleted
   */
  wasDeleted(messageId) {
    return this.getMessageActions(messageId)
      .some(a => a.actionType === 'delete');
  }

  /**
   * Get deletion info
   */
  getDeletionInfo(messageId) {
    const deletion = this.getMessageActions(messageId)
      .find(a => a.actionType === 'delete');
    return deletion || null;
  }

  /**
   * Check if message was forwarded
   */
  wasForwarded(messageId) {
    const forwards = this.getMessageActions(messageId)
      .filter(a => a.actionType === 'forward');
    return forwards.length > 0;
  }

  /**
   * Get forward chain
   */
  getForwardChain(messageId) {
    return this.getMessageActions(messageId)
      .filter(a => a.actionType === 'forward')
      .map(a => ({
        actor: a.actor,
        forwardedTo: a.data.forwardedTo,
        timestamp: a.timestamp,
      }));
  }

  /**
   * Check if message was read
   */
  wasRead(messageId) {
    const reads = this.getMessageActions(messageId)
      .filter(a => a.actionType === 'read');
    return reads.length > 0;
  }

  /**
   * Get read receipts
   */
  getReadReceipts(messageId) {
    return this.getMessageActions(messageId)
      .filter(a => a.actionType === 'read')
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(a => ({
        actor: a.actor,
        timestamp: a.timestamp,
      }));
  }

  /**
   * Get action engagement score (0-100)
   */
  getEngagementScore(messageId) {
    try {
      const actions = this.getMessageActions(messageId);
      if (actions.length === 0) return 0;

      const typeWeights = {
        'read': 20,
        'reaction': 30,
        'forward': 40,
        'edit': 25,
        'pin': 15,
      };

      let score = 0;
      for (const action of actions) {
        score += typeWeights[action.actionType] || 0;
      }

      // Cap at 100
      return Math.min(score, 100);
    } catch (error) {
      console.error('❌ Error calculating engagement:', error.message);
      return 0;
    }
  }

  /**
   * Clean old actions
   */
  cleanup(ttlMs = 604800000) {  // 7 days default
    try {
      const now = Date.now();
      const toDelete = [];

      for (const [actionId, action] of this.actions) {
        if (now - action.timestamp > ttlMs) {
          toDelete.push(actionId);
        }
      }

      for (const actionId of toDelete) {
        const action = this.actions.get(actionId);
        
        // Remove from indexes
        const msgActions = this.actionsByMessage.get(action.messageId) || [];
        this.actionsByMessage.set(
          action.messageId,
          msgActions.filter(a => a.actionId !== actionId)
        );

        // Remove deleted message entry if empty
        if (this.actionsByMessage.get(action.messageId).length === 0) {
          this.actionsByMessage.delete(action.messageId);
        }

        this.actions.delete(actionId);
      }

      if (toDelete.length > 0) {
        console.log(`✅ Cleaned ${toDelete.length} expired actions`);
      }
      return toDelete.length;
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
      return 0;
    }
  }

  /**
   * Clear all actions
   */
  clear() {
    this.actions.clear();
    this.actionsByMessage.clear();
    this.actionsByActor.clear();
    this.actionsByType.clear();
    this.actionSequence = [];
    console.log('✅ Action aggregator cleared');
  }
}

// Export singleton
export const actionAggregator = new ActionAggregator();
