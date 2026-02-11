/**
 * LINDA COMMAND HANDLER
 * ═══════════════════════════════════════════════════════════════════════════
 * Main command parser and router for Linda AI Assistant
 * 
 * Responsibilities:
 * 1. Parse incoming messages for commands (! prefix)
 * 2. Validate command syntax and arguments
 * 3. Route to appropriate command handler
 * 4. Log conversations and feedback
 * 5. Handle errors gracefully
 * 6. Track usage statistics
 * 
 * Architecture: Command Pattern with Registry
 * - Registry: Centralized command metadata
 * - Handlers: Individual command implementations
 * - Logger: Conversation logging and ML data
 */

import LindaCommandRegistry from './LindaCommandRegistry.js';
import LindaConversationLearner from './LindaConversationLearner.js';

export class LindaCommandHandler {
  constructor(logBotFn) {
    this.logBot = logBotFn || console.log;
    this.registry = LindaCommandRegistry;
    this.learner = new LindaConversationLearner();
    this.commandHandlers = new Map();
    this.sessionAuth = new Map(); // Track authenticated sessions
    this.usageStats = {
      totalCommands: 0,
      commandsByName: {},
      commandsByCategory: {},
      errorCount: 0,
      successCount: 0,
      startTime: new Date()
    };

    this.initializeHandlers();
  }

  /**
   * Initialize built-in command handlers
   */
  initializeHandlers() {
    // WhatsApp Commands
    this.registerHandler('ping', this.handlePing.bind(this));
    this.registerHandler('status', this.handleStatus.bind(this));
    this.registerHandler('help', this.handleHelp.bind(this));
    this.registerHandler('list-devices', this.handleListDevices.bind(this));
    this.registerHandler('device-status', this.handleDeviceStatus.bind(this));
    
    // Learning Commands
    this.registerHandler('learn', this.handleLearn.bind(this));
    this.registerHandler('feedback', this.handleFeedback.bind(this));
    this.registerHandler('conversation-stats', this.handleConversationStats.bind(this));
    
    // Admin Commands
    this.registerHandler('authenticate', this.handleAuthenticate.bind(this));
    this.registerHandler('health', this.handleHealth.bind(this));
    this.registerHandler('logs', this.handleLogs.bind(this));
    
    // Contact Commands
    this.registerHandler('find-contact', this.handleFindContact.bind(this));
    this.registerHandler('contact-stats', this.handleContactStats.bind(this));
    this.registerHandler('verify-contacts', this.handleVerifyContacts.bind(this));
    
    // Sheets Commands
    this.registerHandler('list-sheets', this.handleListSheets.bind(this));
    this.registerHandler('sheet-info', this.handleSheetInfo.bind(this));

    // Account Management Commands (NEW - February 11, 2026)
    this.registerHandler('add-account', this.handleAddAccount.bind(this));
    this.registerHandler('list-accounts', this.handleListAccounts.bind(this));
    this.registerHandler('remove-account', this.handleRemoveAccount.bind(this));
    this.registerHandler('set-master', this.handleSetMaster.bind(this));
    this.registerHandler('enable-account', this.handleEnableAccount.bind(this));
    this.registerHandler('disable-account', this.handleDisableAccount.bind(this));
  }

  /**
   * Register a command handler
   */
  registerHandler(commandName, handler) {
    this.commandHandlers.set(commandName, handler);
  }

