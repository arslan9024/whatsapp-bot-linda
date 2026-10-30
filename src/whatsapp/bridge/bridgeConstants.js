/**
 * Static data for the WhatsApp Command Bridge: command groups,
 * menu/help text and timing constants. No logic lives here.
 */

export const COMMAND_PREFIX = 'linda';
export const POLL_INTERVAL_MS = 60000;
export const OUTPUT_CHUNK_SIZE = 4000;

export const COMMAND_GROUPS = {
  '1': {
    name: 'WhatsApp Features',
    commands: ['health', 'status', 'accounts', 'stats', 'list', 'device', 'link', 'relink', 'recover', 'restore', 'bridge-stats'],
  },
  '2': {
    name: 'Real Estate Database',
    commands: ['analytics', 'metrics', 'sheets', 'database', 'report', 'summary'],
  },
  '3': {
    name: 'GorahaBot',
    commands: ['goraha', 'contacts', 'verify', 'filter', 'search'],
  },
  '4': {
    name: 'Linda Main',
    commands: ['help', 'menu', 'about', 'info', 'settings'],
  },
};

export const MENU_TEXT = `
📋 WhatsApp Command Bridge Menu:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  WhatsApp Features
   health, status, accounts, stats

2️⃣  Real Estate Database  
   analytics, metrics, sheets

3️⃣  GorahaBot
   goraha, contacts, verify

4️⃣  Linda Main
   help, menu, about

🔧 Recovery Commands:
   recover - Manual recovery
   restore - Restore session

💡 Tip: Send "linda <command>"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

export const HELP_TEXT = `
🤖 Linda WhatsApp Bridge
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Monitoring:
• linda health [phone]
• linda status
• linda stats <phone>

Account Management:
• linda accounts
• linda link master [phone name]
• linda relink master|servant <phone>
• linda recover <phone>

Goraha:
• linda goraha [verify|contacts|filter <text>]

Analytics:
• linda analytics [realtime|report|uptime|account <phone>]

Google Sheets:
• linda sheets read|add|update|delete|search|info ...

Diagnostics:
• linda bridge-stats
• linda help
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
