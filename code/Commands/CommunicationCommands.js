/**
 * Communication Commands - WhatsApp Bot Linda
 * PHASE: 5 Feature 1 - Advanced Tenant Communication
 * 
 * Commands for managing templates and sending messages via WhatsApp:
 * 
 * TEMPLATE COMMANDS:
 *   !templates                          - List all active templates
 *   !template <name-or-id>              - View a specific template
 *   !template-preview <name-or-id>      - Preview template with example values
 *   !template-categories                - List template categories with counts
 *   !template-create                    - Show template creation guide
 * 
 * MESSAGING COMMANDS:
 *   !send-template <template> <phone> [vars] - Send template message to recipient
 *   !send-direct <phone> <message>      - Send direct message to phone number
 *   !send-bulk <template>               - Send template to all active tenants
 * 
 * ANALYTICS COMMANDS:
 *   !comm-dashboard                     - Communication dashboard overview
 *   !comm-history <phone>               - Message history for a phone number
 *   !comm-stats                         - Delivery statistics summary
 *   !bulk-status <bulkId>               - Check bulk send status
 * 
 * ADMIN COMMANDS:
 *   !seed-templates                     - Seed default templates
 *   !comm-queue                         - Show queue status
 * 
 * @since Phase 5 - February 21, 2026
 */

import CommunicationService from '../Database/CommunicationService.js';

class CommunicationCommands {
  constructor(logBot) {
    this.logBot = logBot || console.log;
  }

  initialize() {
    this.logBot('✅ Communication Commands initialized', 'success');
  }

  /**
   * Process communication commands
   */
  async processCommand(command, args, context = {}) {
    try {
      const { isMasterAccount } = context;

      switch (command) {
        // Template commands (read-only available to all)
        case 'templates':
          return await this.listTemplates(args, context);
        case 'template':
          return await this.viewTemplate(args, context);
        case 'template-preview':
          return await this.previewTemplate(args, context);
        case 'template-categories':
          return await this.templateCategories(context);
        case 'template-create':
          return await this.templateCreateGuide(context);

        // Messaging commands (master only)
        case 'send-template':
          if (!isMasterAccount) return this.masterOnly();
          return await this.sendTemplate(args, context);
        case 'send-direct':
          if (!isMasterAccount) return this.masterOnly();
          return await this.sendDirect(args, context);
        case 'send-bulk':
          if (!isMasterAccount) return this.masterOnly();
          return await this.sendBulk(args, context);

        // Analytics commands
        case 'comm-dashboard':
          return await this.commDashboard(context);
        case 'comm-history':
          return await this.commHistory(args, context);
        case 'comm-stats':
          return await this.commStats(context);
        case 'bulk-status':
          return await this.bulkStatus(args, context);

        // Admin commands (master only)
        case 'seed-templates':
          if (!isMasterAccount) return this.masterOnly();
          return await this.seedTemplates(context);
        case 'comm-queue':
          if (!isMasterAccount) return this.masterOnly();
          return await this.queueStatus(context);

        default:
          return { processed: false };
      }
    } catch (error) {
      this.logBot(`Communication command error: ${error.message}`, 'error');
      return {
        processed: true,
        reply: `❌ Communication error: ${error.message}`
      };
    }
  }

  masterOnly() {
    return {
      processed: true,
      reply: '🔒 This command requires master account access.'
    };
  }

  // ============================================
  // TEMPLATE COMMANDS
  // ============================================

  async listTemplates(args, context) {
    const category = args[0];
    const options = { status: 'active', limit: 10 };
    if (category) options.category = category;

    const result = await CommunicationService.listTemplates(options);

    if (!result.success || result.templates.length === 0) {
      return {
        processed: true,
        reply: '📋 No templates found.\n\nUse *!seed-templates* to create defaults.'
      };
    }

    let reply = `📋 *Communication Templates* (${result.pagination.total} total)\n\n`;

    for (const t of result.templates) {
      const sent = t.usage?.totalSent || 0;
      const rate = t.deliveryRate || '0.0';
      reply += `📝 *${t.name}*\n`;
      reply += `   ID: \`${t.templateId}\`\n`;
      reply += `   Category: ${t.category} | Sent: ${sent} | Rate: ${rate}%\n\n`;
    }

    reply += `\n💡 Use *!template <name>* to view details`;
    if (result.pagination.pages > 1) {
      reply += `\n📄 Page ${result.pagination.page}/${result.pagination.pages}`;
    }

    return { processed: true, reply };
  }