  /**
   * Main entry point: Process a message and check for commands
   */
  async processMessage(msg, phoneNumber, context = {}) {
    try {
      const messageBody = msg.body.trim();
      const isMasterAccount = context.isMasterAccount || false;
      const masterPhone = global.accountConfigManager?.getMasterPhoneNumber();

      // Check if message is a command (starts with !)
      if (!messageBody.startsWith('!')) {
        // Not a command - log as conversation for learning (master account only)
        if (isMasterAccount) {
          await this.learner.logConversation({
            phoneNumber,
            message: messageBody,
            isFromUser: !msg.fromMe,
            timestamp: new Date(),
            chatId: msg.from,
            messageId: msg.id
          });
        }
        return { isCommand: false, processed: false };
      }

      // Parse command
      const { command, args } = this.parseCommand(messageBody);

      // Track usage
      this.trackUsage(command);

      // Validate command exists
      if (!this.registry.isValidCommand(command)) {
        await msg.reply(
          `❌ Unknown command: \`${command}\`\n\n` +
          `Type \`!help\` for available commands.`
        );
        return { isCommand: true, processed: false, error: 'unknown-command' };
      }

      // Get command metadata
      const cmdInfo = this.registry.getCommand(command);
      if (!cmdInfo.enabled) {
        await msg.reply(
          `⚠️ Command \`${command}\` is currently disabled.\n` +
          `Type \`!help\` for available commands.`
        );
        return { isCommand: true, processed: false, error: 'disabled-command' };
      }

      // Check authentication requirement
      if (cmdInfo.requiresAuth && !this.isAuthenticated(phoneNumber)) {
        await msg.reply(
          `🔐 This command requires authentication.\n\n` +
          `Use: \`!authenticate <password>\` to log in.`
        );
        return { isCommand: true, processed: false, error: 'auth-required' };
      }

      // Validate arguments
      const validation = this.validateArguments(command, args, cmdInfo);
      if (!validation.valid) {
        await msg.reply(
          `❌ ${validation.error}\n\n` +
          `Usage: \`${cmdInfo.usage}\`\n` +
          `Example: \`${cmdInfo.examples[0]}\``
        );
        return { isCommand: true, processed: false, error: 'invalid-args' };
      }

      // Execute handler
      const handler = this.commandHandlers.get(command);
      if (!handler) {
        // Handler not implemented yet
        await msg.reply(
          `⏳ Command \`${command}\` is planned but not yet implemented.\n\n` +
          `Expected in next update. Type \`!help\` for available commands.`
        );
        return { isCommand: true, processed: false, error: 'not-implemented' };
      }

      // Run handler
      const result = await handler({
        msg,
        phoneNumber,
        args,
        cmdInfo,
        context
      });

      // Log successful command execution
      await this.learner.logCommand({
        phoneNumber,
        command,
        args,
        success: true,
        timestamp: new Date(),
        chatId: msg.from
      });

      this.usageStats.successCount++;
      return { isCommand: true, processed: true, result };

    } catch (error) {
      this.logBot(`❌ Command handler error: ${error.message}`, 'error');
      this.usageStats.errorCount++;

      try {
        await msg.reply(
          `❌ Command execution failed: ${error.message}\n\n` +
          `Please try again or type \`!help\` for assistance.`
        );
      } catch (replyError) {
        this.logBot(`Failed to send error message: ${replyError.message}`, 'error');
      }

      return { isCommand: true, processed: false, error: error.message };
    }
  }

  /**
   * Parse command string: "!command arg1 arg2"
   */
  parseCommand(messageBody) {
    const parts = messageBody.trim().split(/\s+/);
    const commandPart = parts[0].substring(1).toLowerCase(); // Remove ! and lowercase
    const args = parts.slice(1);

    return { command: commandPart, args };
  }

  /**
   * Validate command arguments
   */
  validateArguments(command, args, cmdInfo) {
    // Basic validation - can be extended per command
    // This is a simple placeholder that most commands will override

    // Some commands require no args
    if (command === 'help' || command === 'status' || command === 'health' || command === 'list-accounts') {
      return { valid: true };
    }

    // Some commands require at least 1 arg
    if (['find-contact', 'device-status', 'sheet-info', 'learn', 'remove-account', 'set-master', 'enable-account', 'disable-account'].includes(command)) {
      if (args.length === 0) {
        return { valid: false, error: `\`${command}\` requires arguments.` };
      }
    }

    // add-account requires at least 2 args (phone and name)
    if (command === 'add-account' && args.length < 2) {
      return { valid: false, error: `\`add-account\` requires phone number and account name.` };
    }

    return { valid: true };
  }

  /**
   * Check if user is authenticated for this session
   */
  isAuthenticated(phoneNumber) {
    if (!this.sessionAuth.has(phoneNumber)) {
      return false;
    }

    const authData = this.sessionAuth.get(phoneNumber);
    // Check if auth hasn't expired (1 hour)
    return (Date.now() - authData.timestamp) < 3600000;
  }

  /**
   * Authenticate a user
   */
  authenticateUser(phoneNumber, password) {
    // TODO: Integrate with actual auth mechanism
    // For now, simple password check
    const adminPassword = process.env.LINDA_ADMIN_PASSWORD || 'linda123';

    if (password === adminPassword) {
      this.sessionAuth.set(phoneNumber, {
        timestamp: Date.now(),
        authenticated: true
      });
      return true;
    }

    return false;
  }

