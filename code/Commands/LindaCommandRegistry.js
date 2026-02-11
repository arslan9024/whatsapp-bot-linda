/**
 * LINDA COMMAND REGISTRY
 * ═══════════════════════════════════════════════════════════════════════════
 * Centralized registry of all Linda AI Assistant commands
 * Provides command metadata, help, and validation
 * 
 * Command Categories:
 * 1. WhatsApp Management - Device linking, account control, session management
 * 2. Google Contacts - Contact lookup, sync, add, update, delete
 * 3. Google Sheets - Query, add data, update sheets, create reports
 * 4. Admin - Configuration, diagnostics, status, health monitoring
 * 5. Learning - Conversation logging, feedback, ML training data
 * 
 * Feature: Automatic help generation, command validation, usage tracking
 */

export class LindaCommandRegistry {
  constructor() {
    this.commands = new Map();
    this.commandsByCategory = new Map();
    this.initializeCommands();
  }

  /**
   * Initialize all available commands
   */
  initializeCommands() {
    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 1: WHATSAPP DEVICE MANAGEMENT
    // ════════════════════════════════════════════════════════════════════════
    
    this.registerCommand({
      name: 'link-device',
      category: 'whatsapp',
      description: 'Link a new WhatsApp device to Linda',
      usage: '!link-device <device-name>',
      examples: [
        '!link-device my-phone',
        '!link-device office-iphone'
      ],
      requiresAuth: false,
      handler: 'LinkDeviceHandler',
      helpText: 'Starts device linking flow with QR code. Perfect for adding new accounts.'
    });

    this.registerCommand({
      name: 'relink-device',
      category: 'whatsapp',
      description: 'Re-link an existing WhatsApp device',
      usage: '!relink-device <device-number>',
      examples: [
        '!relink-device 971501234567',
        '!relink-device +971501234567'
      ],
      requiresAuth: false,
      handler: 'RelinkDeviceHandler',
      helpText: 'Re-authenticate an existing device. Use when session expires.'
    });

    this.registerCommand({
      name: 'unlink-device',
      category: 'whatsapp',
      description: 'Unlink a WhatsApp device from Linda',
      usage: '!unlink-device <device-number>',
      examples: [
        '!unlink-device 971501234567',
        '!unlink-device master'
      ],
      requiresAuth: true,
      handler: 'UnlinkDeviceHandler',
      helpText: 'Removes device from Linda. Requires admin authentication.'
    });

    this.registerCommand({
      name: 'list-devices',
      category: 'whatsapp',
      description: 'List all linked WhatsApp devices',
      usage: '!list-devices',
      examples: [
        '!list-devices',
        '!devices'
      ],
      requiresAuth: false,
      handler: 'ListDevicesHandler',
      helpText: 'Shows all connected devices, their status, and last activity.'
    });

    this.registerCommand({
      name: 'device-status',
      category: 'whatsapp',
      description: 'Get detailed status of a specific device',
      usage: '!device-status <device-number>',
      examples: [
        '!device-status 971501234567',
        '!device-status master'
      ],
      requiresAuth: false,
      handler: 'DeviceStatusHandler',
      helpText: 'Shows device connection status, battery, signal, and last message.'
    });

    this.registerCommand({
      name: 'switch-device',
      category: 'whatsapp',
      description: 'Switch active device for sending messages',
      usage: '!switch-device <device-number>',
      examples: [
        '!switch-device 971501234567',
        '!switch-device default'
      ],
      requiresAuth: true,
      handler: 'SwitchDeviceHandler',
      helpText: 'Makes a device the default for outbound messages.'
    });

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 2: GOOGLE CONTACTS MANAGEMENT (via GorahaBot)
    // ════════════════════════════════════════════════════════════════════════
    
    this.registerCommand({
      name: 'find-contact',
      category: 'contacts',
      description: 'Find a person in Google Contacts',
      usage: '!find-contact <name-or-number>',
      examples: [
        '!find-contact Ahmed Al-Mansoori',
        '!find-contact 971501234567',
        '!find Ahmed'
      ],
      requiresAuth: false,
      handler: 'FindContactHandler',
      helpText: 'Search Google Contacts by name or phone number. Returns all matches.'
    });

    this.registerCommand({
      name: 'add-contact',
      category: 'contacts',
      description: 'Add a new contact to Google Contacts',
      usage: '!add-contact <name> <phone> [email] [company]',
      examples: [
        '!add-contact Ahmed Al-Mansoori 971501234567 ahmed@realtygroup.ae Realty Group',
        '!add-contact Fatima 971509876543'
      ],
      requiresAuth: true,
      handler: 'AddContactHandler',
      helpText: 'Adds new contact to Google Contacts. Company optional. Requires auth.'
    });

    this.registerCommand({
      name: 'update-contact',
      category: 'contacts',
      description: 'Update an existing contact',
      usage: '!update-contact <contact-id> <field> <value>',
      examples: [
        '!update-contact c123 phone 971501111111',
        '!update-contact c456 email newemail@example.com',
        '!update-contact c789 company Real Estate King'
      ],
      requiresAuth: true,
      handler: 'UpdateContactHandler',
      helpText: 'Updates specific contact fields. Supports: phone, email, company, notes.'
    });

    this.registerCommand({
      name: 'delete-contact',
      category: 'contacts',
      description: 'Delete a contact from Google Contacts',
      usage: '!delete-contact <contact-id>',
      examples: [
        '!delete-contact c123',
        '!delete-contact contact_abc123'
      ],
      requiresAuth: true,
      handler: 'DeleteContactHandler',
      helpText: 'Permanently removes contact. Requires admin authentication.'
    });

    this.registerCommand({
      name: 'sync-contacts',
      category: 'contacts',
      description: 'Sync Google Contacts with WhatsApp',
      usage: '!sync-contacts [limit]',
      examples: [
        '!sync-contacts',
        '!sync-contacts 50',
        '!sync-contacts all'
      ],
      requiresAuth: true,
      handler: 'SyncContactsHandler',
      helpText: 'Synchronizes Google Contacts with WhatsApp. Updates availability status.'
    });

    this.registerCommand({
      name: 'verify-contacts',
      category: 'contacts',
      description: 'Verify which contacts have WhatsApp',
      usage: '!verify-contacts [count]',
      examples: [
        '!verify-contacts',
        '!verify-contacts 100',
        '!verify-goraha'
      ],
      requiresAuth: false,
      handler: 'VerifyContactsHandler',
      helpText: 'Checks WhatsApp availability for contacts. Reports coverage percentage.'
    });

    this.registerCommand({
      name: 'contact-stats',
      category: 'contacts',
      description: 'Get statistics about contacts',
      usage: '!contact-stats',
      examples: [
        '!contact-stats',
        '!contacts-status'
      ],
      requiresAuth: false,
      handler: 'ContactStatsHandler',
      helpText: 'Shows total contacts, WhatsApp coverage, groups, and last sync time.'
    });

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 3: GOOGLE SHEETS MANAGEMENT (via PowerAgent)
    // ════════════════════════════════════════════════════════════════════════
    
    this.registerCommand({
      name: 'list-sheets',
      category: 'sheets',
      description: 'List all accessible Google Sheets',
      usage: '!list-sheets',
      examples: [
        '!list-sheets',
        '!sheets'
      ],
      requiresAuth: false,
      handler: 'ListSheetsHandler',
      helpText: 'Shows all Google Sheets in Drive. Includes size and last modified.'
    });

    this.registerCommand({
      name: 'sheet-info',
      category: 'sheets',
      description: 'Get information about a specific sheet',
      usage: '!sheet-info <sheet-id-or-name>',
      examples: [
        '!sheet-info Leads Database',
        '!sheet-info 1BxiMVs0XRA5nFMKUVfIstTZisDxQvDFrQH7YWrGYds'
      ],
      requiresAuth: false,
      handler: 'SheetInfoHandler',
      helpText: 'Shows sheet tabs, row count, column count, and last edit info.'
    });

    this.registerCommand({
      name: 'query-sheet',
      category: 'sheets',
      description: 'Query data from a Google Sheet',
      usage: '!query-sheet <sheet-name> <query>',
      examples: [
        '!query-sheet Leads "Dubai" "12-2025"',
        '!query-sheet Sales status=active'
      ],
      requiresAuth: false,
      handler: 'QuerySheetHandler',
      helpText: 'Queries sheet using simple filters or SQL-like syntax.'
    });

    this.registerCommand({
      name: 'add-row',
      category: 'sheets',
      description: 'Add a new row to a Google Sheet',
      usage: '!add-row <sheet-name> <field1:value1> <field2:value2> ...',
      examples: [
        '!add-row Leads name:Ahmed phone:971501234567 location:Dubai',
        '!add-row Sales product:Villa amount:2500000 date:2025-12-25'
      ],
      requiresAuth: true,
      handler: 'AddRowHandler',
      helpText: 'Appends new row with specified data. Auto-maps to columns.'
    });

    this.registerCommand({
      name: 'update-row',
      category: 'sheets',
      description: 'Update an existing row in a Google Sheet',
      usage: '!update-row <sheet-name> <row-id> <field:value> ...',
      examples: [
        '!update-row Leads row123 status:qualified date:2025-12-26',
        '!update-row Sales row456 amount:2700000'
      ],
      requiresAuth: true,
      handler: 'UpdateRowHandler',
      helpText: 'Updates specific row. Use row ID or first column match.'
    });

    this.registerCommand({
      name: 'delete-row',
      category: 'sheets',
      description: 'Delete a row from a Google Sheet',
      usage: '!delete-row <sheet-name> <row-id>',
      examples: [
        '!delete-row Leads row123',
        '!delete-row Sales row456'
      ],
      requiresAuth: true,
      handler: 'DeleteRowHandler',
      helpText: 'Removes row by ID. Requires admin authentication.'
    });

    this.registerCommand({
      name: 'create-report',
      category: 'sheets',
      description: 'Generate a report from sheet data',
      usage: '!create-report <sheet-name> [filters]',
      examples: [
        '!create-report Sales',
        '!create-report Leads location=Dubai status=active',
        '!create-report Monthly Revenue'
      ],
      requiresAuth: false,
      handler: 'CreateReportHandler',
      helpText: 'Generates formatted report with summaries and statistics.'
    });

    this.registerCommand({
      name: 'export-sheet',
      category: 'sheets',
      description: 'Export sheet data to file',
      usage: '!export-sheet <sheet-name> [format]',
      examples: [
        '!export-sheet Leads csv',
        '!export-sheet Sales json',
        '!export-sheet Contacts xlsx'
      ],
      requiresAuth: true,
      handler: 'ExportSheetHandler',
      helpText: 'Exports sheet as CSV, JSON, or XLSX. Formats available.'
    });

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 4: ADMIN & SYSTEM COMMANDS
    // ════════════════════════════════════════════════════════════════════════
    
    this.registerCommand({
      name: 'status',
      category: 'admin',
      description: 'Get Linda\'s current status',
      usage: '!status',
      examples: [
        '!status',
        '!health'
      ],
      requiresAuth: false,
      handler: 'StatusHandler',
      helpText: 'Shows uptime, active devices, memory usage, and system health.'
    });

    this.registerCommand({
      name: 'health',
      category: 'admin',
      description: 'Get system health details',
      usage: '!health [detail-level]',
      examples: [
        '!health',
        '!health full',
        '!diagnostics'
      ],
      requiresAuth: false,
      handler: 'HealthHandler',
      helpText: 'Detailed health report: performance, connections, errors, logs.'
    });

    this.registerCommand({
      name: 'config',
      category: 'admin',
      description: 'View or update Linda\'s configuration',
      usage: '!config [key] [value]',
      examples: [
        '!config',
        '!config auto-reply on',
        '!config response-timeout 30'
      ],
      requiresAuth: true,
      handler: 'ConfigHandler',
      helpText: 'View current config or update settings. Requires authentication.'
    });

    this.registerCommand({
      name: 'restart',
      category: 'admin',
      description: 'Restart Linda (system restart)',
      usage: '!restart [delay]',
      examples: [
        '!restart',
        '!restart 60'
      ],
      requiresAuth: true,
      handler: 'RestartHandler',
      helpText: 'Gracefully restarts bot. Optional delay in seconds.'
    });

    this.registerCommand({
      name: 'logs',
      category: 'admin',
      description: 'Get recent bot logs',
      usage: '!logs [count] [level]',
      examples: [
        '!logs',
        '!logs 50',
        '!logs 100 error'
      ],
      requiresAuth: true,
      handler: 'LogsHandler',
      helpText: 'Retrieves recent logs. Optional: count and severity level.'
    });

    this.registerCommand({
      name: 'authenticate',
      category: 'admin',
      description: 'Authenticate for admin commands',
      usage: '!authenticate <password>',
      examples: [
        '!authenticate mypassword'
      ],
      requiresAuth: false,
      handler: 'AuthenticateHandler',
      helpText: 'One-time authentication for admin commands. Valid for session.'
    });

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 5: LEARNING & CONVERSATION LOGGING
    // ════════════════════════════════════════════════════════════════════════
    
    this.registerCommand({
      name: 'learn',
      category: 'learning',
      description: 'Log a conversation for ML training',
      usage: '!learn <message> => <response>',
      examples: [
        '!learn What are your rates? => We offer competitive market rates for all properties.',
        '!learn Can I schedule a tour? => Yes, tours available Monday-Friday 9am-6pm.'
      ],
      requiresAuth: false,
      handler: 'LearnHandler',
      helpText: 'Teaches Linda about conversations for future auto-replies.'
    });

    this.registerCommand({
      name: 'feedback',
      category: 'learning',
      description: 'Send feedback about Linda\'s response',
      usage: '!feedback <positive|negative> <message-id> "<comment>"',
      examples: [
        '!feedback positive msg123 "Perfect response!"',
        '!feedback negative msg456 "Should have offered tour"'
      ],
      requiresAuth: false,
      handler: 'FeedbackHandler',
      helpText: 'Helps improve Linda\'s responses. Used for training.'
    });

    this.registerCommand({
      name: 'conversation-stats',
      category: 'learning',
      description: 'Get conversation learning statistics',
      usage: '!conversation-stats',
      examples: [
        '!conversation-stats',
        '!learn-stats'
      ],
      requiresAuth: false,
      handler: 'ConversationStatsHandler',
      helpText: 'Shows learned patterns, frequently asked questions, training data.'
    });

    // ════════════════════════════════════════════════════════════════════════
    // SPECIAL COMMANDS
    // ════════════════════════════════════════════════════════════════════════
    
    this.registerCommand({
      name: 'help',
      category: 'special',
      description: 'Show help information',
      usage: '!help [command-name]',
      examples: [
        '!help',
        '!help find-contact',
        '!?'
      ],
      requiresAuth: false,
      handler: 'HelpHandler',
      helpText: 'Shows command help. Optionally for specific commands.'
    });

    this.registerCommand({
      name: 'ping',
      category: 'special',
      description: 'Check if Linda is responsive',
      usage: '!ping',
      examples: [
        '!ping'
      ],
      requiresAuth: false,
      handler: 'PingHandler',
      helpText: 'Simple connectivity test. Linda responds with pong.'
    });
  }

