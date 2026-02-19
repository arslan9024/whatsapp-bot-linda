/**
 * ====================================================================
 * MESSAGE ROUTER (Extracted from index.js)
 * ====================================================================
 * Binds all WhatsApp client event handlers for messages, reactions,
 * group events, admin commands, reports, and dashboards.
 *
 * Eliminates the 367-line inline function and all its hidden dependencies
 * on module-level variables. Everything is injected via `deps`.
 *
 * @since Phase 11 – February 14, 2026
 */

import { ReactionHandler } from './Handlers/ReactionHandler.js';
import { GroupEventHandler } from './Handlers/GroupEventHandler.js';
import GorahaContactVerificationService from './GorahaContactVerificationService.js';
import services from '../utils/ServiceRegistry.js';

/**
 * @typedef {Object} MessageRouterDeps
 * @property {Function}      logBot                   - (msg, level) => void
 * @property {object|null}    analyticsModule          - AnalyticsDashboard or null
 * @property {object|null}    adminConfigModule        - AdminConfigInterface or null
 * @property {object|null}    commandHandler           - LindaCommandHandler or null
 * @property {object|null}    reportGeneratorModule    - ReportGenerator or null
 * @property {object|null}    accountConfigManager     - AccountConfigManager or null
 * @property {object|null}    deviceLinkedManager      - DeviceLinkedManager or null
 * @property {object|null}    keepAliveManager         - SessionKeepAliveManager or null
 * @property {object|null}    clientHealthMonitor      - ClientHealthMonitor for frame/heartbeat recovery
 * @property {object|null}    contactHandlerRef        - { current: ContactLookupHandler|null }
 * @property {object|null}    gorahaRef                - { current: GorahaService|null }
 * @property {Map}            accountClients           - phone → client
 * @property {Function}       getAllConnectionDiagnostics - () => Array
 * @property {object|null}    analyticsManager         - AnalyticsManager for metrics (Phase 29e)
 * @property {object|null}    uptimeTracker            - UptimeTracker for SLA (Phase 29e)
 * @property {object|null}    reportGenerator          - ReportGenerator for exports (Phase 29e)
 * @property {object|null}    metricsDashboard         - MetricsDashboard for display (Phase 29e)
 */

/**
 * Bind message and event listeners for a WhatsApp client.
 *
 * @param {object}      client      - whatsapp-web.js Client
 * @param {string}      phoneNumber - Account phone number
 * @param {object|null} connManager - ConnectionManager for activity tracking
 * @param {MessageRouterDeps} deps  - Injected dependencies
 */
