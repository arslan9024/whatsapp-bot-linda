/**
 * @file VisualWorkflowEngine.js
 * @description Evaluates and executes visual drip campaign workflow node graphs
 * (Trigger -> Condition -> Wait -> Action) designed within the Web UI builder.
 * Category: Outreach
 */

export class VisualWorkflowEngine {
  /**
   * Evaluates if a node's condition matches the lead state
   * @param {Object} condition - e.g. { field: 'budget', op: 'gte', value: 2000000 }
   * @param {Object} lead
   * @returns {boolean}
   */
  evaluateCondition(condition, lead) {
    if (!condition) return true;
    const actual = lead[condition.field];

    switch (condition.op) {
      case 'gte': return actual >= condition.value;
      case 'lte': return actual <= condition.value;
      case 'eq': return actual === condition.value;
      case 'contains': return String(actual || '').toLowerCase().includes(String(condition.value).toLowerCase());
      default: return true;
    }
  }

  /**
   * Plans the sequence of execution steps for a lead through a node graph
   * @param {Array<Object>} workflowNodes
   * @param {Object} lead
   * @returns {Array<Object>} Executable planned actions
   */
  planWorkflowExecution(workflowNodes = [], lead = {}) {
    const plannedActions = [];

    for (const node of workflowNodes) {
      if (node.type === 'condition') {
        const passes = this.evaluateCondition(node.condition, lead);
        if (!passes) {
          plannedActions.push({ nodeId: node.id, status: 'BRANCH_SKIPPED' });
          break; // Stop or take false branch
        }
      } else if (node.type === 'action') {
        plannedActions.push({
          nodeId: node.id,
          actionType: node.actionType, // 'SEND_WHATSAPP' | 'ADD_TAG' | 'ASSIGN_BROKER'
          payload: node.payload,
          status: 'READY'
        });
      } else if (node.type === 'delay') {
        plannedActions.push({
          nodeId: node.id,
          actionType: 'WAIT',
          delayHours: node.delayHours || 24,
          status: 'SCHEDULED'
        });
      }
    }

    return plannedActions;
  }
}

export default new VisualWorkflowEngine();