  async viewTemplate(args, context) {
    const nameOrId = args.join(' ');
    if (!nameOrId) {
      return { processed: true, reply: '❌ Usage: *!template <name-or-id>*' };
    }

    let result = await CommunicationService.getTemplate(nameOrId);
    if (!result.success) {
      result = await CommunicationService.getTemplateByName(nameOrId);
    }

    if (!result.success) {
      return { processed: true, reply: `❌ Template "${nameOrId}" not found` };
    }

    const t = result.template;
    let reply = `📝 *${t.name}*\n\n`;
    reply += `🆔 ID: \`${t.templateId}\`\n`;
    reply += `📂 Category: ${t.category}\n`;
    reply += `🔄 Status: ${t.status}\n`;
    reply += `🌐 Language: ${t.language}\n`;
    reply += `📊 Version: v${t.version}\n`;
    reply += `\n📄 *Content:*\n${t.content}\n`;

    if (t.variables && t.variables.length > 0) {
      reply += `\n🔤 *Variables:*\n`;
      for (const v of t.variables) {
        reply += `   • {${v.name}} — ${v.displayName}${v.required ? ' (required)' : ''}${v.example ? ` e.g. "${v.example}"` : ''}\n`;
      }
    }

    if (t.tags && t.tags.length > 0) {
      reply += `\n🏷️ Tags: ${t.tags.join(', ')}`;
    }

    reply += `\n\n📊 Usage: ${t.usage?.totalSent || 0} sent, ${t.usage?.totalDelivered || 0} delivered, ${t.usage?.totalFailed || 0} failed`;

    return { processed: true, reply };
  }

  async previewTemplate(args, context) {
    const nameOrId = args.join(' ');
    if (!nameOrId) {
      return { processed: true, reply: '❌ Usage: *!template-preview <name-or-id>*' };
    }

    // Find template
    let search = await CommunicationService.getTemplate(nameOrId);
    if (!search.success) search = await CommunicationService.getTemplateByName(nameOrId);
    if (!search.success) {
      return { processed: true, reply: `❌ Template "${nameOrId}" not found` };
    }

    const result = await CommunicationService.previewTemplate(search.template.templateId);

    if (!result.success) {
      return { processed: true, reply: `❌ Preview failed: ${result.error}` };
    }

    let reply = `👁️ *Preview: ${result.template.name}*\n\n`;
    reply += `─────────────────\n`;
    reply += result.preview;
    reply += `\n─────────────────\n\n`;
    reply += `💡 Variables used: ${result.variables.map(v => `{${v.name}}`).join(', ')}`;

    return { processed: true, reply };
  }

  async templateCategories(context) {
    const result = await CommunicationService.getCategories();

    if (!result.success || !result.categories || result.categories.length === 0) {
      return { processed: true, reply: '📂 No categories found. Use *!seed-templates* first.' };
    }

    let reply = '📂 *Template Categories*\n\n';
    for (const cat of result.categories) {
      reply += `  📁 *${cat.name}* — ${cat.total} total, ${cat.active} active\n`;
    }
    reply += '\n💡 Use *!templates <category>* to filter';

    return { processed: true, reply };
  }

  async templateCreateGuide(context) {
    let reply = '🛠️ *Create Template Guide*\n\n';
    reply += 'Use the API to create templates:\n\n';
    reply += '```\nPOST /api/v1/damac/communication/templates\n```\n\n';
    reply += '*Body:*\n';
    reply += '```json\n{\n';
    reply += '  "name": "My Template",\n';
    reply += '  "category": "notification",\n';
    reply += '  "content": "Hello {name}, ...",\n';
    reply += '  "createdBy": "admin"\n';
    reply += '}\n```\n\n';
    reply += '*Categories:* greeting, inquiry_response, maintenance,\n';
    reply += 'payment_reminder, lease_renewal, issue_escalation,\n';
    reply += 'notification, feedback_request, welcome, farewell,\n';
    reply += 'emergency, custom\n\n';
    reply += '💡 Variables are auto-detected from {brackets}';

    return { processed: true, reply };
  }

