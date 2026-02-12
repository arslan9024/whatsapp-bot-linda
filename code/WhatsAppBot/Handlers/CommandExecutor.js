/**
 * Command Executor for Linda WhatsApp Bot
 * Handles all Linda commands for WhatsApp, Google Contacts, Google Sheets, and learning
 * 
 * Supported Commands:
 * - WhatsApp Commands: /whatsapp list, /whatsapp add, /whatsapp switch, /whatsapp status
 * - Google Contacts: /contacts sync, /contacts list, /contacts add, /contacts update
 * - Google Sheets: /sheets list, /sheets create, /sheets append, /sheets query
 * - Learning: /learn, /teach, /feedback, /insights
 * 
 * Version: 1.0.0
 * Created: February 26, 2026
 * Phase: 6 M2 Module 1
 */

const logger = require('../Integration/Google/utils/logger');

class CommandExecutor {
  constructor(options = {}) {
    this.commands = new Map();
    this.commandHistory = [];
    this.userContexts = new Map();
    this.initialized = false;
    this.whatsappService = options.whatsappService;
    this.contactsService = options.contactsService;
    this.sheetsService = options.sheetsService;
    this.conversationEngine = options.conversationEngine;
  }

  /**
   * Initialize command executor
   */
  async initialize() {
    try {
      this.registerBuiltInCommands();
      this.initialized = true;
      logger.info('Command Executor initialized successfully');
      return { success: true, message: 'Command executor ready' };
    } catch (error) {
      logger.error('Failed to initialize command executor', { error: error.message });
      throw error;
    }
  }

  /**
   * Register built-in commands
   */
  registerBuiltInCommands() {
    // WhatsApp commands
    this.registerCommand('whatsapp', this.handleWhatsAppCommand.bind(this));
    this.registerCommand('wa', this.handleWhatsAppCommand.bind(this));

    // Google Contacts commands
    this.registerCommand('contacts', this.handleContactsCommand.bind(this));
    this.registerCommand('contact', this.handleContactsCommand.bind(this));

    // Google Sheets commands
    this.registerCommand('sheets', this.handleSheetsCommand.bind(this));
    this.registerCommand('sheet', this.handleSheetsCommand.bind(this));

    // Learning commands
    this.registerCommand('learn', this.handleLearningCommand.bind(this));
    this.registerCommand('teach', this.handleLearningCommand.bind(this));
    this.registerCommand('feedback', this.handleLearningCommand.bind(this));

    // System commands
    this.registerCommand('help', this.handleHelpCommand.bind(this));
    this.registerCommand('status', this.handleStatusCommand.bind(this));
  }

  /**
   * Register a command
   */
  registerCommand(commandName, handler) {
    // Handle both (name, handler) and (configObject) signatures
    if (typeof commandName === 'object' && commandName.name) {
      const config = commandName;
      this.commands.set(config.name.toLowerCase(), {
        name: config.name,
        handler: config.handler,
        registeredAt: new Date().toISOString()
      });
      logger.info('Command registered', { commandName: config.name });
      return;
    }

    // Standard (name, handler) signature
    if (typeof commandName !== 'string') {
      throw new Error('Command name must be a string');
    }

    this.commands.set(commandName.toLowerCase(), {
      name: commandName,
      handler,
      registeredAt: new Date().toISOString()
    });

    logger.info('Command registered', { commandName });
  }

