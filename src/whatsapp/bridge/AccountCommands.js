/**
 * Account management commands: relink, link, restore (mixin for WhatsAppCommandBridge).
 */

const RELINK_USAGE = 'Usage: linda relink master [phone] | linda relink servant <phone> | linda relink <phone>';

export const accountCommands = {
  async handleRelink(msg, args = [], callbacks = null) {
    if (!callbacks) {
      await msg.reply('❌ Relink command not available (callbacks missing).');
      return;
    }
    if (!args.length) {
      await msg.reply(RELINK_USAGE);
      return;
    }
    const [target, maybePhone] = args;
    if (target === 'master') {
      await callbacks.onRelinkMaster?.(maybePhone);
      await msg.reply('✅ Relink master requested.');
      return;
    }
    if (target === 'servant') {
      if (!maybePhone) {
        await msg.reply('Usage: linda relink servant <+phone>');
        return;
      }
      await callbacks.onRelinkServant?.(maybePhone);
      await msg.reply(`✅ Relink servant requested for ${maybePhone}.`);
      return;
    }
    if (String(target).startsWith('+')) {
      await callbacks.onRelinkDevice?.(target);
      await msg.reply(`✅ Relink requested for ${target}.`);
      return;
    }
    await msg.reply(RELINK_USAGE);
  },

  async handleLink(msg, args = [], callbacks = null) {
    if (!callbacks) {
      await msg.reply('❌ Link command not available (callbacks missing).');
      return;
    }
    const [target, phone, ...nameParts] = args;
    if (target === 'master' && phone) {
      await callbacks.onAddNewMaster?.(phone, nameParts.join(' '));
      await msg.reply(`✅ Add master requested for ${phone}.`);
      return;
    }
    if (target === 'master') {
      await callbacks.onLinkMaster?.();
      await msg.reply('✅ Link master requested.');
      return;
    }
    await msg.reply('Usage: linda link master [<+phone> <name>]');
  },

  async handleRestore(msg, callbacks = null) {
    if (!callbacks || !callbacks.onRestoreAllSessions) {
      await msg.reply('❌ Restore command not available (callbacks missing).');
      return;
    }
    await callbacks.onRestoreAllSessions();
    await msg.reply('✅ Restore-all-sessions requested.');
  },
};