  // ============================================
  // MESSAGING COMMANDS
  // ============================================

  async sendTemplate(args, context) {
    // Usage: !send-template <templateName> <phone> [var1=value1] [var2=value2]
    if (args.length < 2) {
      return {
        processed: true,
        reply: '❌ Usage: *!send-template <template-name> <phone>* [var1=value1 var2=value2]\n\nExample: *!send-template "Payment Reminder" +971501234567 tenantName=Ahmed amount=45000*'
      };
    }

    const templateName = args[0];
    const recipientPhone = args[1];

    // Parse variables from remaining args (key=value format)
    const variables = {};
    for (let i = 2; i < args.length; i++) {
      const [key, ...valueParts] = args[i].split('=');
      if (key && valueParts.length > 0) {
        variables[key] = valueParts.join('=');
      }
    }

    // Find template
    let search = await CommunicationService.getTemplate(templateName);
    if (!search.success) search = await CommunicationService.getTemplateByName(templateName);
    if (!search.success) {
      return { processed: true, reply: `❌ Template "${templateName}" not found` };
    }

    // Create send function from bot context
    const sendFn = context.client
      ? async (phone, text) => {
          const chatId = phone.includes('@') ? phone : `${phone.replace(/[^0-9]/g, '')}@c.us`;
          await context.client.sendMessage(chatId, text);
        }
      : null;

    const result = await CommunicationService.sendTemplateMessage({
      templateId: search.template.templateId,
      recipientPhone,
      variables,
      sentBy: context.phoneNumber || 'bot',
      sendFn
    });

    if (result.success) {
      let reply = `✅ *Message ${sendFn ? 'Sent' : 'Queued'}*\n\n`;
      reply += `📝 Template: ${search.template.name}\n`;
      reply += `📱 To: ${recipientPhone}\n`;
      reply += `🆔 Log: ${result.log.logId}\n\n`;
      reply += `📄 *Content:*\n${result.renderedContent}`;
      return { processed: true, reply };
    } else {
      return { processed: true, reply: `❌ Send failed: ${result.error}` };
    }
  }

  async sendDirect(args, context) {
    if (args.length < 2) {
      return {
        processed: true,
        reply: '❌ Usage: *!send-direct <phone> <message>*\n\nExample: *!send-direct +971501234567 Hello from Linda!*'
      };
    }

    const recipientPhone = args[0];
    const content = args.slice(1).join(' ');

    const sendFn = context.client
      ? async (phone, text) => {
          const chatId = phone.includes('@') ? phone : `${phone.replace(/[^0-9]/g, '')}@c.us`;
          await context.client.sendMessage(chatId, text);
        }
      : null;

    const result = await CommunicationService.sendDirectMessage({
      recipientPhone,
      content,
      sentBy: context.phoneNumber || 'bot',
      sendFn
    });

    if (result.success) {
      return {
        processed: true,
        reply: `✅ Direct message ${sendFn ? 'sent' : 'queued'} to ${recipientPhone}\n🆔 Log: ${result.log.logId}`
      };
    } else {
      return { processed: true, reply: `❌ Send failed: ${result.error}` };
    }
  }

  async sendBulk(args, context) {
    if (args.length < 1) {
      return {
        processed: true,
        reply: '❌ Usage: *!send-bulk <template-name>*\n\n⚠️ This will send to all active tenants.\nUse with caution.'
      };
    }

    const templateName = args.join(' ');

    let search = await CommunicationService.getTemplate(templateName);
    if (!search.success) search = await CommunicationService.getTemplateByName(templateName);
    if (!search.success) {
      return { processed: true, reply: `❌ Template "${templateName}" not found` };
    }

    // For now, return confirmation-needed message
    // In production, this would trigger a confirmation flow
    let reply = `📢 *Bulk Send Preparation*\n\n`;
    reply += `📝 Template: ${search.template.name}\n`;
    reply += `📂 Category: ${search.template.category}\n\n`;
    reply += `⚠️ *This feature sends to all active tenants.*\n`;
    reply += `Use the API for more control:\n\n`;
    reply += `\`\`\`\nPOST /api/v1/damac/communication/send-bulk\n\`\`\`\n\n`;
    reply += `Include recipients array with phone numbers and variables.`;

    return { processed: true, reply };
  }

