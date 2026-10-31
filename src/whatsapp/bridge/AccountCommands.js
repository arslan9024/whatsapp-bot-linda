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
    if (!args.length) {
      await msg.reply('Usage: linda add master <+phone> [name] | linda add device <+phone> [name]');
      return;
    }

    let [target, phone, ...nameParts] = args;
    let name = nameParts.join(' ').trim();

    // Support: linda add +971505110636 [name] or linda link +971505110636 [name]
    if (String(target).startsWith('+') || /^\d{10,15}$/.test(target)) {
      phone = target;
      target = 'master';
      name = [args[1], ...args.slice(2)].filter(Boolean).join(' ').trim();
    }

    if ((target === 'master' || target === 'device') && phone) {
      if (callbacks?.onAddNewMaster) {
        await callbacks.onAddNewMaster(phone, name);
      } else {
        const acm = services.get('accountConfigManager');
        if (acm) {
          const res = await acm.addMasterAccount(phone, name);
          if (res.success) {
            services.get('closedCircleGuard')?.invalidateCache?.();
            await msg.reply(`✅ Added ${phone}${name ? ` (${name})` : ''} to closed circle master list.`);
            return;
          } else if (res.error?.includes('already in use')) {
            await msg.reply(`ℹ️ ${phone} is already in closed circle master list.`);
            return;
          } else {
            await msg.reply(`❌ Failed to add: ${res.error}`);
            return;
          }
        }
      }
      await msg.reply(`✅ Add master requested for ${phone}.`);
      return;
    }

    if (target === 'master') {
      await callbacks?.onLinkMaster?.();
      await msg.reply('✅ Link master requested.');
      return;
    }

    await msg.reply('Usage: linda add master <+phone> [name] | linda add device <+phone> [name]');
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