export function setupMessageListeners(client, phoneNumber = 'Unknown', connManager = null, deps = {}) {
  const {
    logBot,
    analyticsModule,
    adminConfigModule,
    commandHandler,
    reportGeneratorModule,
    accountConfigManager,
    deviceLinkedManager,
    keepAliveManager,
    clientHealthMonitor,             // NEW: Frame detachment & heartbeat monitor
    contactHandlerRef,
    gorahaRef,
    accountClients,
    getAllConnectionDiagnostics,
    analyticsManager,               // NEW: Phase 29e - Metrics collection
    uptimeTracker,                  // NEW: Phase 29e - Uptime tracking
    reportGenerator,                // NEW: Phase 29e - Report generation
    metricsDashboard,               // NEW: Phase 29e - Metrics display
  } = deps;

  // ═══ LISTENER CLEANUP (Phase 10) ═══
  const messageEvents = ['message', 'message_reaction', 'group_update', 'group_join', 'group_leave'];
  for (const event of messageEvents) {
    try { client.removeAllListeners(event); } catch (_) { /* best effort */ }
  }
  logBot(`🧹 Cleaned message listeners for ${phoneNumber} before rebind`, 'info');

  // ─── Activity tracking ─────────────────────────────────────────────
  if (connManager) {
    client.on('message', () => connManager.recordActivity());
  }

  // ─── Phase 1 Event Handlers (singletons) ───────────────────────────
  const reactionHandlerInstance = services.get('reactionHandler') || new ReactionHandler(null);
  const groupHandlerInstance = services.get('groupEventHandler') || new GroupEventHandler(null);

  client.on('message_reaction', async (reaction) => {
    try {
      await reactionHandlerInstance.handleReaction(reaction);
      logBot(`✅ Reaction tracked: ${reaction.reaction} on message ${reaction.msg.id.id}`, 'success');
    } catch (error) {
      logBot(`❌ Error handling reaction: ${error.message}`, 'error');
    }
  });

  client.on('group_update', async (notification) => {
    try {
      await groupHandlerInstance.handleGroupUpdate(notification);
      logBot(`✅ Group update tracked: ${notification.chatId}`, 'success');
    } catch (error) {
      logBot(`❌ Error handling group update: ${error.message}`, 'error');
    }
  });

  client.on('group_join', async (notification) => {
    try {
      await groupHandlerInstance.handleGroupJoin(notification);
      logBot(`✅ Group join tracked: ${notification.contact.length} member(s) joined`, 'success');
    } catch (error) {
      logBot(`❌ Error handling group join: ${error.message}`, 'error');
    }
  });

  client.on('group_leave', async (notification) => {
    try {
      await groupHandlerInstance.handleGroupLeave(notification);
      logBot(`✅ Group leave tracked: ${notification.contact.length} member(s) left`, 'success');
    } catch (error) {
      logBot(`❌ Error handling group leave: ${error.message}`, 'error');
    }
  });

  logBot(`✅ Phase 1 event handlers bound for ${phoneNumber}`, 'success');

  // ─── Main message handler ─────────────────────────────────────────
  client.on('message', async (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    const from = msg.from.includes('@g.us') ? `Group: ${msg.from}` : `User: ${msg.from}`;

    // Keep-alive activity
    if (keepAliveManager) keepAliveManager.updateLastActivity(phoneNumber);

    // NEW: Record message metric (Phase 29e)
    if (analyticsManager) {
      analyticsManager.recordMessage(phoneNumber, {
        type: msg.type,
        fromMe: msg.fromMe,
        isGroup: msg.isGroupMsg,
        timestamp: new Date(),
      });
    }

    logBot(`📨 [${timestamp}] (${phoneNumber}) ${from}: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? '...' : ''}`, 'info');

    try {
      // ── Analytics tracking ──────────────────────────────────────
      if (analyticsModule) {
        analyticsModule.trackMessage(msg, {
          type: msg.type,
          fromMe: msg.fromMe,
          isGroup: msg.isGroupMsg,
          timestamp: new Date(),
          phoneNumber,
        });
      }

      // ── Authorization check ─────────────────────────────────────
      if (adminConfigModule && !adminConfigModule.isUserAuthorized(msg.from)) {
        logBot(`⚠️  Unauthorized user attempt: ${msg.from}`, 'warn');
      }

      // ── Master account detection ────────────────────────────────
      const masterPhone = accountConfigManager?.getMasterPhoneNumber();
      const isMasterAccount = phoneNumber === masterPhone;

      // ── Linda AI command system (master only) ───────────────────
      if (isMasterAccount && commandHandler && msg.body.startsWith('!')) {
        const context = {
          deviceCount: deviceLinkedManager ? deviceLinkedManager.getLinkedDevices().length : 0,
          accountCount: accountClients?.size || 0,
          client,
          phoneNumber,
          isMasterAccount: true,
        };

        const cmdResult = await commandHandler.processMessage(msg, phoneNumber, context);
        if (cmdResult.processed) {
          logBot(`✅ Command processed: ${cmdResult.command}`, 'success');
          return;
        } else if (cmdResult.isCommand) {
          return;
        }
      } else if (!isMasterAccount && msg.body.startsWith('!')) {
        logBot(`📩 Command on secondary account: ${msg.body.substring(0, 30)}`, 'info');
        if (masterPhone) {
          await msg.reply('📢 Commands are processed by the master account.\n\nYou can still send messages to the master account for help!');
        }
        return;
      }

      // ── /admin commands ─────────────────────────────────────────
      if (msg.body.startsWith('/admin ') && adminConfigModule) {
        await handleAdminCommand(msg, { adminConfigModule, analyticsModule, getAllConnectionDiagnostics, logBot });
        return;
      }

      // ── /report commands ────────────────────────────────────────
      if (msg.body.startsWith('/report ') && reportGeneratorModule) {
        await handleReportCommand(msg, reportGeneratorModule);
        return;
      }

      // ── /dashboard command ──────────────────────────────────────
      if (msg.body === '/dashboard' && analyticsModule) {
        await handleDashboardCommand(msg, analyticsModule);
        return;
      }

      // ── Conversation analysis (master only) ─────────────────────
      if (isMasterAccount) {
        // Conversation type analysis
        try {
          if (typeof logMessageTypeCompact === 'function') {
            logMessageTypeCompact(msg);
          }
        } catch (_) { /* silent */ }

        // Contact lookup
        try {
          if (contactHandlerRef?.current && !msg.from.includes('@g.us')) {
            const contact = await contactHandlerRef.current.getContact(msg.from);
            if (contact) {
              logBot(`✅ Contact: ${contact.displayName || contact.phoneNumber}`, 'success');
            }
          }
        } catch (error) {
          logBot(`⚠️ Contact lookup error: ${error.message}`, 'warn');
        }

        // Goraha verification
        if (msg.body === '!verify-goraha') {
          await handleGorahaVerification(msg, client, gorahaRef, logBot);
        }
      }
    } catch (error) {
      logBot(`Error processing message: ${error.message}`, 'error');
      
      // NEW: Record error metric (Phase 29e)
      if (analyticsManager) {
        analyticsManager.recordError(phoneNumber, {
          type: 'message_processing',
          message: error.message,
          timestamp: new Date(),
        });
      }
      
      // NEW: Detect and report frame detachment errors to health monitor
      if (clientHealthMonitor && error.message.includes('detached')) {
        logBot(`🚨 Frame detachment detected on ${phoneNumber}`, 'warn');
        clientHealthMonitor.recordFrameDetachment(phoneNumber, error);
      }
    }
  });

  logBot(`✅ Message listeners ready for ${phoneNumber}`, 'success');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE HANDLER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function handleAdminCommand(msg, { adminConfigModule, analyticsModule, getAllConnectionDiagnostics, logBot }) {
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
          if (d.lastError) healthText += `  Last Error: ${d.lastError.substring(0, 60)}\n`;
        }
        const mem = process.memoryUsage();
        healthText += `\n💻 *System*: Heap ${Math.round(mem.heapUsed / 1024 / 1024)}MB | PID ${process.pid}`;
        await msg.reply(healthText);
        break;
      }
      default:
        await msg.reply('❓ Unknown admin command. Try: toggle-handler, get-stats, list-perms, get-health');
    }
  } catch (error) {
    await msg.reply(`❌ Admin error: ${error.message}`);
  }
}

async function handleReportCommand(msg, reportGeneratorModule) {
  const reportType = msg.body.split(' ')[1] || 'daily';

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

async function handleDashboardCommand(msg, analyticsModule) {
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

async function handleGorahaVerification(msg, client, gorahaRef, logBot) {
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
