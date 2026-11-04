/**
 * @file AuditTrailQueryEngine.js
 * @description Provides filtering, full-text search, and pagination across audit trail logs,
 * powering the searchable audit table in the Web UI administration center.
 * Category: Domain / Feature (Security)
 */

export class AuditTrailQueryEngine {
  /**
   * Filters and paginates a list of audit records
   * @param {Array<Object>} records
   * @param {Object} query
   * @param {string} [query.actor]
   * @param {string} [query.action]
   * @param {string} [query.search]
   * @param {number} [query.page] - 1-indexed
   * @param {number} [query.limit]
   * @returns {{ total: number, page: number, totalPages: number, items: Array<Object> }}
   */
  queryAuditLogs(records = [], query = {}) {
    let filtered = [...records];

    if (query.actor) {
      filtered = filtered.filter(r => r.actor === query.actor);
    }

    if (query.action) {
      filtered = filtered.filter(r => r.action === query.action);
    }

    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(r => {
        return (
          r.action.toLowerCase().includes(s) ||
          r.actor.toLowerCase().includes(s) ||
          JSON.stringify(r.details || {}).toLowerCase().includes(s)
        );
      });
    }

    const total = filtered.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 20);
    const totalPages = Math.ceil(total / limit) || 1;

    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      total,
      page,
      totalPages,
      items
    };
  }
}

export default new AuditTrailQueryEngine();

