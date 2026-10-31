/**
 * Integration commands: goraha, analytics, sheets (mixin for WhatsAppCommandBridge).
 */

// sub-command -> [callback name, human label]
const SHEETS_ACTIONS = {
  read: ['onGoogleSheetsRead', 'read'],
  add: ['onGoogleSheetsCreate', 'add'],
  update: ['onGoogleSheetsUpdate', 'update'],
  delete: ['onGoogleSheetsDelete', 'delete'],
  search: ['onGoogleSheetsSearch', 'search'],
  info: ['onGoogleSheetsMetadata', 'metadata'],
  metadata: ['onGoogleSheetsMetadata', 'metadata'],
};

export const integrationCommands = {
  async handleGoraha(msg, args = [], callbacks = null) {
    if (!callbacks || !callbacks.onGorahaStatusRequested) {
      await msg.reply('❌ Goraha command not available (callbacks missing).');
      return;
    }
    const sub = (args[0] || 'status').toLowerCase();
    if (sub === 'verify') {
      await callbacks.onGorahaStatusRequested(true);
      await msg.reply('✅ Goraha verification requested.');
      return;
    }
    if (sub === 'filter') {
      const q = args.slice(1).join(' ').trim();
      if (!q) {
        await msg.reply('Usage: linda goraha filter <text>');
        return;
      }
      await callbacks.onGorahaFilterRequested?.(q);
      await msg.reply(`✅ Goraha filter requested: ${q}`);
      return;
    }
    if (sub === 'contacts') {
      await msg.reply('📇 Goraha contacts command accepted.');
      return;
    }
    await callbacks.onGorahaStatusRequested(false);
    await msg.reply('✅ Goraha status requested.');
  },

  async handleAnalytics(msg, args = [], callbacks = null) {
    if (!callbacks || !callbacks.onAnalyticsReportRequested) {
      await msg.reply('❌ Analytics command not available (callbacks missing).');
      return;
    }
    const type = (args[0] || 'realtime').toLowerCase();
    if (type === 'account') {
      const phone = args[1];
      if (!phone) {
        await msg.reply('Usage: linda analytics account <+phone>');
        return;
      }
      await callbacks.onAnalyticsReportRequested('account', phone);
      await msg.reply(`✅ Analytics requested for account ${phone}.`);
      return;
    }
    await callbacks.onAnalyticsReportRequested(type);
    await msg.reply(`✅ Analytics requested: ${type}`);
  },

  async handleSheets(msg, args = [], callbacks = null) {
    if (!args.length) {
      await msg.reply('📄 Google Sheets usage: read|add|update|delete|search|info');
      return;
    }
    const [sub, ...rest] = args;
    if (!callbacks) {
      await msg.reply('❌ Google Sheets command not available (callbacks missing).');
      return;
    }
    const action = SHEETS_ACTIONS[sub.toLowerCase()];
    if (!action) {
      await msg.reply(`❌ Unknown sheets sub-command: ${sub}`);
      return;
    }
    const [callbackName, label] = action;
    if (label === 'read' && !rest[0]) {
      await msg.reply('Usage: linda sheets read <spreadsheetId>');
      return;
    }
    if (!callbacks[callbackName]) {
      await msg.reply(`❌ Google Sheets ${label} not available (callback missing).`);
      return;
    }
    await callbacks[callbackName](...rest);
    await msg.reply(`✅ Sheets ${label} requested.`);
  },
};

