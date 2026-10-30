/**
 * Menu / help commands (mixin for WhatsAppCommandBridge).
 */

import { COMMAND_GROUPS, MENU_TEXT, HELP_TEXT } from './bridgeConstants.js';

export const menuCommands = {
  async handleMenu(msg) {
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
