/**
 * @file GoogleSheetsLiveSync.js
 * @description Syncs qualified leads, campaign statuses, and viewing appointments with
 * designated Google Sheets tabs in real-time for non-technical team collaboration.
 * Category: Integrations
 */

export class GoogleSheetsLiveSync {
  constructor(config = {}) {
    this.sheetColumns = [
      'Timestamp',
      'Name',
      'Phone',
      'Community',
      'Budget AED',
      'Lead Status',
      'Assigned Broker',
      'Notes'
    ];
  }

  /**
   * Formats a lead entity into an ordered row array for Sheets append
   * @param {Object} lead
   * @returns {Array<any>} Ordered row values
   */
  formatRow(lead = {}) {
    return [
      lead.timestamp || new Date().toISOString(),
      lead.name || 'Anonymous',
      lead.phone || '',
      lead.community || 'Dubai General',
      lead.budgetAed || 0,
      lead.status || 'NEW',
      lead.assignedBroker || 'Unassigned',
      lead.notes || ''
    ];
  }

  /**
   * Parses an incoming row array from Google Sheets back into a lead object
   * @param {Array<any>} rowArray
   * @returns {Object} Normalized lead object
   */
  parseRow(rowArray = []) {
    return {
      timestamp: rowArray[0] || new Date().toISOString(),
      name: rowArray[1] || 'Anonymous',
      phone: String(rowArray[2] || '').trim(),
      community: rowArray[3] || '',
      budgetAed: Number(rowArray[4] || 0),
      status: rowArray[5] || 'NEW',
      assignedBroker: rowArray[6] || 'Unassigned',
      notes: rowArray[7] || ''
    };
  }
}

export default new GoogleSheetsLiveSync();