  /**
   * Execute a command
   */
  async executeCommand(userId, input) {
    try {
      const parsed = this.parseCommand(input);
      if (!parsed) {
        return {
          success: false,
          message: 'Invalid command format'
        };
      }

      const command = this.commands.get(parsed.command.toLowerCase());
      if (!command) {
        return {
          success: false,
          message: `Unknown command: ${parsed.command}`
        };
      }

      // Get or create user context
      const context = this.getUserContext(userId);
      context.lastCommand = parsed.command;
      context.lastInput = input;

      // Execute the command
      const result = await command.handler({
        userId,
        subcommand: parsed.subcommand,
        args: parsed.args,
        flags: parsed.flags,
        context
      });

      // Record in history
      this.recordCommand({
        userId,
        command: parsed.command,
        subcommand: parsed.subcommand,
        args: parsed.args,
        result: result.success,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      logger.error('Command execution failed', { error: error.message, input });
      return {
        success: false,
        message: `Error executing command: ${error.message}`
      };
    }
  }

  /**
   * Handle WhatsApp commands
   */
  async handleWhatsAppCommand(params) {
    const { subcommand, args, flags } = params;

    switch (subcommand?.toLowerCase()) {
      case 'list':
        return this.whatsappService?.listAccounts?.() || {
          success: false,
          message: 'WhatsApp service not available'
        };

      case 'add':
        return this.whatsappService?.addAccount?.(args[0]) || {
          success: false,
          message: 'WhatsApp service not available'
        };

      case 'switch':
        return this.whatsappService?.switchAccount?.(args[0]) || {
          success: false,
          message: 'WhatsApp service not available'
        };

      case 'status':
        return this.whatsappService?.getStatus?.() || {
          success: false,
          message: 'WhatsApp service not available'
        };

      case 'send':
        return this.whatsappService?.sendMessage?.({
          to: args[0],
          message: args.slice(1).join(' ')
        }) || {
          success: false,
          message: 'WhatsApp service not available'
        };

      default:
        return {
          success: false,
          message: 'Unknown WhatsApp subcommand. Use: list, add, switch, status, send'
        };
    }
  }

  /**
   * Handle Google Contacts commands
   */
  async handleContactsCommand(params) {
    const { subcommand, args, flags } = params;

    switch (subcommand?.toLowerCase()) {
      case 'sync':
        return this.contactsService?.syncContacts?.() || {
          success: false,
          message: 'Contacts service not available'
        };

      case 'list':
        return this.contactsService?.listContacts?.({
          limit: flags?.limit || 10
        }) || {
          success: false,
          message: 'Contacts service not available'
        };

      case 'add':
        return this.contactsService?.addContact?.({
          name: args[0],
          phone: args[1],
          email: args[2]
        }) || {
          success: false,
          message: 'Contacts service not available'
        };

      case 'update':
        return this.contactsService?.updateContact?.({
          contactId: args[0],
          updates: this.parseUpdateArgs(args.slice(1))
        }) || {
          success: false,
          message: 'Contacts service not available'
        };

      case 'search':
        return this.contactsService?.searchContacts?.(args[0]) || {
          success: false,
          message: 'Contacts service not available'
        };

      default:
        return {
          success: false,
          message: 'Unknown contacts subcommand. Use: sync, list, add, update, search'
        };
    }
  }

  /**
   * Handle Google Sheets commands
   */
  async handleSheetsCommand(params) {
    const { subcommand, args, flags } = params;

    switch (subcommand?.toLowerCase()) {
      case 'list':
        return this.sheetsService?.listSheets?.() || {
          success: false,
          message: 'Sheets service not available'
        };

      case 'create':
        return this.sheetsService?.createSheet?.({
          title: args[0],
          headers: args.slice(1)
        }) || {
          success: false,
          message: 'Sheets service not available'
        };

      case 'append':
        return this.sheetsService?.appendRow?.({
          sheetId: args[0],
          row: args.slice(1)
        }) || {
          success: false,
          message: 'Sheets service not available'
        };

      case 'query':
        return this.sheetsService?.querySheet?.({
          sheetId: args[0],
          query: args.slice(1).join(' ')
        }) || {
          success: false,
          message: 'Sheets service not available'
        };

      default:
        return {
          success: false,
          message: 'Unknown sheets subcommand. Use: list, create, append, query'
        };
    }
  }

  /**
   * Handle learning commands
   */
  async handleLearningCommand(params) {
    const { userId, subcommand, args, context } = params;

    switch (subcommand?.toLowerCase()) {
      case 'from':
      case 'add':
        // Linda learns from the provided text
        context.learnings = context.learnings || [];
        context.learnings.push({
          text: args.join(' '),
          learnedAt: new Date().toISOString()
        });
        return {
          success: true,
          message: 'Learned from input',
          learnedCount: context.learnings.length
        };

      case 'list':
        return {
          success: true,
          learnings: context.learnings || [],
          count: (context.learnings || []).length
        };

      case 'feedback':
        return this.conversationEngine?.learnFromFeedback?.(
          args[0],
          {
            rating: parseInt(args[1]) || 5,
            comment: args.slice(2).join(' ')
          }
        ) || {
          success: false,
          message: 'Conversation engine not available'
        };

      case 'insights':
        return this.conversationEngine?.getConversationInsights?.(args[0]) || {
          success: false,
          message: 'Conversation engine not available'
        };

      default:
        return {
          success: false,
          message: 'Unknown learning subcommand. Use: add, list, feedback, insights'
        };
    }
  }

  /**
   * Handle help command
   */
  async handleHelpCommand(params) {
    const { args } = params;

    const helpText = {
      whatsapp: `
        WhatsApp Commands:
        /whatsapp list - List all accounts
        /whatsapp add <number> - Add new WhatsApp account
        /whatsapp switch <number> - Switch active account
        /whatsapp status - Get current status
        /whatsapp send <number> <message> - Send message
      `,
      contacts: `
        Contacts Commands:
        /contacts sync - Sync Google Contacts
        /contacts list - List contacts
        /contacts add <name> <phone> [email] - Add contact
        /contacts update <id> <field> <value> - Update contact
        /contacts search <query> - Search contacts
      `,
      sheets: `
        Sheets Commands:
        /sheets list - List all sheets
        /sheets create <title> [headers] - Create sheet
        /sheets append <sheetId> [data] - Append row
        /sheets query <sheetId> <query> - Query sheet
      `,
      learn: `
        Learning Commands:
        /learn add <text> - Add learning
        /learn list - List learnings
        /learn feedback <conversationId> <rating> [comment] - Provide feedback
        /learn insights <conversationId> - Get insights
      `
    };

    const topic = args?.[0]?.toLowerCase() || 'all';

    if (topic === 'all') {
      return {
        success: true,
        help: Object.values(helpText).join('\n')
      };
    }

    return {
      success: true,
      help: helpText[topic] || `Unknown topic: ${topic}`
    };
  }

  /**
   * Handle status command
   */
  async handleStatusCommand(params) {
    const { context } = params;

    return {
      success: true,
      status: {
        whatsappConnected: !!this.whatsappService,
        contactsConnected: !!this.contactsService,
        sheetsConnected: !!this.sheetsService,
        learningEnabled: !!this.conversationEngine,
        totalCommands: this.commandHistory.length,
        userLearnings: (context.learnings || []).length
      }
    };
  }

  /**
   * Parse command input
   */
  parseCommand(input) {
    const trimmed = input.trim();
    
    // Remove leading / if present
    const withoutSlash = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    
    // Split by spaces, but respect quoted strings
    const parts = this.splitCommand(withoutSlash);
    
    if (parts.length === 0) {
      return null;
    }

    const command = parts[0];
    const subcommand = parts[1] || null;
    const args = [];
    const flags = {};

    // Parse remaining parts
    for (let i = 2; i < parts.length; i++) {
      if (parts[i].startsWith('-')) {
        const [key, value] = parts[i].slice(1).split('=');
        flags[key] = value || true;
      } else {
        args.push(parts[i]);
      }
    }

    return { command, subcommand, args, flags };
  }

  /**
   * Split command respecting quotes
   */
  splitCommand(input) {
    const parts = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Parse update arguments
   */
  parseUpdateArgs(args) {
    const updates = {};
    for (let i = 0; i < args.length; i += 2) {
      if (i + 1 < args.length) {
        updates[args[i]] = args[i + 1];
      }
    }
    return updates;
  }

  /**
   * Get or create user context
   */
  getUserContext(userId) {
    if (!this.userContexts.has(userId)) {
      this.userContexts.set(userId, {
        userId,
        createdAt: new Date().toISOString(),
        commandCount: 0,
        learnings: []
      });
    }

    const context = this.userContexts.get(userId);
    context.commandCount++;
    return context;
  }

  /**
   * Record command in history
   */
  recordCommand(commandRecord) {
    this.commandHistory.push({
      ...commandRecord,
      id: this.generateCommandId()
    });

    // Keep only last 1000 commands in memory
    if (this.commandHistory.length > 1000) {
      this.commandHistory.shift();
    }
  }

  /**
   * Generate command ID
   */
  generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Suggest a command based on intent
   */
  async suggestCommand(intent) {
    try {
      const suggestions = [];

      // Map intents to commands
      const intentMap = {
        'greeting': ['help', 'status'],
        'help': ['help', 'status'],
        'inquiry': ['help', 'status'],
        'command': ['execute', 'help'],
        'feedback': ['feedback', 'help'],
        'unknown': ['help']
      };

      const commandSuggestions = intentMap[intent] || ['help'];
      
      for (const cmdName of commandSuggestions) {
        const command = this.commands.get(cmdName);
        if (command) {
          suggestions.push({
            command: cmdName,
            name: command.name,
            confidence: 0.85
          });
        }
      }

      return {
        intent,
        suggestions,
        primary: suggestions[0] || null
      };
    } catch (error) {
      logger.error('Failed to suggest command', { error: error.message });
      return { intent, suggestions: [], error: error.message };
    }
  }

  /**
   * Get command history
   */
  getCommandHistory(userId = null, limit = 10) {
    let history = this.commandHistory;

    if (userId) {
      history = history.filter(c => c.userId === userId);
    }

    return history.slice(-limit);
  }

  /**
   * Get executor statistics
   */
  getStats() {
    return {
      totalCommands: this.commands.size,
      totalExecutions: this.commandHistory.length,
      totalUsers: this.userContexts.size,
      registeredCommands: Array.from(this.commands.keys())
    };
  }

  /**
   * Reset executor state for test isolation
   */
  reset() {
    this.commands.clear();
    this.commandHistory = [];
    this.userContexts.clear();
    this.initialized = false;
    logger.debug('CommandExecutor state reset');
  }
}

module.exports = CommandExecutor;