  /**
   * Register a command
   */
  registerCommand(commandData) {
    const {
      name,
      category,
      description,
      usage,
      examples,
      requiresAuth,
      handler,
      helpText
    } = commandData;

    this.commands.set(name, {
      name,
      category,
      description,
      usage,
      examples,
      requiresAuth,
      handler,
      helpText,
      aliases: commandData.aliases || [],
      enabled: true
    });

    if (!this.commandsByCategory.has(category)) {
      this.commandsByCategory.set(category, []);
    }
    this.commandsByCategory.get(category).push(name);
  }

  /**
   * Get a command by name
   */
  getCommand(name) {
    // Check direct name
    let cmd = this.commands.get(name);
    if (cmd) return cmd;

    // Check aliases
    for (const [cmdName, cmdData] of this.commands) {
      if (cmdData.aliases && cmdData.aliases.includes(name)) {
        return cmdData;
      }
    }

    return null;
  }

  /**
   * Get all commands
   */
  getAllCommands() {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category) {
    const cmdNames = this.commandsByCategory.get(category) || [];
    return cmdNames.map(name => this.commands.get(name));
  }

  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.commandsByCategory.keys());
  }

  /**
   * Get help text for all commands
   */
  getHelpText(commandName = null) {
    if (!commandName) {
      // Return help for all commands grouped by category
      const helpText = {};
      for (const category of this.getCategories()) {
        const commands = this.getCommandsByCategory(category);
        helpText[category] = commands.map(cmd => ({
          name: cmd.name,
          description: cmd.description,
          usage: cmd.usage
        }));
      }
      return helpText;
    }

    // Return specific command help
    const cmd = this.getCommand(commandName);
    return cmd || null;
  }

  /**
   * Validate a command
   */
  isValidCommand(name) {
    return this.commands.has(name) || 
           Array.from(this.commands.values()).some(cmd => 
             cmd.aliases && cmd.aliases.includes(name)
           );
  }

  /**
   * Get command count
   */
  getCommandCount() {
    return this.commands.size;
  }

  /**
   * Get category count
   */
  getCategoryCount() {
    return this.commandsByCategory.size;
  }
}

export default new LindaCommandRegistry();
