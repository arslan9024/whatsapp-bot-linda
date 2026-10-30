/**
 * Command dispatch table for the WhatsApp Command Bridge.
 * Maps "linda <command>" names to bridge handler calls.
 */

import services from '../../core/ServiceRegistry.js';

const callbacks = () => services.get('terminalCallbacks');

/** command -> (bridge, msg, args) => Promise */
export const COMMAND_HANDLERS = {
  help: (b, msg) => msg.reply(b.getHelpText()),
  menu: (b, msg) => b.handleMenu(msg),
  1: (b, msg) => b.handleGroupCommands(msg, '1'),
  2: (b, msg) => b.handleGroupCommands(msg, '2'),
  3: (b, msg) => b.handleGroupCommands(msg, '3'),
  4: (b, msg) => b.handleGroupCommands(msg, '4'),
  recover: (b, msg, args) => b.handleRecover(msg, args),
  restore: (b, msg) => b.handleRestore(msg, callbacks()),
  status: (b, msg) => b.handleStatus(msg),
  health: (b, msg, args) => b.handleHealthStatus(msg, args),
  accounts: (b, msg) => b.handleAccounts(msg),
  stats: (b, msg, args) => b.handleStats(msg, args),
  relink: (b, msg, args) => b.handleRelink(msg, args, callbacks()),
  goraha: (b, msg, args) => b.handleGoraha(msg, args, callbacks()),
  analytics: (b, msg, args) => b.handleAnalytics(msg, args, callbacks()),
  sheets: (b, msg, args) => b.handleSheets(msg, args, callbacks()),
  link: (b, msg, args) => b.handleLink(msg, args, callbacks()),
  list: (b, msg) => b.handleList(msg),
  device: (b, msg, args) => b.handleDevice(msg, args),
  'bridge-stats': (b, msg) => b.handleBridgeStats(msg),
};

/**
 * Parse "linda <command> [args...]". Returns { command, args } where an empty
 * command means help.
 */
export function parseCommand(body, prefix) {
  const afterPrefix = body.substring(prefix.length).trim();
  if (!afterPrefix) {
    return { command: '', args: [] };
  }
  const parts = afterPrefix.split(/\s+/);
  return { command: (parts[0] || '').toLowerCase(), args: parts.slice(1) };
}
