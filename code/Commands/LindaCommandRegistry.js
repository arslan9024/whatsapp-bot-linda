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
    // CATEGORY 4.5: ACCOUNT MANAGEMENT (NEW - February 11, 2026)
    // ════════════════════════════════════════════════════════════════════════
    
    this.registerCommand({
      name: 'add-account',
      category: 'accounts',
      description: 'Add a new WhatsApp account',
      usage: '!add-account <phone> <name>',
      examples: [
        '!add-account +971501234567 "My Main Account"',
        '!add-account +971559876543 Main Office'
      ],
      requiresAuth: false,
      handler: 'AddAccountHandler',
      helpText: 'Adds a new WhatsApp account to Linda. Requires phone number and display name.'
    });

    this.registerCommand({
      name: 'list-accounts',
      category: 'accounts',
      description: 'List all configured WhatsApp accounts',
      usage: '!list-accounts',
      examples: [
        '!list-accounts',
        '!accounts'
      ],
      requiresAuth: false,
      handler: 'ListAccountsHandler',
      helpText: 'Shows all configured accounts, their status, and master account.'
    });

    this.registerCommand({
      name: 'remove-account',
      category: 'accounts',
      description: 'Remove a WhatsApp account',
      usage: '!remove-account <account-id>',
      examples: [
        '!remove-account account-1234567890',
        '!remove-account old-device'
      ],
      requiresAuth: true,
      handler: 'RemoveAccountHandler',
      helpText: 'Removes an account from Linda. Requires authentication.'
    });

    this.registerCommand({
      name: 'set-master',
      category: 'accounts',
      description: 'Set primary WhatsApp account',
      usage: '!set-master <account-id>',
      examples: [
        '!set-master account-1234567890',
        '!set-master main-office'
      ],
      requiresAuth: true,
      handler: 'SetMasterHandler',
      helpText: 'Sets the primary account for Linda operations. Requires authentication.'
    });

    this.registerCommand({
      name: 'enable-account',
      category: 'accounts',
      description: 'Enable a WhatsApp account',
      usage: '!enable-account <account-id>',
      examples: [
        '!enable-account account-1234567890'
      ],
      requiresAuth: true,
      handler: 'EnableAccountHandler',
      helpText: 'Enables an account. Will be initialized on next restart.'
    });

    this.registerCommand({
      name: 'disable-account',
      category: 'accounts',
      description: 'Disable a WhatsApp account',
      usage: '!disable-account <account-id>',
      examples: [
        '!disable-account account-1234567890'
      ],
      requiresAuth: true,
      handler: 'DisableAccountHandler',
      helpText: 'Disables an account. Will not be initialized on next restart.'
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

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 6: PHASE 1 - MESSAGE ENHANCEMENT (NEW)
    // ════════════════════════════════════════════════════════════════════════

    this.registerCommand({
      name: 'edit-msg',
      category: 'messageman',
      description: 'Edit a previously sent message',
      usage: '!edit-msg <messageId> <newContent>',
      examples: [
        '!edit-msg abc123 Updated information here',
        '!edit-msg 5678 Corrected spelling'
      ],
      requiresAuth: false,
      handler: 'EditMessageHandler',
      helpText: 'Edit your own message. Message ID found in message details.'
    });

    this.registerCommand({
      name: 'delete-msg',
      category: 'messageman',
      description: 'Delete a message',
      usage: '!delete-msg <messageId> [everyone]',
      examples: [
        '!delete-msg abc123',
        '!delete-msg def456 everyone'
      ],
      requiresAuth: false,
      handler: 'DeleteMessageHandler',
      helpText: 'Delete your message. Optionally delete for everyone.'
    });

    this.registerCommand({
      name: 'react',
      category: 'messageman',
      description: 'Add emoji reaction to message',
      usage: '!react <messageId> <emoji>',
      examples: [
        '!react abc123 ❤️',
        '!react def456 😂',
        '!react xyz789 🔥'
      ],
      requiresAuth: false,
      aliases: ['emoji', 'react-msg'],
      handler: 'ReactToMessageHandler',
      helpText: 'Emoji options: ❤️ 😂 😮 😢 🙏 🔥'
    });

    this.registerCommand({
      name: 'get-reactions',
      category: 'messageman',
      description: 'View all reactions on a message',
      usage: '!get-reactions <messageId>',
      examples: [
        '!get-reactions abc123',
        '!get-reactions msg-xyz'
      ],
      requiresAuth: false,
      aliases: ['view-reactions', 'reactions'],
      handler: 'GetReactionsHandler',
      helpText: 'Shows emoji count and details for all reactions.'
    });

    this.registerCommand({
      name: 'forward-msg',
      category: 'messageman',
      description: 'Forward message to another chat',
      usage: '!forward-msg <messageId> <chatId>',
      examples: [
        '!forward-msg abc123 971501234567',
        '!forward-msg def456 group-xyz'
      ],
      requiresAuth: false,
      handler: 'ForwardMessageHandler',
      helpText: 'Forward to another person or group.'
    });

    this.registerCommand({
      name: 'pin-msg',
      category: 'messageman',
      description: 'Pin a message in chat',
      usage: '!pin-msg <messageId>',
      examples: [
        '!pin-msg abc123',
        '!pin-msg important-msg'
      ],
      requiresAuth: false,
      handler: 'PinMessageHandler',
      helpText: 'Pin message to top of chat.'
    });

    this.registerCommand({
      name: 'unpin-msg',
      category: 'messageman',
      description: 'Unpin a message',
      usage: '!unpin-msg <messageId>',
      examples: [
        '!unpin-msg abc123'
      ],
      requiresAuth: false,
      handler: 'UnpinMessageHandler',
      helpText: 'Remove pin from message.'
    });

    this.registerCommand({
      name: 'star-msg',
      category: 'messageman',
      description: 'Star/bookmark a message',
      usage: '!star-msg <messageId>',
      examples: [
        '!star-msg abc123',
        '!save-msg important-msg'
      ],
      requiresAuth: false,
      aliases: ['bookmark-msg', 'favorite-msg'],
      handler: 'StarMessageHandler',
      helpText: 'Save message to favorites for quick access.'
    });

    this.registerCommand({
      name: 'reaction-stats',
      category: 'messageman',
      description: 'Get reaction statistics for chat',
      usage: '!reaction-stats [period]',
      examples: [
        '!reaction-stats',
        '!reaction-stats today',
        '!reaction-stats week'
      ],
      requiresAuth: false,
      aliases: ['emoji-stats', 'sentiment'],
      handler: 'ReactionStatsHandler',
      helpText: 'Show emoji breakdown and sentiment trends.'
    });

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 7: PHASE 1 - GROUP MANAGEMENT (NEW)
    // ════════════════════════════════════════════════════════════════════════

    this.registerCommand({
      name: 'create-group',
      category: 'groups',
      description: 'Create a new WhatsApp group',
      usage: '!create-group <name> <phone1> <phone2>...',
      examples: [
        '!create-group "Team Meeting" 971501234567 971509876543',
        '!create-group "Project Alpha" +971501234567 +971509876543'
      ],
      requiresAuth: true,
      handler: 'CreateGroupHandler',
      helpText: 'Creates group with specified members. Minimum 1 member required.'
    });

    this.registerCommand({
      name: 'add-group',
      category: 'groups',
      description: 'Add members to existing group',
      usage: '!add-group <groupId> <phone1> <phone2> ...',
      examples: [
        '!add-group group-123 971501234567 971509876543',
        '!add-group teams +971501234567'
      ],
      requiresAuth: true,
      aliases: ['invite-group'],
      handler: 'AddGroupMembersHandler',
      helpText: 'Add one or more members to group.'
    });

    this.registerCommand({
      name: 'remove-group',
      category: 'groups',
      description: 'Remove members from group',
      usage: '!remove-group <groupId> <phone>',
      examples: [
        '!remove-group group-123 971501234567',
        '!kick-group teams +971509876543'
      ],
      requiresAuth: true,
      aliases: ['kick-group'],
      handler: 'RemoveGroupMembersHandler',
      helpText: 'Remove member(s) from group.'
    });

    this.registerCommand({
      name: 'promote-admin',
      category: 'groups',
      description: 'Promote member to group admin',
      usage: '!promote-admin <groupId> <phone>',
      examples: [
        '!promote-admin group-123 971501234567',
        '!make-admin teams +971509876543'
      ],
      requiresAuth: true,
      handler: 'PromoteAdminHandler',
      helpText: 'Give admin privileges to group member.'
    });

    this.registerCommand({
      name: 'demote-admin',
      category: 'groups',
      description: 'Demote group admin',
      usage: '!demote-admin <groupId> <phone>',
      examples: [
        '!demote-admin group-123 971501234567',
        '!remove-admin teams +971509876543'
      ],
      requiresAuth: true,
      handler: 'DemoteAdminHandler',
      helpText: 'Remove admin privileges from member.'
    });

    this.registerCommand({
      name: 'group-info',
      category: 'groups',
      description: 'Get group information',
      usage: '!group-info <groupId>',
      examples: [
        '!group-info group-123',
        '!group-info teams'
      ],
      requiresAuth: false,
      aliases: ['group-details', 'ginfo'],
      handler: 'GroupInfoHandler',
      helpText: 'Shows members, admins, description, creation date.'
    });

    this.registerCommand({
      name: 'group-invite',
      category: 'groups',
      description: 'Get/share group invite link',
      usage: '!group-invite <groupId>',
      examples: [
        '!group-invite group-123',
        '!group-invite teams'
      ],
      requiresAuth: false,
      handler: 'GroupInviteHandler',
      helpText: 'Generate shareable invite link for group.'
    });

    this.registerCommand({
      name: 'group-members',
      category: 'groups',
      description: 'List all group members',
      usage: '!group-members <groupId>',
      examples: [
        '!group-members group-123',
        '!members teams'
      ],
      requiresAuth: false,
      aliases: ['members'],
      handler: 'GroupMembersHandler',
      helpText: 'Shows all members with admin status.'
    });

    this.registerCommand({
      name: 'approval-requests',
      category: 'groups',
      description: 'View pending group membership requests',
      usage: '!approval-requests <groupId>',
      examples: [
        '!approval-requests group-123',
        '!pending-requests teams'
      ],
      requiresAuth: true,
      aliases: ['pending-requests'],
      handler: 'MembershipRequestsHandler',
      helpText: 'Show users waiting to join group.'
    });

    this.registerCommand({
      name: 'approve-request',
      category: 'groups',
      description: 'Approve membership request',
      usage: '!approve-request <groupId> <userId>',
      examples: [
        '!approve-request group-123 user-xyz',
        '!approve teams +971501234567'
      ],
      requiresAuth: true,
      handler: 'ApproveRequestHandler',
      helpText: 'Allow user to join group.'
    });

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 8: PHASE 1 - CHAT ORGANIZATION (NEW)
    // ════════════════════════════════════════════════════════════════════════

    this.registerCommand({
      name: 'pin-chat',
      category: 'chatorg',
      description: 'Pin chat to top of list',
      usage: '!pin-chat <chatId>',
      examples: [
        '!pin-chat 971501234567',
        '!pin contact-name'
      ],
      requiresAuth: false,
      handler: 'PinChatHandler',
      helpText: 'Pin conversation to show at top.'
    });

    this.registerCommand({
      name: 'unpin-chat',
      category: 'chatorg',
      description: 'Unpin chat',
      usage: '!unpin-chat <chatId>',
      examples: [
        '!unpin-chat 971501234567'
      ],
      requiresAuth: false,
      handler: 'UnpinChatHandler',
      helpText: 'Remove pin from conversation.'
    });

    this.registerCommand({
      name: 'archive-chat',
      category: 'chatorg',
      description: 'Archive conversation',
      usage: '!archive-chat <chatId>',
      examples: [
        '!archive-chat 971501234567',
        '!archive contact'
      ],
      requiresAuth: false,
      handler: 'ArchiveChatHandler',
      helpText: 'Move chat to archived section.'
    });

    this.registerCommand({
      name: 'unarchive-chat',
      category: 'chatorg',
      description: 'Unarchive conversation',
      usage: '!unarchive-chat <chatId>',
      examples: [
        '!unarchive-chat 971501234567'
      ],
      requiresAuth: false,
      handler: 'UnarchiveChatHandler',
      helpText: 'Restore archived conversation.'
    });

    this.registerCommand({
      name: 'mute-chat',
      category: 'chatorg',
      description: 'Mute chat notifications',
      usage: '!mute-chat <chatId> [duration]',
      examples: [
        '!mute-chat 971501234567',
        '!mute-chat contact 3600'
      ],
      requiresAuth: false,
      handler: 'MuteChatHandler',
      helpText: 'Silence notifications. Duration in seconds (0=indefinite).'
    });

    this.registerCommand({
      name: 'unmute-chat',
      category: 'chatorg',
      description: 'Unmute chat',
      usage: '!unmute-chat <chatId>',
      examples: [
        '!unmute-chat 971501234567'
      ],
      requiresAuth: false,
      handler: 'UnmuteChatHandler',
      helpText: 'Restore notifications.'
    });

    this.registerCommand({
      name: 'label-chat',
      category: 'chatorg',
      description: 'Add label to chat',
      usage: '!label-chat <chatId> <label>',
      examples: [
        '!label-chat 971501234567 premium',
        '!tag-chat contact vip'
      ],
      requiresAuth: false,
      aliases: ['tag-chat'],
      handler: 'LabelChatHandler',
      helpText: 'Organize chats with custom labels.'
    });

    this.registerCommand({
      name: 'list-starred',
      category: 'chatorg',
      description: 'Show all starred messages',
      usage: '!list-starred',
      examples: [
        '!list-starred',
        '!favorites'
      ],
      requiresAuth: false,
      aliases: ['favorites', 'bookmarks'],
      handler: 'ListStarredHandler',
      helpText: 'Display all bookmarked messages across chats.'
    });

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 9: PHASE 1 - ADVANCED CONTACTS (NEW)
    // ════════════════════════════════════════════════════════════════════════

    this.registerCommand({
      name: 'block',
      category: 'contacts',
      description: 'Block a contact',
      usage: '!block <phone>',
      examples: [
        '!block 971501234567',
        '!block spam-number'
      ],
      requiresAuth: false,
      handler: 'BlockContactHandler',
      helpText: 'Prevent contact from contacting you.'
    });

    this.registerCommand({
      name: 'unblock',
      category: 'contacts',
      description: 'Unblock a contact',
      usage: '!unblock <phone>',
      examples: [
        '!unblock 971501234567'
      ],
      requiresAuth: false,
      handler: 'UnblockContactHandler',
      helpText: 'Restore blocked contact.'
    });

    this.registerCommand({
      name: 'blocked-list',
      category: 'contacts',
      description: 'Show all blocked contacts',
      usage: '!blocked-list',
      examples: [
        '!blocked-list',
        '!blocks'
      ],
      requiresAuth: false,
      aliases: ['blocks'],
      handler: 'BlockedListHandler',
      helpText: 'View all blocked users.'
    });

    this.registerCommand({
      name: 'contact-status',
      category: 'contacts',
      description: 'Get contact\'s status/bio',
      usage: '!contact-status <phone>',
      examples: [
        '!contact-status 971501234567',
        '!about @contact-name'
      ],
      requiresAuth: false,
      aliases: ['contact-about'],
      handler: 'ContactStatusHandler',
      helpText: 'Show user\'s WhatsApp status/bio.'
    });

    this.registerCommand({
      name: 'contact-info',
      category: 'contacts',
      description: 'Get detailed contact information',
      usage: '!contact-info <phone>',
      examples: [
        '!contact-info 971501234567',
        '!info @contact-name'
      ],
      requiresAuth: false,
      aliases: ['info'],
      handler: 'ContactInfoHandler',
      helpText: 'Show profile pic, status, devices, account type.'
    });

    this.registerCommand({
      name: 'common-groups',
      category: 'contacts',
      description: 'Find common groups with contact',
      usage: '!common-groups <phone>',
      examples: [
        '!common-groups 971501234567',
        '!shared-groups @contact'
      ],
      requiresAuth: false,
      aliases: ['shared-groups'],
      handler: 'CommonGroupsHandler',
      helpText: 'Show groups you both are members of.'
    });

    this.registerCommand({
      name: 'verify-whatsapp',
      category: 'contacts',
      description: 'Check if number is on WhatsApp',
      usage: '!verify-whatsapp <phone>',
      examples: [
        '!verify-whatsapp 971501234567',
        '!on-wa +971501234567'
      ],
      requiresAuth: false,
      aliases: ['on-wa'],
      handler: 'VerifyWhatsAppHandler',
      helpText: 'Validate if number has WhatsApp account.'
    });

    this.registerCommand({
      name: 'profile-picture',
      category: 'contacts',
      description: 'Get contact\'s profile picture',
      usage: '!profile-picture <phone>',
      examples: [
        '!profile-picture 971501234567',
        '!pic @contact-name'
      ],
      requiresAuth: false,
      aliases: ['pic', 'avatar'],
      handler: 'ProfilePictureHandler',
      helpText: 'Download and show contact profile picture.'
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