  // ============================================
  // ANALYTICS COMMANDS
  // ============================================

  async commDashboard(context) {
    const result = await CommunicationService.getDashboard();

    if (!result.success) {
      return { processed: true, reply: `❌ Dashboard error: ${result.error}` };
    }

    const d = result.dashboard;
    let reply = `📊 *Communication Dashboard*\n\n`;
    reply += `📋 *Templates:* ${d.templates.total} total, ${d.templates.active} active\n\n`;
    reply += `📨 *Messages:*\n`;
    reply += `   Total: ${d.messages.total}\n`;
    reply += `   ✅ Delivered: ${d.messages.delivered}\n`;
    reply += `   📖 Read: ${d.messages.read}\n`;
    reply += `   ❌ Failed: ${d.messages.failed}\n`;
    reply += `   ⏳ Queued: ${d.messages.queued}\n`;
    reply += `   📈 Delivery Rate: ${d.messages.deliveryRate}%\n`;

    if (d.topTemplates && d.topTemplates.length > 0) {
      reply += `\n🏆 *Top Templates:*\n`;
      for (const t of d.topTemplates) {
        reply += `   • ${t.name} — ${t.totalSent} sent (${t.deliveryRate}%)\n`;
      }
    }

    if (d.recentMessages && d.recentMessages.length > 0) {
      reply += `\n🕐 *Recent Messages:*\n`;
      for (const m of d.recentMessages.slice(0, 5)) {
        const time = new Date(m.createdAt).toLocaleString('en-AE', { timeZone: 'Asia/Dubai' });
        reply += `   ${m.status === 'delivered' ? '✅' : m.status === 'failed' ? '❌' : '⏳'} ${m.recipientPhone} — ${m.templateName || 'direct'} (${time})\n`;
      }
    }

    return { processed: true, reply };
  }

  async commHistory(args, context) {
    const phone = args[0];
    if (!phone) {
      return { processed: true, reply: '❌ Usage: *!comm-history <phone>*' };
    }

    const result = await CommunicationService.getRecipientHistory(phone, { limit: 10 });

    if (!result.success || result.logs.length === 0) {
      return { processed: true, reply: `📭 No communication history for ${phone}` };
    }

    let reply = `📱 *History for ${phone}* (${result.pagination.total} total)\n\n`;
    for (const log of result.logs) {
      const time = new Date(log.createdAt).toLocaleString('en-AE', { timeZone: 'Asia/Dubai' });
      const statusIcon = { sent: '📤', delivered: '✅', read: '📖', failed: '❌', queued: '⏳' }[log.status] || '❓';
      reply += `${statusIcon} ${time}\n`;
      reply += `   ${log.templateName || 'Direct message'} — ${log.status}\n`;
      reply += `   ${log.content.substring(0, 60)}${log.content.length > 60 ? '...' : ''}\n\n`;
    }

    return { processed: true, reply };
  }

  async commStats(context) {
    const result = await CommunicationService.getDeliveryStats();

    if (!result.success) {
      return { processed: true, reply: `❌ Stats error: ${result.error}` };
    }

    const s = result.stats;
    let reply = `📈 *Delivery Statistics*\n\n`;
    reply += `📨 Total Messages: ${s.total}\n`;
    reply += `✅ Delivered: ${s.delivered}\n`;
    reply += `📖 Read: ${s.read}\n`;
    reply += `📤 Sent: ${s.sent}\n`;
    reply += `⏳ Queued: ${s.queued}\n`;
    reply += `🔄 Sending: ${s.sending}\n`;
    reply += `❌ Failed: ${s.failed}\n`;
    reply += `🚫 Cancelled: ${s.cancelled}\n`;
    reply += `\n📊 Delivery Rate: ${s.deliveryRate}%`;

    return { processed: true, reply };
  }

