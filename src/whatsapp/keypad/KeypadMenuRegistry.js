/**
 * ====================================================================
 * KEYPAD MENU REGISTRY (Hierarchical Menu Definition)
 * ====================================================================
 * Declarative structure of the interactive WhatsApp keypad dashboard.
 * Supports nested menus, numbered shortcuts, and direct path navigation.
 *
 * @since Development Phase — October 2026
 */

export const MENUS = {
  root: {
    id: 'root',
    parentId: null,
    title: '📱 *LINDA AI — KEYPAD DASHBOARD*',
    description: 'Reply with an option number to manage Linda:',
    options: [
      { key: '1', label: '📊 System Status & Health', subMenuId: 'health' },
      { key: '2', label: '📱 Accounts & Devices', subMenuId: 'accounts' },
      { key: '3', label: '📢 Campaigns & Damac Hills 2', subMenuId: 'campaigns' },
      { key: '4', label: '📈 Analytics & Stats', subMenuId: 'analytics' },
      { key: '5', label: '📋 GorahaBot & Contacts', subMenuId: 'goraha' },
      { key: '6', label: '📄 Google Sheets', subMenuId: 'sheets' },
      { key: '7', label: '🔧 System Recovery & Bridge', subMenuId: 'system' },
    ],
  },

  health: {
    id: 'health',
    parentId: 'root',
    title: '📊 *SYSTEM STATUS & HEALTH*',
    description: 'Choose a diagnostics action:',
    options: [
      { key: '1', code: '1.1', label: '🩺 Full System Health Check', action: 'health_doctor' },
      { key: '2', code: '1.2', label: '⚡ Live Connections Status', action: 'health_connections' },
      { key: '3', code: '1.3', label: '🛡️ Circuit Breaker & Degradation', action: 'health_circuit' },
      { key: '4', code: '1.4', label: '🔄 Auto-Reconnect Info', action: 'health_reconnect' },
    ],
  },

  accounts: {
    id: 'accounts',
    parentId: 'root',
    title: '📱 *ACCOUNTS & DEVICES MANAGEMENT*',
    description: 'Select an account management task:',
    options: [
      { key: '1', code: '2.1', label: '📋 List All Accounts & Live Status', action: 'accounts_list' },
      { key: '2', code: '2.2', label: '👑 Add New Master Account (Instructions)', action: 'accounts_add_guide' },
      { key: '3', code: '2.3', label: '🔄 Relink Master Account (Trigger Code)', action: 'accounts_relink_master' },
      { key: '4', code: '2.4', label: '💾 Restore All Saved Sessions', action: 'accounts_restore_all' },
      { key: '5', code: '2.5', label: '🔒 Create Encrypted Session Backup', action: 'accounts_backup_sessions' },
      { key: '6', code: '2.6', label: '♻️ Headless Chrome Memory Purge (> 250MB)', action: 'accounts_recycle_memory' },
      { key: '7', code: '2.7', label: '📢 Broadcast Team Announcement to Agents', action: 'accounts_broadcast_team' },
    ],
  },

  campaigns: {
    id: 'campaigns',
    parentId: 'root',
    title: '📢 *CAMPAIGNS & DAMAC HILLS 2 OUTREACH*',
    description: 'Select an outreach campaign action:',
    options: [
      { key: '1', code: '3.1', label: '📊 Damac Hills 2 Status & Daily Quota (1/day)', action: 'campaign_damac_status' },
      { key: '2', code: '3.2', label: '🧪 Run Closed-Circle Dry Run Simulation', action: 'campaign_dry_run' },
      { key: '3', code: '3.3', label: '👑 Test Supervisor Reminder Dispatch', action: 'campaign_test_supervisor' },
      { key: '4', code: '3.4', label: '📁 View Quota Ledger & Active Lines', action: 'campaign_quota_view' },
      { key: '5', code: '3.5', label: '📋 Pending Agent Follow-ups (SLA Status)', action: 'campaign_pending_followups' },
      { key: '6', code: '3.6', label: '🔍 Search Damac Hills 2 Clusters & Info', action: 'campaign_search_owner' },
      { key: '7', code: '3.7', label: '🛑 Safe Outreach Pause / Resume Switch', action: 'campaign_toggle_pause' },
      { key: '8', code: '3.8', label: '📊 Agent Daily Activity Scorecard (Evening Report)', action: 'campaign_evening_scorecard' },
      { key: '9', code: '3.9', label: '📍 Damac Hills 2 GPS Location Pins & Amenities', action: 'campaign_locations' },
      { key: '10', code: '3.10', label: '📊 Instant Property Valuation Estimates', action: 'campaign_valuation' },
      { key: '11', code: '3.11', label: '📄 Damac Hills 2 Digital Brochure & Links', action: 'campaign_brochure' },
    ],
  },

  analytics: {
    id: 'analytics',
    parentId: 'root',
    title: '📈 *ANALYTICS & METRICS*',
    description: 'Select an analytics report:',
    options: [
      { key: '1', code: '4.1', label: '⚡ Real-Time Analytics Overview', action: 'analytics_realtime' },
      { key: '2', code: '4.2', label: '📊 Comprehensive Performance Report', action: 'analytics_report' },
      { key: '3', code: '4.3', label: '⏱️ System Uptime & Traffic', action: 'analytics_uptime' },
    ],
  },

  goraha: {
    id: 'goraha',
    parentId: 'root',
    title: '📋 *GORAHABOT & PROPERTY CONTACTS*',
    description: 'Select a Goraha task:',
    options: [
      { key: '1', code: '5.1', label: '🩺 GorahaBot Live Status Check', action: 'goraha_status' },
      { key: '2', code: '5.2', label: '🔍 Verify Property Owners & Contacts', action: 'goraha_verify' },
      { key: '3', code: '5.3', label: '🎯 Filter Damac Hills 2 Contacts', action: 'goraha_filter_damac' },
    ],
  },

  sheets: {
    id: 'sheets',
    parentId: 'root',
    title: '📄 *GOOGLE SHEETS INTEGRATION*',
    description: 'Select a Google Sheets operation:',
    options: [
      { key: '1', code: '6.1', label: 'ℹ️ View Outreach Spreadsheet Metadata', action: 'sheets_info' },
      { key: '2', code: '6.2', label: '📖 Read Recent Status Rows', action: 'sheets_read' },
    ],
  },

  system: {
    id: 'system',
    parentId: 'root',
    title: '🔧 *SYSTEM RECOVERY & BRIDGE CONTROLS*',
    description: 'Select a system maintenance action:',
    options: [
      { key: '1', code: '7.1', label: '🔄 Emergency Restore All Sessions', action: 'accounts_restore_all' },
      { key: '2', code: '7.2', label: '📊 WhatsApp Bridge Diagnostics & Stats', action: 'bridge_stats' },
    ],
  },
};

/**
 * Format a menu screen into a WhatsApp message string.
 *
 * @param {object} menu
 * @returns {string}
 */
export function formatMenuScreen(menu) {
  let text = `${menu.title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (menu.description) {
    text += `${menu.description}\n\n`;
  }

  for (const opt of menu.options) {
    const keyLabel = opt.code || opt.key;
    text += `[${keyLabel}] ${opt.label}\n`;
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💡 *Navigation:* [00] 🏠 Home Menu`;
  if (menu.parentId) {
    text += ` | [0] ⬅️ Back`;
  }
  return text;
}

/**
 * Find menu by ID.
 *
 * @param {string} menuId
 * @returns {object|null}
 */
export function getMenu(menuId) {
  return MENUS[menuId] || null;
}

/**
 * Find option by direct code (e.g. "3.1", "1.2", "2.1") across all menus.
 *
 * @param {string} code
 * @returns {{ menu: object, option: object }|null}
 */
export function findOptionByCode(code) {
  const clean = String(code || '').trim();
  for (const menu of Object.values(MENUS)) {
    for (const opt of menu.options) {
      if (opt.code === clean || opt.key === clean) {
        return { menu, option: opt };
      }
    }
  }
  return null;
}

export default MENUS;

