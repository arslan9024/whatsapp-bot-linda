/**
 * ====================================================================
 * LEGACY COMMAND HANDLERS
 * ====================================================================
 * Handlers for slash commands (/admin, /report, /dashboard) and
 * Goraha verification in incoming WhatsApp messages.
 *
 * Operating Lane: WhatsApp Client & Protocols / API & Integrations
 *
 * @since Phase 11 / Phase 32 — February 2026
 */

import services from '../../core/ServiceRegistry.js';
import GorahaContactVerificationService from '../../integrations/goraha/GorahaContactVerificationService.js';

/**
 * Handle administrative slash commands (/admin ...)
 */
export async function handleAdminCommand(msg, { adminConfigModule, analyticsModule, getAllConnectionDiagnostics }) {
  const isAdmin = adminConfigModule.verifyAdminAccess(msg.from).authorized;
  if (!isAdmin) {
    await msg.reply('❌ Not authorized for admin commands');
    return;
  }

  const parts = msg.body.split(' ');
  const action = parts[1];
  const value = parts.slice(2).join(' ');

  try {
    switch (action) {
      case 'toggle-handler': {
        const result = adminConfigModule.toggleHandler(value);
        await msg.reply(`✅ Handler ${value}: ${result.enabled ? 'ENABLED ✅' : 'DISABLED 🔴'}`);
        break;
      }
      case 'get-stats': {
        if (analyticsModule) {
          const snapshot = analyticsModule.getDashboardSnapshot();
          await msg.reply(`📊 Bot Stats:\n\nMessages: ${snapshot.metrics.messages.total}\nHandlers: ${snapshot.metrics.handlers.totalInvocations}\n✅ Success Rate: ${snapshot.metrics.handlers.successRate}`);
        }
        break;
      }
      case 'list-perms': {
        const perms = adminConfigModule.listPermissions(msg.from);
        await msg.reply(`👤 Your permissions:\n${Object.entries(perms).map(([k, v]) => `${k}: ${v ? '✅' : '❌'}`).join('\n')}`);
        break;
      }
      case 'get-health': {
        const diags = getAllConnectionDiagnostics();
        if (diags.length === 0) {
          await msg.reply('📊 No connection managers active');
          break;
        }
        let healthText = '📊 *CONNECTION HEALTH REPORT*\n━━━━━━━━━━━━━━━━━━━━━━━━\n';
        for (const d of diags) {
          const icon = d.isConnected ? '🟢' : d.state === 'SUSPENDED' ? '⛔' : '🔴';
          healthText += `\n${icon} *${d.phoneNumber}*\n`;
          healthText += `  State: ${d.state} | Uptime: ${d.uptime}\n`;
          healthText += `  Connections: ${d.totalConnections} | Disconnects: ${d.totalDisconnections}\n`;
          healthText += `  Reconnects: ${d.totalReconnects} | Errors: ${d.totalErrors}\n`;
          healthText += `  QR Codes: ${d.qrCodesGenerated} | Browser Kills: ${d.browserProcessKills}\n`;
          healthText += `  Avg Session: ${d.averageSessionDuration}\n`;
        }
        await msg.reply(healthText);
        break;
      }
      case 'set-perm': {
        const [targetPhone, perm, val] = value.split(' ');
        const success = adminConfigModule.setPermission(targetPhone, perm, val === 'true');
        await msg.reply(`Permission ${perm} for ${targetPhone}: ${success ? 'UPDATED' : 'FAILED'}`);
        break;
      }
      case 'help': {
        const helpText = `🛠️ *Admin Commands:*\n\n` +
          `• /admin toggle-handler <name> - Enable/disable handler\n` +
          `• /admin get-stats - View bot statistics\n` +
          `• /admin get-health - Detailed connection health\n` +
          `• /admin list-perms - View your permissions\n` +
          `• /admin set-perm <phone> <perm> <true|false> - Set permission\n` +
          `• /admin help - Show this help`;
        await msg.reply(helpText);
        break;
      }
      default:
        await msg.reply(`❓ Unknown admin action: ${action}\nTry: /admin help`);
    }
  } catch (error) {
    await msg.reply(`❌ Admin command error: ${error.message}`);
  }
}

/**
 * Handle report slash commands (/report ...)
 */
