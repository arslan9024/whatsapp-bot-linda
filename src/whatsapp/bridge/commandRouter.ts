// @ts-nocheck
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
  dashboard: (b, msg) => b.handleMenu(msg),
  ask: async (b, msg, args) => {
    const text = args.join(' ').trim();
    if (!text) {
      await msg.reply('👋 Hi! Tell me what you need, e.g.: "linda ask what is the price range in Vardon?" or "linda ask can we check owner stats?"');
      return;
    }
    const gen = services.get('advancedResponseGenerator');
    if (gen) {
      const reply = await gen.generateResponse(text, { sender: msg.from, role: 'admin' });
      await msg.reply(`🤖 Linda:\n${reply}`);
    } else {
      await msg.reply(`🤖 Linda: I received your message: "${text}". My intelligence core is active.`);
    }
  },
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
  add: (b, msg, args) => b.handleLink(msg, args, callbacks()),
  list: (b, msg) => b.handleList(msg),
  device: (b, msg, args) => b.handleDevice(msg, args),
  'bridge-stats': (b, msg) => b.handleBridgeStats(msg),
  outreach: async (b, msg, args) => {
    const dashboard = services.get('terminalHealthDashboard');
    if (!dashboard?.outreachCommand) {
      await msg.reply('❌ Outreach module not ready.');
      return;
    }
    const sub = (args[0] || '').toLowerCase();
    if (sub === 'daily') {
      const proj = args[1] || 'VARDON';
      await msg.reply(`⏳ Generating daily outreach plan for ${proj}...`);
      const plan = await dashboard.outreachCommand.daily?.run('draft', proj);
      await msg.reply(plan ? `✅ Plan ready. Today: ${plan.totals.today} owners | Held: ${plan.totals.waiting}` : '⚠️ No plan generated.');
    } else if (sub === 'status' || !sub) {
      const desc = dashboard.outreachCommand.daily?.describe?.() || 'Daily outreach active.';
      await msg.reply(`📋 Outreach Status:\n${desc}`);
    } else {
      await msg.reply('Usage: linda outreach [status|daily <project>]');
    }
  },
  clear: async (b, msg) => {
    await msg.reply('✨ Linda Command Bridge is online and responsive.');
  },
  reset: async (b, msg) => {
    const gemini = services.get('geminiChatService');
    if (gemini) {
      const result = gemini.clearMemory(msg.from);
      await msg.reply(`🔄 ${result}`);
    } else {
      await msg.reply('🔄 Conversation reset (no active AI session).');
    }
  },

  templates: async (b, msg, args) => {
    try {
      const { default: templateEngine } = await import('../../outreach/DynamicOutreachTemplateEngine.js');
      const templates = templateEngine.listTemplates();
      const lines = [
        '📋 *Linda Outreach Template Library*',
        '',
        `Total Active Templates: ${templates.length}`,
        '',
      ];
      templates.forEach((t, i) => {
        lines.push(`${i + 1}. *${t.id}* [${t.language}]`);
        lines.push(`   Cluster: ${t.cluster} | Purpose: ${t.purpose}`);
      });
      lines.push('');
      lines.push('💡 Type "linda preview <templateId> <name>" to sample a generated message.');
      await msg.reply(lines.join('\n'));
    } catch (e) {
      await msg.reply(`❌ Templates error: ${e.message}`);
    }
  },

  preview: async (b, msg, args) => {
    const templateId = args[0] || 'VARDON_VALUATION_EN';
    const name = args.slice(1).join(' ') || 'Rashid';
    try {
      const { default: templateEngine } = await import('../../outreach/DynamicOutreachTemplateEngine.js');
      const sample = templateEngine.generateOutreachMessage(templateId, { firstName: name, cluster: 'Vardon' });
      await msg.reply([
        `🔍 *Template Preview: ${templateId}* [${sample.language}]`,
        `🎯 *Variations Available:* ${sample.variationsAvailable}`,
        '',
        '💬 *Sample Message Output:*',
        `"${sample.messageText}"`,
      ].join('\n'));
    } catch (e) {
      await msg.reply(`❌ Preview error: ${e.message}`);
    }
  },

  schedule: async (b, msg) => {
    try {
      const { default: schedulePacer } = await import('../../outreach/LiveCampaignSchedulePacer.js');
      const status = schedulePacer.isWithinCompliantHours();
      const lines = [
        '⏰ *Dubai Cadence Campaign Schedule Guard*',
        '',
        `🕐 *Current GST Hour:* ${status.currentHourGST}:00 GST`,
        `🛡️ *Compliant Hours:* ${schedulePacer.workingHoursStart}:00 - ${schedulePacer.workingHoursEnd}:00 GST`,
        `🚦 *Status:* ${status.isAllowed ? '🟢 ALLOWED (Within compliant hours)' : '🔴 PAUSED (Outside compliant hours)'}`,
        '',
        `⏱️ *Randomized Jitter Gap:* ${schedulePacer.minGapMinutes}–${schedulePacer.maxGapMinutes} minutes`,
        `📅 *Daily Safety Ceiling:* ${schedulePacer.dailyLimit} owners/day`,
      ];
      await msg.reply(lines.join('\n'));
    } catch (e) {
      await msg.reply(`❌ Schedule guard error: ${e.message}`);
    }
  },
  pool: async (b, msg) => {
    try {
      const poolModule = await import('../../outreach/WhatsAppDispatchPool.js');
      const pool = poolModule.default || poolModule.WhatsAppDispatchPool;
      const snapshot = pool.getPoolStatus();
      const lines = [
        '🔄 *WhatsApp Dispatch Pool Status*',
        '',
        `📱 *Total Accounts:* ${snapshot.totalAccounts}`,
        `🟢 *Active Accounts:* ${snapshot.activeAccounts}`,
        `📬 *Eligible Accounts:* ${snapshot.eligibleAccounts}`,
        '',
        '*Account Details:*',
      ];
      snapshot.accounts.forEach(acc => {
        lines.push(`• ${acc.phone}: ${acc.active ? '🟢 ACTIVE' : '🔴 INACTIVE'} | Today: ${acc.dailyCount} (Remaining: ${acc.remainingDaily})`);
      });
      await msg.reply(lines.join('\n'));
    } catch (e) {
      await msg.reply(`❌ Dispatch Pool error: ${e.message}`);
    }
  },

  classify: async (b, msg, args) => {
    const query = args.join(' ').trim();
    if (!query) {
      await msg.reply('Usage: linda classify <client message text>');
      return;
    }
    try {
      const catModule = await import('../../outreach/InboundIntentCategorizer.js');
      const categorizer = catModule.default || catModule.InboundIntentCategorizer;
      const result = categorizer.categorize(query);
      await msg.reply([
        '🎯 *Intent Classification Result*',
        '',
        `🏷️ *Category:* ${result.category}`,
        `📊 *Confidence:* ${(result.confidence * 100).toFixed(1)}%`,
        `🔍 *Matched Keywords:* ${result.matches?.join(', ') || 'None (Fallback)'}`,
        `📋 *Assigned List:* LIST_${result.category.toUpperCase().replace(/\s+/g, '_')}`,
      ].join('\n'));
    } catch (e) {
      await msg.reply(`❌ Classifier error: ${e.message}`);
    }
  },

  campaign: async (b, msg, args = []) => {
    const sub = String(args[0] || '').toLowerCase();
    const { outreachSafetyController } = await import('../../outreach/OutreachSafetyController.js');

    if (sub === 'pause' || sub === 'stop' || sub === 'hold') {
      const reason = args.slice(1).join(' ').trim() || `WhatsApp command from master (${msg.from})`;
      outreachSafetyController.pause(reason);
      const dashboard = services.get('terminalHealthDashboard');
      try {
        dashboard?.outreachCommand?.daily?.configure?.(['off']);
      } catch {}
      await msg.reply([
        '⏸️ *CAMPAIGN PAUSED (SAFE HOLD)*',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🛑 All automated DAMAC Hills 2 outreach greetings and follow-ups are immediately halted.',
        `📝 *Reason:* ${reason}`,
        '',
        '💡 Send *"linda campaign active"* or *"linda campaign resume"* to reactivate.',
      ].join('\n'));
      return;
    }

    if (sub === 'active' || sub === 'resume' || sub === 'start') {
      const targetProject = args.slice(1).join(' ').trim() || process.env.OUTREACH_DAILY_PROJECTS || 'VARDON';
      outreachSafetyController.resume();
      const dashboard = services.get('terminalHealthDashboard');
      try {
        dashboard?.outreachCommand?.daily?.configure?.(['send', targetProject]);
      } catch {}
      await msg.reply([
        '🟢 *CAMPAIGN ACTIVE (LIVE OUTREACH RESUMED)*',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `🚀 Automated outreach is now *ACTIVE* for project: *${targetProject}*`,
        '🛡️ *Safety Guardrails:* 1 fresh lead / account / day + Gaussian humanizer active.',
        '',
        '💡 Send *"linda campaign pause"* anytime to hold.',
      ].join('\n'));
      return;
    }

    if (sub === 'dispatch-now' || sub === 'dispatch') {
      const targetCluster = String(args[1] || 'ALL').trim().toUpperCase();
      const { DamacHills2CampaignManager } = await import('../../outreach/DamacHills2CampaignManager.js');
      const clients = b?.accountClients || services.get('accountClients') || new Map();
      const acm = b?.accountConfigManager || services.get('accountConfigManager');
      const manager = new DamacHills2CampaignManager({
        accountClients: clients,
        accountConfigManager: acm,
      });

      const batchResult = await manager.dispatchNowBatch(targetCluster, { instant: true });
      if (batchResult.status === 'PAUSED') {
        await msg.reply([
          '⏸️ *DISPATCH BLOCKED — CAMPAIGN PAUSED*',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `🛑 Cannot run *dispatch-now ${targetCluster}* while safety hold is active.`,
          `📝 *Reason:* ${batchResult.reason}`,
          '💡 Send *"linda campaign active"* first to resume outreach.',
        ].join('\n'));
        return;
      }

      if (batchResult.status === 'QUIET_HOURS_BLOCKED') {
        await msg.reply([
          '🌙 *DISPATCH HELD — UAE QUIET HOURS ACTIVE*',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `🕐 *Current GST Hour:* ${batchResult.currentHourGST}:00 GST`,
          '🛡️ *UAE Compliance Guard:* Cold outreach is blocked between 20:00 and 09:00 GST.',
          `📍 *Target Cluster:* ${batchResult.cluster}`,
          '💡 Batch will automatically resume during 09:00–20:00 GST working hours.',
        ].join('\n'));
        return;
      }

      const summaryLines = [
        `🚀 *DAMAC HILLS 2 LIVE DISPATCH SUMMARY [${batchResult.cluster}]*`,
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `✅ *Fresh Greetings Sent:* ${batchResult.dispatchedCount}`,
        `👑 *Supervisor Follow-ups:* ${batchResult.supervisorReminders}`,
        `⏭️ *Skipped / Exhausted:* ${batchResult.skippedCount}`,
        `⏱️ *Anti-Ban Pacing:* 15s–45s Gaussian jitter + Warmup Scaling (1–15/day)`,
      ];
      if (batchResult.results?.length) {
        summaryLines.push('', '*Batch Breakdown:*');
        batchResult.results.slice(0, 8).forEach((r, idx) => {
          const name = r.lead?.name || 'Owner';
          const unit = r.lead?.unit ? ` (${r.lead.unit})` : '';
          summaryLines.push(`${idx + 1}. *${name}*${unit} → \`${r.action}\`${r.sendingAgent ? ` via ${r.sendingAgent}` : ''}`);
        });
      }
      await msg.reply(summaryLines.join('\n'));
      return;
    }

    const isPaused = outreachSafetyController.isPaused();
    const env = process.env;
    const mode = isPaused ? 'paused' : (env.OUTREACH_DAILY_MODE || 'draft');
    const project = env.OUTREACH_DAILY_PROJECTS || 'VARDON';
    const dailyLimit = parseInt(env.NEW_CONVERSATIONS_DAILY_LIMIT || '12');
    const monthlyLimit = parseInt(env.NEW_CONVERSATIONS_MONTHLY_LIMIT || '300');
    const minGap = env.OUTREACH_SEND_GAP_MIN_MINUTES || '35';
    const maxGap = env.OUTREACH_SEND_GAP_MAX_MINUTES || '55';
    const lines = [
      '📊 *Campaign Status — Linda*', '',
      `📋 *Project:* ${project}`,
      `🚦 *Safety State:* ${isPaused ? '🛑 PAUSED (Safe Hold)' : '🟢 ACTIVE'}`,
      `🔧 *Mode:* ${mode.toUpperCase()}${mode === 'draft' ? ' (safe — not sending externally)' : mode === 'paused' ? ' (halted)' : ' ✅ LIVE'}`,
      `📅 *Daily limit:* ${dailyLimit}`,
      `📆 *Monthly limit:* ${monthlyLimit}`,
      `⏱️ *Send gap:* ${minGap}–${maxGap} min`,
    ];
    try {
      const guard = services.get('newConversationGuard');
      if (guard?.getTodayCount) {
        const sent = guard.getTodayCount();
        lines.push('', `✉️ *Sent today:* ${sent}/${dailyLimit}`, `📬 *Remaining:* ${Math.max(0, dailyLimit - sent)}`);
      }
    } catch {}
    lines.push(
      '',
      '📲 *WhatsApp Remote Controls:*',
      '• `linda campaign active` — Activate / Resume outreach',
      '• `linda campaign pause` — Pause outreach immediately',
      '• `linda campaign dispatch-now [cluster]` — Trigger compliant batch (VARDON, AMAZON, PACIFICA, CAMELLIA, ALL)',
      '• Reply `3.7` — One-tap Keypad toggle'
    );
    await msg.reply(lines.join('\n'));
  },

  who: async (b, msg, args) => {
    const raw = (args[0] || '').replace(/\D/g, '');
    if (!raw || raw.length < 8) { await msg.reply('📖 Usage: linda who +971XXXXXXXXX'); return; }
    try {
      const goraha = services.get('gorahaServicesBridge');
      if (!goraha?.lookupContact) { await msg.reply('🔍 Goraha bridge not available.'); return; }
      const contact = await goraha.lookupContact(raw);
      if (!contact) { await msg.reply(`❌ No contact found for +${raw} in Goraha.`); return; }
      await msg.reply([`👤 *Contact: ${contact.name || 'Unknown'}*`, `Phone: +${raw}`, `Project: ${contact.project||'—'}`, `Unit: ${contact.unit||'—'}`, `Type: ${contact.type||'Owner'}`, `Last contact: ${contact.lastContact||'Never'}`].join('\n'));
    } catch(e) { await msg.reply(`❌ Lookup error: ${e.message}`); }
  },

  report: async (b, msg) => {
    const now = new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' });
    const lines = ['📈 *Linda Daily Report*', '', `🕐 ${now} GST`, ''];
    try { const h = services.get('accountHealthMonitor')?.getHealthSummary?.() || {}; lines.push(`📱 Devices: ${h.linked??'?'}/${h.total??'?' } linked`); } catch {}
    try {
      const env = process.env;
      lines.push(`📢 Campaign: ${env.OUTREACH_DAILY_PROJECTS||'VARDON'} [${(env.OUTREACH_DAILY_MODE||'draft').toUpperCase()}]`);
      const g = services.get('newConversationGuard');
      if (g?.getTodayCount) lines.push(`✉️ Sent today: ${g.getTodayCount()}/${env.NEW_CONVERSATIONS_DAILY_LIMIT||12}`);
    } catch {}
    try { const gem = services.get('geminiChatService'); if (gem?.memoryStats) lines.push(`🧠 AI sessions: ${gem.memoryStats().activeSessions}`); } catch {}
    try { const bs = b.getBridgeStats?.(); if (bs) lines.push('', `🤖 Commands: ${bs.commandsProcessed||0}`); } catch {}
    lines.push('', '_Linda AI — White Caves Real Estate LLC_');
    await msg.reply(lines.join('\n'));
  },
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