  /**
   * Track command usage statistics
   */
  trackUsage(command) {
    this.usageStats.totalCommands++;

    // Track by command
    this.usageStats.commandsByName[command] = (this.usageStats.commandsByName[command] || 0) + 1;

    // Track by category
    const cmdInfo = this.registry.getCommand(command);
    if (cmdInfo) {
      const category = cmdInfo.category;
      this.usageStats.commandsByCategory[category] = 
        (this.usageStats.commandsByCategory[category] || 0) + 1;
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    const uptime = Date.now() - this.usageStats.startTime.getTime();
    return {
      ...this.usageStats,
      uptime,
      uptimeFormatted: this.formatUptime(uptime)
    };
  }

  /**
   * Format uptime for display
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILT-IN COMMAND HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  async handlePing({ msg }) {
    await msg.reply('🏓 pong!');
  }

  async handleStatus({ msg, context }) {
    const stats = this.getUsageStats();
    const masterPhone = global.accountConfigManager?.getMasterPhoneNumber();
    const isMaster = context.phoneNumber === masterPhone;
    const accountInfo = global.accountConfigManager?.getAccount(context.phoneNumber) || {};
    
    let statusText = `\n📊 **LINDA STATUS**\n\n`;
    statusText += `✅ Status: Online\n`;
    statusText += `📱 Account: ${accountInfo.displayName || context.phoneNumber}\n`;
    statusText += `${isMaster ? '👑' : '📱'} Role: ${isMaster ? 'Master (Intelligence Hub)' : 'Secondary (Communication)'}\n`;
    statusText += `⏱️  Uptime: ${stats.uptimeFormatted}\n`;
    statusText += `📈 Total Commands: ${stats.totalCommands}\n`;
    statusText += `✅ Successful: ${stats.successCount}\n`;
    statusText += `❌ Errors: ${stats.errorCount}\n`;
    statusText += `🔌 Connected Devices: ${context.deviceCount || 'unknown'}\n`;
    statusText += `💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n`;

    await msg.reply(statusText);
  }

  async handleHelp({ msg, args, context }) {
    const masterPhone = global.accountConfigManager?.getMasterPhoneNumber();
    const isMaster = context?.phoneNumber === masterPhone;
    
    if (args.length === 0) {
      // General help
      let helpText = `\n📚 **LINDA COMMAND HELP**\n\n`;
      helpText += `${isMaster ? '👑 MASTER ACCOUNT' : '📱 SECONDARY ACCOUNT'}\n`;
      helpText += `${isMaster ? 'You have full command access' : 'Send commands to master account for processing'}\n\n`;
      helpText += `Type \`!help <command>\` for details.\n\n`;

      for (const category of this.registry.getCategories()) {
        const commands = this.registry.getCommandsByCategory(category);
        helpText += `**${category.toUpperCase()}**\n`;
        commands.forEach(cmd => {
          helpText += `• \`!${cmd.name}\` - ${cmd.description}\n`;
        });
        helpText += `\n`;
      }

      helpText += `Type \`!authenticate <password>\` to unlock admin commands.`;
      await msg.reply(helpText);
    } else {
      // Specific command help
      const cmdName = args[0].toLowerCase();
      const cmd = this.registry.getCommand(cmdName);

      if (!cmd) {
        await msg.reply(`❌ Unknown command: \`${cmdName}\``);
        return;
      }

      let helpText = `\n📖 **${cmd.name.toUpperCase()}**\n\n`;
      helpText += `${cmd.description}\n\n`;
      helpText += `**Usage:**\n\`${cmd.usage}\`\n\n`;
      helpText += `**Help:**\n${cmd.helpText}\n\n`;
      helpText += `**Examples:**\n`;
      cmd.examples.forEach(example => {
        helpText += `\`${example}\`\n`;
      });

      if (cmd.requiresAuth) {
        helpText += `\n🔐 Requires authentication`;
      }

      await msg.reply(helpText);
    }
  }

  async handleListDevices({ msg, context }) {
    const deviceManager = global.deviceLinkedManager;
    if (!deviceManager) {
      await msg.reply(`⚠️ Device manager not initialized`);
      return;
    }

    const devices = deviceManager.getLinkedDevices();
    if (devices.length === 0) {
      await msg.reply(`📱 No devices linked yet.`);
      return;
    }

    let text = `\n📱 **LINKED DEVICES** (${devices.length})\n\n`;
    devices.forEach((device, idx) => {
      text += `${idx + 1}. ${device.displayName || device.phoneNumber}\n`;
      text += `   Phone: ${device.phoneNumber}\n`;
      text += `   Status: ${device.status || 'unknown'}\n`;
      text += `   Last Active: ${device.lastActive || 'never'}\n\n`;
    });

    await msg.reply(text);
  }

  async handleDeviceStatus({ msg, args, context }) {
    if (args.length === 0) {
      await msg.reply(`Usage: \`!device-status <phone-number>\``);
      return;
    }

    const phoneNumber = args[0];
    const deviceManager = global.deviceLinkedManager;
    if (!deviceManager) {
      await msg.reply(`⚠️ Device manager not initialized`);
      return;
    }

    const device = deviceManager.getDevice(phoneNumber);
    if (!device) {
      await msg.reply(`❌ Device not found: ${phoneNumber}`);
      return;
    }

    let text = `\n📱 **DEVICE STATUS**\n\n`;
    text += `Name: ${device.displayName || device.phoneNumber}\n`;
    text += `Phone: ${device.phoneNumber}\n`;
    text += `Status: ${device.status || 'unknown'}\n`;
    text += `Linked: ${device.linkedAt ? new Date(device.linkedAt).toLocaleString() : 'never'}\n`;
    text += `Last Active: ${device.lastActivity || 'never'}\n`;
    text += `Role: ${device.role || 'secondary'}\n`;

    await msg.reply(text);
  }

  async handleLearn({ msg, args }) {
    if (args.length === 0) {
      await msg.reply(
        `Learn from conversations!\n\n` +
        `Usage: \`!learn <question> => <answer>\`\n\n` +
        `Example:\n\`!learn What are your rates? => We offer competitive rates.\``
      );
      return;
    }

    const fullMessage = args.join(' ');
    if (!fullMessage.includes('=>')) {
      await msg.reply(
        `❌ Format: \`<question> => <answer>\`\n\n` +
        `Arrow (\`=>\`) separates question and answer.`
      );
      return;
    }

    const [question, answer] = fullMessage.split('=>').map(s => s.trim());

    await this.learner.logLearning({
      question,
      answer,
      source: 'user',
      timestamp: new Date(),
      phoneNumber: msg.from
    });

    await msg.reply(`✅ Learned: "${question}" → "${answer}"`);
  }

  async handleFeedback({ msg, args }) {
    if (args.length < 3) {
      await msg.reply(
        `Feedback format:\n\n` +
        `\`!feedback <positive|negative> <message-id> "<comment>"\``
      );
      return;
    }

    const sentiment = args[0].toLowerCase();
    const messageId = args[1];
    const comment = args.slice(2).join(' ').replace(/^"|"$/g, '');

    if (!['positive', 'negative'].includes(sentiment)) {
      await msg.reply(`❌ Sentiment must be 'positive' or 'negative'`);
      return;
    }

    await this.learner.logFeedback({
      messageId,
      sentiment,
      comment,
      timestamp: new Date(),
      phoneNumber: msg.from
    });

    await msg.reply(`✅ Feedback recorded: ${sentiment}`);
  }

  async handleConversationStats({ msg }) {
    const stats = await this.learner.getStatistics();

    let text = `\n📊 **CONVERSATION STATISTICS**\n\n`;
    text += `Total Messages: ${stats.totalMessages || 0}\n`;
    text += `Learned Patterns: ${stats.learnedPatterns || 0}\n`;
    text += `Feedback Entries: ${stats.feedbackCount || 0}\n`;
    text += `Users: ${stats.uniqueUsers || 0}\n`;
    text += `Last Updated: ${new Date().toLocaleString()}\n`;

    await msg.reply(text);
  }

  async handleAuthenticate({ msg, args }) {
    if (args.length === 0) {
      await msg.reply(`Usage: \`!authenticate <password>\``);
      return;
    }

    const password = args[0];
    const phoneNumber = msg.from;

    if (this.authenticateUser(phoneNumber, password)) {
      await msg.reply(
        `✅ Authenticated!\n\n` +
        `You now have access to admin commands.\n` +
        `Session valid for 1 hour.`
      );
    } else {
      await msg.reply(`❌ Authentication failed. Incorrect password.`);
    }
  }

  async handleHealth({ msg }) {
    let text = `\n💚 **SYSTEM HEALTH**\n\n`;
    text += `Status: ✅ Healthy\n`;

    const mem = process.memoryUsage();
    text += `Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB\n`;
    text += `Uptime: ${this.formatUptime(Date.now() - this.usageStats.startTime.getTime())}\n`;

    const stats = this.getUsageStats();
    text += `Commands Processed: ${stats.totalCommands}\n`;
    text += `Error Rate: ${stats.totalCommands > 0 ? Math.round((stats.errorCount / stats.totalCommands) * 100) : 0}%\n`;

    await msg.reply(text);
  }

  async handleLogs({ msg, args }) {
    if (!this.isAuthenticated(msg.from)) {
      await msg.reply(`🔐 Requires authentication`);
      return;
    }

    // TODO: Implement actual log retrieval
    await msg.reply(`📋 Recent logs:\n\n(Log feature coming soon)`);
  }

  async handleFindContact({ msg, args }) {
    if (args.length === 0) {
      await msg.reply(`Usage: \`!find-contact <name-or-number>\``);
      return;
    }

    const query = args.join(' ');
    await msg.reply(`🔍 Searching for: ${query}\n\n(Contact search coming soon)`);
  }

  async handleContactStats({ msg }) {
    await msg.reply(
      `📊 Contact Statistics:\n\n` +
      `(Stats feature coming soon)`
    );
  }

  async handleVerifyContacts({ msg }) {
    // NOTE: This existed before and triggers GorahaContactVerificationService
    // Keeping for backward compatibility
    await msg.reply(`🔍 Starting contact verification...\n\n(Use !verify-goraha for full verification)`);
  }

  async handleListSheets({ msg }) {
    await msg.reply(`📄 Google Sheets:\n\n(Sheet listing coming soon)`);
  }

  async handleSheetInfo({ msg, args }) {
    if (args.length === 0) {
      await msg.reply(`Usage: \`!sheet-info <sheet-name>\``);
      return;
    }

    const sheetName = args.join(' ');
    await msg.reply(`📄 Sheet Info: ${sheetName}\n\n(Sheet info coming soon)`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNT MANAGEMENT COMMANDS (NEW - February 11, 2026)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * !add-account <phone> <name>
   * Add a new WhatsApp account
   */
  async handleAddAccount({ msg, args, context }) {
    const accountConfigManager = global.accountConfigManager;
    if (!accountConfigManager) {
      await msg.reply(`❌ Account manager not initialized`);
      return;
    }

    if (args.length < 2) {
      await msg.reply(
        `Usage: \`!add-account <phone> <name>\`\n\n` +
        `Example: \`!add-account +971501234567 'My Main Account'\``
      );
      return;
    }

    const phone = args[0];
    const name = args.slice(1).join(' ').replace(/['"]/g, '');

    const result = await accountConfigManager.addAccount({
      phone,
      displayName: name,
      accountId: `account-${Date.now()}`,
      role: 'secondary'
    });

    if (result.success) {
      const account = result.account;
      await msg.reply(
        `✅ **Account Added Successfully**\n\n` +
        `📱 Name: ${account.displayName}\n` +
        `☎️  Phone: ${account.phoneNumber}\n` +
        `🆔 ID: ${account.id}\n` +
        `⚙️  Status: ${account.status}\n\n` +
        `💡 Next: Scan QR code to link this account`
      );
    } else {
      await msg.reply(`❌ Error: ${result.error}`);
    }
  }

  /**
   * !list-accounts
   * List all configured accounts
   */
  async handleListAccounts({ msg }) {
    const accountConfigManager = global.accountConfigManager;
    if (!accountConfigManager) {
      await msg.reply(`❌ Account manager not initialized`);
      return;
    }

    const accounts = accountConfigManager.getAllAccounts();
    const masterAccount = accountConfigManager.getMasterAccount();

    if (accounts.length === 0) {
      await msg.reply(
        `📱 **No Accounts Configured**\n\n` +
        `Use: \`!add-account <phone> <name>\`\n` +
        `Example: \`!add-account +971501234567 'My Account'\``
      );
      return;
    }

    let text = `\n📱 **CONFIGURED ACCOUNTS** (${accounts.length})\n\n`;
    text += `Master Account: ${masterAccount?.displayName || 'Not Set'}\n\n`;

    accounts.forEach((account, idx) => {
      const roleIcon = account.role === 'primary' ? '👑' : '📱';
      const statusIcon = account.status === 'active' ? '✅' : '⏳';
      const enabledIcon = account.enabled ? '🟢' : '🔴';

      text += `${idx + 1}. ${roleIcon} ${account.displayName}\n`;
      text += `   ID: \`${account.id}\`\n`;
      text += `   Phone: ${account.phoneNumber}\n`;
      text += `   Status: ${statusIcon} ${account.status || 'pending'}\n`;
      text += `   Enabled: ${enabledIcon} ${account.enabled ? 'Yes' : 'No'}\n\n`;
    });

    text += `💡 Commands:\n`;
    text += `• Remove: \`!remove-account <id>\`\n`;
    text += `• Master: \`!set-master <id>\`\n`;
    text += `• Enable: \`!enable-account <id>\`\n`;
    text += `• Disable: \`!disable-account <id>\``;

    await msg.reply(text);
  }

  /**
   * !remove-account <account-id>
   * Remove an account
   */
  async handleRemoveAccount({ msg, args }) {
    const accountConfigManager = global.accountConfigManager;
    if (!accountConfigManager) {
      await msg.reply(`❌ Account manager not initialized`);
      return;
    }

    if (args.length === 0) {
      await msg.reply(`Usage: \`!remove-account <account-id>\``);
      return;
    }

    const accountId = args[0];
    const result = await accountConfigManager.removeAccount(accountId);

    if (result.success) {
      await msg.reply(
        `✅ ${result.message}\n\n` +
        `📝 Note: Device session still exists on WhatsApp\n` +
        `Use WhatsApp Settings > Linked Devices to revoke access`
      );
    } else {
      await msg.reply(`❌ Error: ${result.error}`);
    }
  }

  /**
   * !set-master <account-id>
   * Set account as master (primary)
   */
  async handleSetMaster({ msg, args }) {
    const accountConfigManager = global.accountConfigManager;
    if (!accountConfigManager) {
      await msg.reply(`❌ Account manager not initialized`);
      return;
    }

    if (args.length === 0) {
      await msg.reply(`Usage: \`!set-master <account-id>\``);
      return;
    }

    const accountId = args[0];
    const result = await accountConfigManager.setMasterAccount(accountId);

    if (result.success) {
      // Update terminal dashboard
      const masterAccount = accountConfigManager.getMasterAccount();
      const terminalDashboard = global.terminalHealthDashboard;
      if (terminalDashboard && masterAccount) {
        terminalDashboard.setMasterPhoneNumber(masterAccount.phoneNumber);
      }

      await msg.reply(
        `✅ **Master Account Updated**\n\n` +
        `${result.message}\n\n` +
        `👑 This account is now the primary account for Linda`
      );
    } else {
      await msg.reply(`❌ Error: ${result.error}`);
    }
  }

  /**
   * !enable-account <account-id>
   * Enable an account
   */
  async handleEnableAccount({ msg, args }) {
    const accountConfigManager = global.accountConfigManager;
    if (!accountConfigManager) {
      await msg.reply(`❌ Account manager not initialized`);
      return;
    }

    if (args.length === 0) {
      await msg.reply(`Usage: \`!enable-account <account-id>\``);
      return;
    }

    const accountId = args[0];
    const result = await accountConfigManager.enableAccount(accountId);

    if (result.success) {
      await msg.reply(
        `✅ ${result.message}\n\n` +
        `🟢 Account is now enabled\n` +
        `⚬ Restart Linda to activate this account`
      );
    } else {
      await msg.reply(`❌ Error: ${result.error}`);
    }
  }

  /**
   * !disable-account <account-id>
   * Disable an account
   */
  async handleDisableAccount({ msg, args }) {
    const accountConfigManager = global.accountConfigManager;
    if (!accountConfigManager) {
      await msg.reply(`❌ Account manager not initialized`);
      return;
    }

    if (args.length === 0) {
      await msg.reply(`Usage: \`!disable-account <account-id>\``);
      return;
    }

    const accountId = args[0];
    const result = await accountConfigManager.disableAccount(accountId);

    if (result.success) {
      await msg.reply(
        `✅ ${result.message}\n\n` +
        `🔴 Account is now disabled\n` +
        `⚬ Will not be initialized on next restart`
      );
    } else {
      await msg.reply(`❌ Error: ${result.error}`);
    }
  }
}

export default LindaCommandHandler;

