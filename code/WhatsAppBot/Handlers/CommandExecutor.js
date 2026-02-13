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
    this.logger = options.logger || logger;
    this.commands = new Map();
    this.aliases = new Map(); // Map aliases to command names
    this.commandHistory = [];
    this.userContexts = new Map();
    this.userCooldowns = new Map(); // Track cooldown expiration times
    this.maxCommandLength = options.maxCommandLength || 1000; // Default 1000 chars
    this.commandDelimiter = options.commandDelimiter || '/'; // Default /
    this.initialized = false;
    this.whatsappService = options.whatsappService;
    this.contactsService = options.contactsService;
    this.sheetsService = options.sheetsService;
    this.conversationEngine = options.conversationEngine;
    
    // Register built-in commands on construction
    this.registerBuiltInCommands();
  }

  /**
   * Initialize command executor
   */
  async initialize() {
    try {
      // Only register if not already initialized
      if (!this.initialized) {
        this.registerBuiltInCommands();
      }
      this.initialized = true;
      this.logger.info('Command Executor initialized successfully');
      return { success: true, message: 'Command executor ready' };
    } catch (error) {
      this.logger.error('Failed to initialize command executor', { error: error.message });
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
    this.registerCommand('version', this.handleVersionCommand.bind(this));
  }

  /**
   * Register a command
   */
  registerCommand(commandName, handler) {
    // Handle both (name, handler) and (configObject) signatures
    if (typeof commandName === 'object' && commandName.name) {
      const config = commandName;
      
      // Validate handler
      if (!config.handler) {
        throw new Error('Command handler is required');
      }
      
      // Check for duplicate
      const cmdNameLower = config.name.toLowerCase();
      if (this.commands.has(cmdNameLower)) {
        throw new Error(`Command "${config.name}" is already registered`);
      }
      
      this.commands.set(cmdNameLower, {
        name: config.name,
        handler: config.handler,
        cooldown: config.cooldown || 0,
        description: config.description,
        validators: config.validators || [],
        permissions: config.permissions || [],
        registeredAt: new Date().toISOString()
      });

      // Register aliases
      if (config.aliases && Array.isArray(config.aliases)) {
        for (const alias of config.aliases) {
          this.aliases.set(alias.toLowerCase(), config.name.toLowerCase());
        }
      }

      this.logger.info('Command registered', { commandName: config.name });
      return;
    }

    // Standard (name, handler) signature
    if (typeof commandName !== 'string') {
      throw new Error('Command name must be a string');
    }
    
    // Validate handler
    if (!handler) {
      throw new Error('Command handler is required');
    }
    
    // Check for duplicate
    const cmdNameLower = commandName.toLowerCase();
    if (this.commands.has(cmdNameLower)) {
      throw new Error(`Command "${commandName}" is already registered`);
    }

    this.commands.set(cmdNameLower, {
      name: commandName,
      handler,
      cooldown: 0,
      validators: [],
      permissions: [],
      registeredAt: new Date().toISOString()
    });

    this.logger.info('Command registered', { commandName });
  }

  /**
   * Execute a command
   * Supports both (userId, input) and (commandString, context) signatures
   */
  async executeCommand(userIdOrCommand, inputOrContext) {
    try {
      let commandInput;
      let userId;
      let botContext = {};

      // Handle both parameter styles
      if (typeof userIdOrCommand === 'string') {
        commandInput = userIdOrCommand;
        // Check if this looks like a context object
        if (typeof inputOrContext === 'object' && inputOrContext.contact) {
          // New style: executeCommand('/command', botContext)
          botContext = inputOrContext;
          userId = botContext.contact?.id || `user_${Date.now()}`;
        } else {
          // Old style: executeCommand(userId, input)
          userId = userIdOrCommand;
          commandInput = inputOrContext;
        }
      } else {
        return {
          success: false,
          message: 'First parameter must be a command string or user ID'
        };
      }

      // Parse command if it starts with /
      const command = commandInput.startsWith('/') 
        ? commandInput.substring(1) 
        : commandInput;

      let commandLower = command.toLowerCase().split(/\s+/)[0];
      
      // Resolve alias to command name
      if (this.aliases.has(commandLower)) {
        commandLower = this.aliases.get(commandLower);
      }

      const commandMapping = this.commands.get(commandLower);

      if (!commandMapping) {
        return {
          success: false,
          message: `Command not found: ${command}`,
          errorMessage: `Command not found: ${command}`
        };
      }

      const handler = commandMapping.handler;

      // Check cooldown
      const cooldownKey = `${userId}:${commandLower}`;
      const now = Date.now();
      const lastExecutionTime = this.userCooldowns.get(cooldownKey) || 0;
      const cooldownMs = commandMapping.cooldown || 0;

      if (cooldownMs > 0 && now < lastExecutionTime + cooldownMs) {
        const remainingMs = lastExecutionTime + cooldownMs - now;
        return {
          success: false,
          message: `Command is on cooldown. Try again in ${Math.ceil(remainingMs / 1000)}s`,
          errorMessage: `Command is on cooldown. Try again in ${Math.ceil(remainingMs / 1000)}s`
        };
      }

      // Check permissions
      const requiredPermissions = commandMapping.permissions || [];
      if (requiredPermissions.length > 0) {
        const userPermissions = this.getUserPermissions(botContext);
        const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));
        
        if (!hasPermission) {
          return {
            success: false,
            message: `You do not have permission to execute this command. Required: ${requiredPermissions.join(', ')}`,
            errorMessage: `You do not have permission to execute this command. Required: ${requiredPermissions.join(', ')}`
          };
        }
      }

      // Parse command arguments
      const commandParts = command.split(/\s+/);
      const args = commandParts.slice(1);

      // Run validators
      const validators = commandMapping.validators || [];
      for (const validator of validators) {
        const validation = validator({ command: commandLower, args, input: commandInput });
        if (validation) {
          return {
            success: false,
            message: validation,
            errorMessage: validation
          };
        }
      }

      // Prepare handler params
      const params = {
        userId,
        command: commandLower,
        input: commandInput,
        args,
        botContext
      };

      // Execute the command
      let result;
      if (typeof handler === 'function') {
        // Call handler with params and botContext as separate arguments
        result = await handler(params, botContext);
      } else {
        result = { success: false, message: 'Handler is not a function' };
      }

      // Ensure result has success property
      if (!result || typeof result !== 'object') {
        result = { success: false, message: 'Invalid command result' };
      }

      // Update cooldown if command succeeded
      if (result.success && cooldownMs > 0) {
        this.userCooldowns.set(cooldownKey, now);
      }

      // Record in history
      this.recordCommand({
        userId,
        command: commandLower,
        status: result.success,
        result: result.success,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      this.logger.error('Command execution failed', { error: error.message });
      return {
        success: false,
        message: `Error executing command: ${error.message}`,
        errorMessage: `Error executing command: ${error.message}`
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
      // Return help for all topics and registered commands
      let allHelp = Object.values(helpText).join('\n');
      
      // Add help for dynamically registered commands
      for (const [cmdName, cmdConfig] of this.commands.entries()) {
        if (!helpText[cmdName] && cmdConfig.description) {
          allHelp += `\n${cmdName} - ${cmdConfig.description}`;
        }
      }

      return {
        success: true,
        help: allHelp
      };
    }

    // Check if it's a static help topic
    if (helpText[topic]) {
      return {
        success: true,
        help: helpText[topic]
      };
    }

    // Check if it's a registered command
    const cmd = this.commands.get(topic);
    if (cmd && cmd.description) {
      return {
        success: true,
        help: cmd.description
      };
    }

    // Not found
    return {
      success: true,
      message: `Command help not found for: ${topic}`
    };
  }

  /**
   * Handle status command
   */
  async handleStatusCommand(params) {
    const { botContext } = params;

    return {
      success: true,
      status: {
        whatsappConnected: !!this.whatsappService,
        contactsConnected: !!this.contactsService,
        sheetsConnected: !!this.sheetsService,
        learningEnabled: !!this.conversationEngine,
        totalCommands: this.commandHistory.length,
        userLearnings: (botContext?.learnings || []).length
      }
    };
  }

  /**
   * Handle version command
   */
  async handleVersionCommand(params) {
    return {
      success: true,
      version: '1.0.0',
      releaseDate: '2026-02-26',
      features: [
        'WhatsApp Multi-Account Management',
        'Google Contacts Integration',
        'Google Sheets Integration',
        'Conversation Learning Engine'
      ]
    };
  }

  /**
   * Get user permissions from context
   */
  getUserPermissions(botContext) {
    const permissions = ['user']; // Everyone has 'user' permission
    
    if (botContext?.isAdmin) {
      permissions.push('admin');
    }
    
    if (botContext?.isOwner) {
      permissions.push('owner');
    }
    
    if (botContext?.contact?.isVerified) {
      permissions.push('verified');
    }
    
    return permissions;
  }

  /**
   * Parse command input
   */
  parseCommand(input) {
    const trimmed = input.trim();
    
    // Check for command delimiter
    if (!trimmed.startsWith(this.commandDelimiter)) {
      return null;
    }
    
    // Check for oversized command
    if (trimmed.length > this.maxCommandLength) {
      return null;
    }
    
    // Remove leading delimiter
    const withoutDelimiter = trimmed.slice(this.commandDelimiter.length);
    
    // Split by spaces, but respect quoted strings
    const parts = this.splitCommand(withoutDelimiter);
    
    if (parts.length === 0) {
      return null;
    }

    const command = parts[0];
    const args = [];
    const flags = {};
    const options = {}; // For mapping flag names

    // Parse remaining parts for args and flags
    for (let i = 1; i < parts.length; i++) {
      if (parts[i].startsWith('--')) {
        // Handle double dash flags (--flag or --flag=value)
        const [key, valueFromEq] = parts[i].slice(2).split('=');
        let value = valueFromEq;
        
        // If no = sign and next part is not a flag, use it as value
        if (!valueFromEq && i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
          value = parts[++i];
        } else if (!value) {
          value = true;
        }
        
        flags[key] = value;
        options[key] = value;
      } else if (parts[i].startsWith('-') && parts[i] !== '-') {
        // Handle single dash flags (-f or -f=value)
        const [key, valueFromEq] = parts[i].slice(1).split('=');
        let value = valueFromEq;
        
        // If no = sign and next part is not a flag, use it as value
        if (!valueFromEq && i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
          value = parts[++i];
        } else if (!value) {
          value = true;
        }
        
        flags[key] = value;
        options[key] = value;
      } else {
        args.push(parts[i]);
      }
    }

    return { command, args, flags, options };
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
   * Get command execution statistics
   */
  getStatistics() {
    const total = this.commandHistory.length;
    const successful = this.commandHistory.filter(cmd => cmd.result === true).length;
    const failed = this.commandHistory.filter(cmd => cmd.result === false).length;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

    return {
      totalCommands: total,
      totalExecuted: total,
      successful,
      failed,
      successRate,
      failureRate: 100 - successRate,
      lastCommandTime: this.commandHistory[this.commandHistory.length - 1]?.timestamp || null
    };
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
      this.logger.error('Failed to suggest command', { error: error.message });
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
    this.logger.debug('CommandExecutor state reset');
  }
}

module.exports = CommandExecutor;