export async function handleReportCommand(msg, reportGeneratorModule) {
  const parts = msg.body.split(' ');
  const reportType = parts[1]?.toLowerCase();

  try {
    let report;
    switch (reportType) {
      case 'daily':
        report = reportGeneratorModule.generateDailyReport();
        break;
      case 'weekly':
        report = reportGeneratorModule.generateWeeklyReport();
        break;
      case 'monthly':
        report = reportGeneratorModule.generateMonthlyReport();
        break;
      default:
        await msg.reply('❓ Report type: daily, weekly, or monthly\nUsage: /report daily');
        return;
    }

    const summary = report.summary;
    await msg.reply(`📊 ${reportType.toUpperCase()} REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 ${summary.description}
💬 Messages: ${summary.metrics.totalMessages}
👥 Users: ${summary.metrics.uniqueUsers}
⚙️ Handlers: ${summary.metrics.totalHandlers}
✅ Success Rate: ${summary.metrics.successRate}
❌ Errors: ${summary.metrics.errorCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  } catch (error) {
    await msg.reply(`❌ Report error: ${error.message}`);
  }
}

/**
 * Handle dashboard slash command (/dashboard)
 */
export async function handleDashboardCommand(msg, analyticsModule) {
  try {
    const snapshot = analyticsModule.getDashboardSnapshot();
    await msg.reply(`📊 ANALYTICS DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ ${new Date(snapshot.timestamp).toLocaleTimeString()}
💬 Messages: ${snapshot.metrics.messages.total}
👥 Users: Object.keys(snapshot.metrics.messages.byUser).length
🎯 Health: ${snapshot.systemHealth.status} (${snapshot.systemHealth.score}%)
❌ Errors: ${snapshot.systemHealth.errorCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  } catch (error) {
    await msg.reply(`❌ Dashboard error: ${error.message}`);
  }
}

/**
 * Handle Goraha verification (!verify-goraha)
 */
export async function handleGorahaVerification(msg, client, gorahaRef, logBot) {
  logBot('📌 Goraha verification requested', 'info');

  try {
    if (!gorahaRef.current) {
      gorahaRef.current = new GorahaContactVerificationService(client);
      await gorahaRef.current.initialize();
      logBot('✅ GorahaContactVerificationService initialized', 'success');
      services.register('gorahaVerificationService', gorahaRef.current);
    }

    await msg.reply('🔍 Starting Goraha contact verification...\nThis may take a few minutes.\nI\'ll send results when complete.');
    logBot('Starting Goraha verification for all contacts...', 'info');

    const report = await gorahaRef.current.verifyAllContacts({
      autoFetch: true,
      checkWhatsApp: true,
      saveResults: true,
    });

    gorahaRef.current.printReport(report);

    const summary = report.summary;
    let resultMessage = '✅ GORAHA VERIFICATION COMPLETE\n\n';
    resultMessage += '📊 Summary:\n';
    resultMessage += `• Contacts Checked: ${summary.totalContacts}\n`;
    resultMessage += `• Valid Numbers: ${summary.validPhoneNumbers}\n`;
    resultMessage += `• With WhatsApp: ${summary.withWhatsApp}\n`;
    resultMessage += `• WITHOUT WhatsApp: ${summary.withoutWhatsApp}\n`;
    resultMessage += `• Coverage: ${summary.percentageWithWhatsApp}\n`;

    if (summary.withoutWhatsApp > 0) {
      resultMessage += `\n⚠️ ${summary.withoutWhatsApp} number(s) need attention\n`;
      const numbersList = gorahaRef.current.getNumbersSansWhatsApp();
      if (numbersList.length > 0 && numbersList.length <= 10) {
        resultMessage += '\nNumbers without WhatsApp:\n';
        numbersList.forEach((item, idx) => {
          resultMessage += `${idx + 1}. ${item.name}: ${item.number}\n`;
        });
      } else if (numbersList.length > 10) {
        resultMessage += `\nToo many to list (${numbersList.length} total). Check logs.\n`;
      }
    } else {
      resultMessage += '\n✅ All contacts have WhatsApp accounts!';
    }

    await msg.reply(resultMessage);
    logBot('Verification results sent to user', 'success');
  } catch (error) {
    logBot(`❌ Verification error: ${error.message}`, 'error');
    await msg.reply(`❌ Verification failed: ${error.message}`);
  }
}

