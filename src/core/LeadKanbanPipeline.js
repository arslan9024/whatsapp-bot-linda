/**
 * @file LeadKanbanPipeline.js
 * @description Manages lead pipeline lifecycle stages (New -> Contacted -> Qualified ->
 * Viewing -> Deposit -> Won/Lost) backing the interactive Web UI Kanban board.
 * Category: Core
 */

export class LeadKanbanPipeline {
  constructor() {
    this.validStages = [
      'NEW',
      'CONTACTED',
      'QUALIFIED',
      'VIEWING_SCHEDULED',
      'DEPOSIT_PAID',
      'CLOSED_WON',
      'LOST'
    ];
    this.leads = new Map(); // leadId -> leadObject
  }

  /**
   * Adds or updates a lead in the pipeline
   * @param {string} leadId
   * @param {Object} data
   * @returns {Object} Updated lead
   */
  setLead(leadId, data) {
    const stage = this.validStages.includes(data.stage) ? data.stage : 'NEW';
    const entry = {
      leadId,
      ...data,
      stage,
      updatedAt: new Date().toISOString()
    };
    this.leads.set(leadId, entry);
    return entry;
  }

  /**
   * Moves a lead to a new Kanban column
   * @param {string} leadId
   * @param {string} newStage
   * @returns {Object}
   */
  moveStage(leadId, newStage) {
    if (!this.validStages.includes(newStage)) {
      throw new Error(`Invalid Kanban stage: "${newStage}"`);
    }

    const lead = this.leads.get(leadId);
    if (!lead) {
      throw new Error(`Lead "${leadId}" not found in pipeline`);
    }

    lead.stage = newStage;
    lead.updatedAt = new Date().toISOString();
    return lead;
  }

  /**
   * Aggregates leads grouped by Kanban column
   * @returns {Object} Column counts and lists
   */
  getKanbanBoardView() {
    const board = {};
    for (const stage of this.validStages) {
      board[stage] = [];
    }

    for (const lead of this.leads.values()) {
      if (board[lead.stage]) {
        board[lead.stage].push(lead);
      }
    }

    return board;
  }
}

export default new LeadKanbanPipeline();

