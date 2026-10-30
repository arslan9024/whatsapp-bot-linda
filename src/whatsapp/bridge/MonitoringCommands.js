/**
 * Read-only monitoring commands: recover, status, health, accounts, stats,
 * list, device, bridge-stats (mixin for WhatsAppCommandBridge).
 */

import { isPrimaryMasterLinked } from './bridgeUtils.js';

export const monitoringCommands = {
  async handleRecover(msg, args = []) {
    if (!args.length) {
      await msg.reply('Usage: linda recover <+phone>');
      return;
    }
    const phone = args[0];
    if (!this.deviceLinkedManager?.getDevice?.(phone)) {
      await msg.reply(`❌ Device not found: ${phone}`);
      return;
    }
    await msg.reply(`🔄 Recovery requested for ${phone}`);
    const success = await this.autoRecoverPrimaryMaster();
    await msg.reply(success ? '✅ Recovery completed.' : '⚠️ Recovery attempted. Check terminal for details.');
  },

  async handleStatus(msg) {
    const masterPhone = this.accountConfigManager?.getMasterPhoneNumber();
    const isLinked = isPrimaryMasterLinked(this.accountConfigManager, this.deviceLinkedManager);
    await msg.reply(`
📊 WhatsApp Bridge Status:
━━━━━━━━━━━━━━━━━━━━━
• Bot Active: ${this.botActive ? '✅ Yes' : '❌ No'}
• Master: ${masterPhone || 'Not set'}
• Linked: ${isLinked ? '✅ Yes' : '❌ No'}
• Recovery: ${this.recoveryInProgress ? '🔄 In Progress' : '✅ Idle'}
• Polling: ${this.pollingInterval ? '✅ Active' : '❌ Stopped'}
━━━━━━━━━━━━━━━━━━━━━
`);
  },

  async handleHealthStatus(msg, args = []) {
    if (args.length) {
      if (!this.deviceLinkedManager?.getDevice) {
        await msg.reply('❌ Device health not available (device manager missing).');
        return;
      }
      const phone = args[0];
      const device = this.deviceLinkedManager.getDevice(phone);
      if (!device) {
        await msg.reply(`❌ Device not found: ${phone}`);
        return;
      }
      const score = this._calculateHealthScore(device);
      await msg.reply(`📊 Health for ${phone}\nOnline: ${device.isOnline ? 'Yes' : 'No'}\nStatus: ${device.status || 'unknown'}\nScore: ${score}/100`);
      return;
    }
    if (this.terminalHealthDashboard?.displayHealthDashboard) {
      const out = await this.captureOutput(() => this.terminalHealthDashboard.displayHealthDashboard());
      await this.sendOutput(msg, out, 'HEALTH DASHBOARD unavailable');
      return;
    }
    await msg.reply('❌ Health dashboard not available.');
  },

  async handleAccounts(msg) {
    if (!this.accountConfigManager?.getAllAccounts) {
      await msg.reply('❌ Account configuration not available.');
      return;
    }
    const accounts = this.accountConfigManager.getAllAccounts() || [];
    if (!accounts.length) {
      await msg.reply('ℹ️ No accounts configured.');
      return;
    }
    const lines = accounts.map((a) => {
      const device = this.deviceLinkedManager?.getDevice?.(a.phoneNumber);
      const icon = device?.isOnline ? '🟢' : '🔴';
      return `${icon} ${a.displayName} (${a.phoneNumber}) [${a.role || 'unknown'}]`;
    });
    await msg.reply(`📱 Accounts (${accounts.length})\n${lines.join('\n')}`);
  },

  async handleStats(msg, args = []) {
    if (!args.length) {
      await msg.reply('Usage: linda stats <+phone>');
      return;
    }
    const phone = args[0];
    const device = this.deviceLinkedManager?.getDevice?.(phone);
    if (!device) {
      await msg.reply(`❌ Device not found: ${phone}`);
      return;
    }
    await msg.reply(
      `📈 Stats for ${phone}\n` +
      `Status: ${device.isOnline ? 'Online' : 'Offline'}\n` +
      `Uptime: ${this._formatUptime(device.uptime || 0)}\n` +
      `Heartbeats: ${device.heartbeatCount || 0}\n` +
      `Attempts: ${device.linkAttempts || 0}/${device.maxLinkAttempts || 5}`
    );
  },

  async handleList(msg) {
    if (!this.terminalHealthDashboard?.listAllDevices) {
      await msg.reply('❌ Device list not available.');
      return;
    }
    const out = await this.captureOutput(() => this.terminalHealthDashboard.listAllDevices());
    await this.sendOutput(msg, out, 'Device list unavailable');
  },

  async handleDevice(msg, args = []) {
    if (!args.length) {
      await msg.reply('Usage: linda device <+phone>');
      return;
    }
    const phone = args[0];
    if (!this.terminalHealthDashboard?.displayDeviceDetails) {
      await msg.reply('❌ Device details not available.');
      return;
    }
    const out = await this.captureOutput(() => this.terminalHealthDashboard.displayDeviceDetails(phone));
    await this.sendOutput(msg, out, `No device details for ${phone}`);
  },

  async handleBridgeStats(msg) {
    const topCommands = Object.entries(this.stats.commandsByName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name}: ${count}`)
      .join(', ') || 'none';

    await msg.reply(
      `📊 Bridge Stats\n` +
      `Total commands: ${this.stats.totalCommands}\n` +
      `Errors: ${this.stats.errors}\n` +
      `Last command: ${this.stats.lastCommand || 'none'}\n` +
      `Top commands: ${topCommands}`
    );
  },
};
