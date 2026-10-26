/**
 * ========================================================================
 * NOTIFICATION BOT COMMANDS
 * Phase 5: Feature 5 – Automated Notifications System
 * ========================================================================
 *
 * 13 WhatsApp bot commands for managing notifications, rules,
 * scanning, delivery, and analytics.
 *
 * @module NotificationCommands
 * @since Phase 5 Feature 5 – February 2026
 */

import notificationService from '../services/NotificationService.js';

class NotificationCommands {

  // ── Command registry ─────────────────────────────────────────
  static getCommands() {
    return {
      '!notif-rules':      'List all active notification rules',
      '!create-rule':      'Create notification rule (name|trigger|target)',
      '!toggle-rule':      'Enable/disable a rule (!toggle-rule RULE_ID)',
      '!delete-rule':      'Delete a rule (!delete-rule RULE_ID)',
      '!seed-rules':       'Seed default notification rules',
      '!scan-all':         'Run all notification scanners now',
      '!send-pending':     'Process & send all pending notifications',
      '!retry-failed':     'Retry all failed notifications',
      '!notif-stats':      'View notification statistics',
      '!my-notifications': 'View your notifications',
      '!acknowledge':      'Acknowledge a notification (!acknowledge NOTIF_ID)',
      '!snooze':           'Snooze a notification (!snooze NOTIF_ID|hours=4)',
      '!suppress':         'Suppress notifications (!suppress trigger=payment_due|hours=24)'
    };
  }