  async bulkStatus(args, context) {
    const bulkId = args[0];
    if (!bulkId) {
      return { processed: true, reply: '❌ Usage: *!bulk-status <bulkId>*' };
    }

    const result = await CommunicationService.getBulkStatus(bulkId);

    if (!result.success) {
      return { processed: true, reply: `❌ Error: ${result.error}` };
    }

    const s = result.stats;
    let reply = `📢 *Bulk Send: ${bulkId}*\n\n`;
    reply += `📊 Total: ${s.total}\n`;
    reply += `✅ Delivered: ${s.delivered}\n`;
    reply += `📤 Sent: ${s.sent}\n`;
    reply += `❌ Failed: ${s.failed}\n`;
    reply += `⏳ Queued: ${s.queued}\n`;
    reply += `📈 Rate: ${s.deliveryRate}%\n`;

    if (result.messages && result.messages.length > 0) {
      reply += `\n📋 *Recipients:*\n`;
      for (const m of result.messages.slice(0, 10)) {
        const icon = m.status === 'delivered' ? '✅' : m.status === 'failed' ? '❌' : '⏳';
        reply += `   ${icon} ${m.recipientPhone} ${m.recipientName ? `(${m.recipientName})` : ''} — ${m.status}\n`;
      }
      if (result.messages.length > 10) {
        reply += `   ... and ${result.messages.length - 10} more\n`;
      }
    }

    return { processed: true, reply };
  }

  // ============================================
  // ADMIN COMMANDS
  // ============================================

  async seedTemplates(context) {
    const result = await CommunicationService.seedDefaultTemplates();

    if (result.success) {
      let reply = `🌱 *Templates Seeded*\n\n`;
      reply += `✅ Created: ${result.seeded}\n`;
      reply += `⏭️ Skipped: ${result.skipped}\n\n`;

      for (const r of result.results) {
        const icon = r.skipped ? '⏭️' : r.success ? '✅' : '❌';
        reply += `${icon} ${r.name}\n`;
      }

      reply += `\n💡 Use *!templates* to view all templates`;
      return { processed: true, reply };
    } else {
      return { processed: true, reply: `❌ Seed failed: ${result.error}` };
    }
  }

  async queueStatus(context) {
    const [scheduled, stats] = await Promise.all([
      CommunicationService.getDueScheduledMessages(5),
      CommunicationService.getDeliveryStats({ status: 'queued' })
    ]);

    let reply = `📬 *Message Queue Status*\n\n`;
    reply += `⏳ Queued messages: ${stats.success ? stats.stats.total : 'N/A'}\n`;

    if (scheduled.success && scheduled.messages.length > 0) {
      reply += `\n📅 *Due Scheduled Messages:*\n`;
      for (const m of scheduled.messages) {
        reply += `   📩 ${m.recipientPhone} — ${m.templateName || 'direct'}\n`;
      }
    } else {
      reply += `\n📅 No scheduled messages due`;
    }

    return { processed: true, reply };
  }

  /**
   * Get list of supported commands
   */
  getCommands() {
    return [
      { command: 'templates', description: 'List all active templates', category: 'communication' },
      { command: 'template', description: 'View a specific template', category: 'communication' },
      { command: 'template-preview', description: 'Preview template with example values', category: 'communication' },
      { command: 'template-categories', description: 'List template categories', category: 'communication' },
      { command: 'template-create', description: 'Template creation guide', category: 'communication' },
      { command: 'send-template', description: 'Send template message', category: 'communication', masterOnly: true },
      { command: 'send-direct', description: 'Send direct message', category: 'communication', masterOnly: true },
      { command: 'send-bulk', description: 'Send bulk messages', category: 'communication', masterOnly: true },
      { command: 'comm-dashboard', description: 'Communication dashboard', category: 'communication' },
      { command: 'comm-history', description: 'Message history for phone', category: 'communication' },
      { command: 'comm-stats', description: 'Delivery statistics', category: 'communication' },
      { command: 'bulk-status', description: 'Bulk send status', category: 'communication' },
      { command: 'seed-templates', description: 'Seed default templates', category: 'communication', masterOnly: true },
      { command: 'comm-queue', description: 'Queue status', category: 'communication', masterOnly: true },
    ];
  }
}

export default CommunicationCommands;
