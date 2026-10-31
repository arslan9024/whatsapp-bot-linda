/**
 * Menu / help commands (mixin for WhatsAppCommandBridge).
 */

import { COMMAND_GROUPS, MENU_TEXT, HELP_TEXT } from './bridgeConstants.js';
import services from '../../core/ServiceRegistry.js';

export const menuCommands = {
  async handleMenu(msg) {
    const keypad = services.get('keypadDashboardService');
    if (keypad) {
      await keypad.handleMessage(msg);
      return;
    }
    await msg.reply(MENU_TEXT);
  },

  async handleGroupCommands(msg, group) {
    const groupInfo = COMMAND_GROUPS[group];
    if (!groupInfo) {
      await msg.reply('❌ Invalid group. Send "linda menu" for options.');
      return;
    }
    await msg.reply(`📁 ${groupInfo.name}:\n${groupInfo.commands.join(', ')}`);
  },

  getHelpText() {
    return HELP_TEXT;
  },
};