  // ── Central command router ────────────────────────────────────
  static async handle(command, args, context = {}) {
    try {
      switch (command) {
        case '!notif-rules':      return await this.handleListRules();
        case '!create-rule':      return await this.handleCreateRule(args);
        case '!toggle-rule':      return await this.handleToggleRule(args);
        case '!delete-rule':      return await this.handleDeleteRule(args);
        case '!seed-rules':       return await this.handleSeedRules();
        case '!scan-all':         return await this.handleScanAll();
        case '!send-pending':     return await this.handleSendPending();
        case '!retry-failed':     return await this.handleRetryFailed();
        case '!notif-stats':      return await this.handleStats();
        case '!my-notifications': return await this.handleMyNotifications(context);
        case '!acknowledge':      return await this.handleAcknowledge(args);
        case '!snooze':           return await this.handleSnooze(args);
        case '!suppress':         return await this.handleSuppress(args, context);
        default:
          return `❌ Unknown notification command: ${command}`;
      }
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  // ── Rule management ───────────────────────────────────────────

  static async handleListRules() {
    const result = await notificationService.listRules({ active: true });
    if (!result.success) return `❌ ${result.error}`;
    if (!result.rules.length) return '📋 No active notification rules.\nUse *!seed-rules* to create defaults.';

    let msg = `📋 Notification Rules (${result.total})\n━━━━━━━━━━━━━━━━━━━\n`;
    for (const r of result.rules) {
      const status = r.active ? '🟢' : '🔴';
      msg += `\n${status} *${r.name}*\n`
        + `   ID: \`${r.ruleId}\`\n`
        + `   Trigger: ${r.trigger?.type} (${r.trigger?.daysBeforeEvent || 0} days before)\n`
        + `   Target: ${r.recipients?.target}\n`
        + `   Priority: ${r.priority}\n`
        + `   Sent: ${r.stats?.totalSent || 0}\n`;
    }
    return msg;
  }

  static async handleCreateRule(args) {
    const parsed = this._parseArgs(args);
    if (!parsed.name || !parsed.trigger) {
      return '❌ Usage: *!create-rule* name=Lease Alert|trigger=lease_expiry|target=tenant|days=30|priority=high';
    }

    const data = {
      name: parsed.name,
      trigger: {
        type: parsed.trigger,
        daysBeforeEvent: parseInt(parsed.days) || 7
      },
      recipients: { target: parsed.target || 'tenant' },
      channels: [parsed.channel || 'whatsapp'],
      priority: parsed.priority || 'medium'
    };

    const result = await notificationService.createRule(data);
    if (!result.success) return `❌ ${result.error}`;

    return `✅ Rule Created\n\n`
      + `📋 *${result.rule.name}*\n`
      + `🆔 ${result.ruleId}\n`
      + `⚡ Trigger: ${data.trigger.type}\n`
      + `📅 Days before: ${data.trigger.daysBeforeEvent}\n`
      + `🎯 Target: ${data.recipients.target}\n`
      + `📊 Priority: ${data.priority}`;
  }

  static async handleToggleRule(args) {
    const ruleId = args?.trim();
    if (!ruleId) return '❌ Usage: *!toggle-rule* NR-XXXXX';

    const result = await notificationService.toggleRule(ruleId);
    if (!result.success) return `❌ ${result.error}`;

    return `✅ Rule ${result.active ? 'ENABLED 🟢' : 'DISABLED 🔴'}\n\n`
      + `📋 *${result.rule.name}*\n`
      + `🆔 ${result.rule.ruleId}`;
  }

  static async handleDeleteRule(args) {
    const ruleId = args?.trim();
    if (!ruleId) return '❌ Usage: *!delete-rule* NR-XXXXX';

    const result = await notificationService.deleteRule(ruleId);
    if (!result.success) return `❌ ${result.error}`;

    return `🗑️ Rule Deleted: ${result.deleted}`;
  }

  static async handleSeedRules() {
    const result = await notificationService.seedDefaultRules();
    if (!result.success) return `❌ ${result.error}`;

    return `✅ Default Rules Seeded\n\n`
      + `📝 Created: ${result.created}\n`
      + `⏭️ Skipped (already exist): ${result.skipped}\n`
      + `📊 Total defaults: ${result.total}`;
  }

  // ── Scanning & processing ─────────────────────────────────────

  static async handleScanAll() {
    const result = await notificationService.runAllScanners();
    if (!result.success) return `❌ ${result.error}`;

    let msg = `🔍 Scanner Results\n━━━━━━━━━━━━━━━━━━━\n\n`;

    const scanners = result.results || {};
    for (const [name, res] of Object.entries(scanners)) {
      const icon = res.success ? '✅' : '❌';
      msg += `${icon} ${name}: ${res.generated || 0} generated`;
      if (res.message) msg += ` (${res.message})`;
      msg += '\n';
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━\n📊 Total generated: ${result.totalGenerated}`;
    return msg;
  }

  static async handleSendPending() {
    const result = await notificationService.processPending();
    if (!result.success) return `❌ ${result.error}`;

    const r = result.results;
    return `📤 Pending Processed\n━━━━━━━━━━━━━━━━━━━\n\n`
      + `📊 Total: ${r.total}\n`
      + `✅ Sent: ${r.sent}\n`
      + `❌ Failed: ${r.failed}\n`
      + `⏭️ Skipped: ${r.skipped}`;
  }

  static async handleRetryFailed() {
    const result = await notificationService.retryFailed();
    if (!result.success) return `❌ ${result.error}`;

    const r = result.results;
    return `🔄 Retry Results\n━━━━━━━━━━━━━━━━━━━\n\n`
      + `📊 Total attempted: ${r.total}\n`
      + `✅ Retried successfully: ${r.retried}\n`
      + `❌ Still failing: ${r.stillFailed}`;
  }

  // ── Stats & notifications ────────────────────────────────────

  static async handleStats() {
    const text = await notificationService.getQuickStats();
    return text;
  }

  static async handleMyNotifications(context) {
    const phone = context.senderPhone || context.from;
    if (!phone) return '❌ Could not determine your phone number.';

    const result = await notificationService.getRecipientHistory(phone, { limit: 10 });
    if (!result.success) return `❌ ${result.error}`;
    if (!result.notifications.length) return '📭 No notifications for you.';

    let msg = `📬 Your Notifications (${result.stats.total})\n━━━━━━━━━━━━━━━━━━━\n`;

    for (const n of result.notifications) {
      const statusIcon = {
        pending: '⏳', sent: '📤', delivered: '📬', read: '👁️',
        acknowledged: '✅', failed: '❌', cancelled: '🚫', snoozed: '😴',
        escalated: '🔺', suppressed: '🔇'
      }[n.status] || '❓';

      msg += `\n${statusIcon} *${n.subject || n.triggerType}*\n`
        + `   ID: \`${n.notificationId}\`\n`
        + `   Status: ${n.status}\n`
        + `   ${n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}\n`;
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━\n`
      + `📊 Sent: ${result.stats.sent} | Pending: ${result.stats.pending} | Failed: ${result.stats.failed}`;
    return msg;
  }

  // ── Lifecycle actions ─────────────────────────────────────────

  static async handleAcknowledge(args) {
    const notifId = args?.trim();
    if (!notifId) return '❌ Usage: *!acknowledge* NOTIF-XXXXX';

    const result = await notificationService.acknowledgeNotification(notifId);
    if (!result.success) return `❌ ${result.error}`;

    return `✅ Notification Acknowledged\n🆔 ${result.notification.notificationId}`;
  }

  static async handleSnooze(args) {
    const parsed = this._parseArgs(args);
    const notifId = parsed._positional;
    const hours = parseInt(parsed.hours) || 4;

    if (!notifId) return '❌ Usage: *!snooze* NOTIF-XXXXX|hours=4';

    const result = await notificationService.snoozeNotification(notifId, hours);
    if (!result.success) return `❌ ${result.error}`;

    return `😴 Notification Snoozed\n\n`
      + `🆔 ${result.notification.notificationId}\n`
      + `⏰ Snoozed until: ${result.snoozedUntil ? new Date(result.snoozedUntil).toLocaleString() : 'N/A'}`;
  }

  static async handleSuppress(args, context) {
    const parsed = this._parseArgs(args);
    const phone = parsed.phone || context.senderPhone || context.from;
    const triggerType = parsed.trigger || parsed._positional;
    const hours = parseInt(parsed.hours) || 24;

    if (!phone || !triggerType) return '❌ Usage: *!suppress* trigger=payment_due|hours=24';

    const result = await notificationService.suppressForRecipient(phone, triggerType, hours);
    if (!result.success) return `❌ ${result.error}`;

    return `🔇 Notifications Suppressed\n\n`
      + `📱 Phone: ${result.phone}\n`
      + `⚡ Type: ${result.triggerType}\n`
      + `⏰ Duration: ${result.hours} hours\n`
      + `🔕 Suppressed: ${result.suppressed} notifications`;
  }

  // ── Argument parser ───────────────────────────────────────────
  static _parseArgs(argString) {
    if (!argString || !argString.trim()) return {};
    const result = {};
    const parts = argString.trim().split('|').map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('=')) {
        const eqIdx = part.indexOf('=');
        const key   = part.substring(0, eqIdx).trim().toLowerCase();
        const value = part.substring(eqIdx + 1).trim();
        result[key] = value;
      } else if (!result._positional) {
        result._positional = part;
      }
    }
    return result;
  }
}

export default NotificationCommands;
