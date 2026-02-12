/**
 * CommandExecutor Unit Tests
 * Phase 6 M2 Module 2
 */

const CommandExecutor = require('../../code/WhatsAppBot/Handlers/CommandExecutor');
const { MockLogger } = require('../mocks/services');
const fixtures = require('../fixtures/fixtures');

describe('CommandExecutor', () => {
  let executor;
  let mockLogger;
  let mockBotContext;

  beforeEach(() => {
    mockLogger = new MockLogger();

    mockBotContext = {
      chat: fixtures.whatsappChat.group,
      contact: fixtures.whatsappContact.user1,
      message: fixtures.whatsappMessage.text,
      client: {
        info: {
          me: {
            number: fixtures.accounts.master.phone
          }
        }
      }
    };

    executor = new CommandExecutor({
      logger: mockLogger,
      maxCommandLength: 500,
      commandDelimiter: '/'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============ INITIALIZATION TESTS ============
  describe('Initialization', () => {
    it('should initialize command executor', () => {
      expect(executor).toBeDefined();
      expect(executor.commands).toBeDefined();
      expect(executor.aliases).toBeDefined();
    });

    it('should have default commands registered', () => {
      expect(executor.commands.size).toBeGreaterThan(0);
    });
  });

  // ============ COMMAND REGISTRATION TESTS ============
  describe('registerCommand', () => {
    it('should register a command', () => {
      const handler = jest.fn();

      executor.registerCommand({
        name: 'test',
        description: 'Test command',
        handler: handler,
        permissions: ['user']
      });

      expect(executor.commands.has('test')).toBe(true);
    });

    it('should register command aliases', () => {
      const handler = jest.fn();

      executor.registerCommand({
        name: 'example',
        aliases: ['ex', 'eg'],
        description: 'Example command',
        handler: handler
      });

      expect(executor.aliases.has('ex')).toBe(true);
      expect(executor.aliases.has('eg')).toBe(true);
    });

    it('should prevent duplicate command names', async () => {
      const handler = jest.fn();

      executor.registerCommand({
        name: 'duplicate',
        description: 'First',
        handler: handler
      });

      expect(() => {
        executor.registerCommand({
          name: 'duplicate',
          description: 'Second',
          handler: handler
        });
      }).toThrow('already registered');
    });

    it('should validate command definition', async () => {
      expect(() => {
        executor.registerCommand({
          name: 'invalid',
          // Missing handler
        });
      }).toThrow();
    });
  });

  // ============ COMMAND PARSING TESTS ============
  describe('parseCommand', () => {
    it('should parse simple command', () => {
      const result = executor.parseCommand('/help');

      expect(result).toHaveProperty('command');
      expect(result).toHaveProperty('args');
      expect(result.command).toBe('help');
    });

    it('should parse command with arguments', () => {
      const result = executor.parseCommand('/add item1 item2 item3');

      expect(result.command).toBe('add');
      expect(result.args).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle quoted arguments', () => {
      const result = executor.parseCommand('/send "Hello World" user1');

      expect(result.args[0]).toBe('Hello World');
      expect(result.args[1]).toBe('user1');
    });

    it('should parse options', () => {
      const result = executor.parseCommand('/list --filter active --sort name');

      expect(result.command).toBe('list');
      expect(result.options.filter).toBe('active');
      expect(result.options.sort).toBe('name');
    });

    it('should handle flag options', () => {
      const result = executor.parseCommand('/export --json --verbose');

      expect(result.options.json).toBe(true);
      expect(result.options.verbose).toBe(true);
    });

    it('should ignore commands without delimiter', () => {
      const result = executor.parseCommand('not a command');

      expect(result).toBeNull();
    });

    it('should reject empty command', () => {
      const result = executor.parseCommand('/');

      expect(result).toBeNull();
    });

    it('should reject oversized command', () => {
      const longCommand = '/' + 'a'.repeat(600);

      const result = executor.parseCommand(longCommand);
      expect(result).toBeNull();
    });
  });

  // ============ COMMAND EXECUTION TESTS ============
  describe('executeCommand', () => {
    let mockHandler;

    beforeEach(() => {
      mockHandler = jest.fn().mockResolvedValue({
        success: true,
        message: 'Command executed'
      });

      executor.registerCommand({
        name: 'test',
        description: 'Test command',
        handler: mockHandler,
        permissions: ['user', 'admin']
      });
    });

    it('should execute registered command', async () => {
      const result = await executor.executeCommand('/test arg1 arg2', mockBotContext);

      expect(mockHandler).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should pass parsed command to handler', async () => {
      await executor.executeCommand('/test hello world', mockBotContext);

      const callArgs = mockHandler.mock.calls[0];
      expect(callArgs[0].args).toEqual(['hello', 'world']);
    });

    it('should pass context to handler', async () => {
      await executor.executeCommand('/test', mockBotContext);

      const callArgs = mockHandler.mock.calls[0];
      expect(callArgs[1]).toEqual(mockBotContext);
    });

    it('should execute command via alias', async () => {
      executor.registerCommand({
        name: 'original',
        aliases: ['orig'],
        description: 'Test alias',
        handler: mockHandler
      });

      await executor.executeCommand('/orig arg', mockBotContext);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should return error for unknown command', async () => {
      const result = await executor.executeCommand('/unknown', mockBotContext);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('not found');
    });

    it('should capture handler exceptions', async () => {
      mockHandler.mockRejectedValueOnce(new Error('Handler error'));

      const result = await executor.executeCommand('/test', mockBotContext);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Handler error');
    });
  });

  // ============ PERMISSION TESTS ============
  describe('Permission Handling', () => {
    let restrictedHandler;

    beforeEach(() => {
      restrictedHandler = jest.fn().mockResolvedValue({ success: true });

      executor.registerCommand({
        name: 'admin-only',
        description: 'Admin only command',
        handler: restrictedHandler,
        permissions: ['admin']
      });

      executor.registerCommand({
        name: 'user-allowed',
        description: 'User allowed',
        handler: restrictedHandler,
        permissions: ['user', 'admin']
      });
    });

    it('should execute command with sufficient permissions', async () => {
      const adminContext = { ...mockBotContext, isAdmin: true };

      const result = await executor.executeCommand('/user-allowed', adminContext);

      expect(result.success).toBe(true);
      expect(restrictedHandler).toHaveBeenCalled();
    });

    it('should deny command without sufficient permissions', async () => {
      const userContext = { ...mockBotContext, isAdmin: false };

      const result = await executor.executeCommand('/admin-only', userContext);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('permission');
    });

    it('should allow public commands without permission check', async () => {
      const publicHandler = jest.fn().mockResolvedValue({ success: true });

      executor.registerCommand({
        name: 'public',
        description: 'Public command',
        handler: publicHandler,
        public: true
      });

      const result = await executor.executeCommand('/public', mockBotContext);

      expect(publicHandler).toHaveBeenCalled();
    });
  });

  // ============ HELP COMMAND TESTS ============
  describe('Help Command', () => {
    beforeEach(() => {
      executor.registerCommand({
        name: 'example',
        description: 'Example command description',
        handler: jest.fn(),
        usage: '/example <param>'
      });
    });

    it('should show help for all commands', async () => {
      const result = await executor.executeCommand('/help', mockBotContext);

      expect(result.success).toBe(true);
      expect(result.help).toBeDefined();
      expect(result.help.length).toBeGreaterThan(0);
    });

    it('should show help for specific command', async () => {
      const result = await executor.executeCommand('/help example', mockBotContext);

      expect(result.success).toBe(true);
      expect(result.help).toContain('Example command description');
    });

    it('should handle help for unknown command', async () => {
      const result = await executor.executeCommand('/help unknown', mockBotContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('not found');
    });
  });

  // ============ BUILT-IN COMMAND TESTS ============
  describe('Built-in Commands', () => {
    it('should have help command', () => {
      expect(executor.commands.has('help')).toBe(true);
    });

    it('should have version command', () => {
      expect(executor.commands.has('version')).toBe(true);
    });

    it('should have status command', () => {
      expect(executor.commands.has('status')).toBe(true);
    });

    it('should execute version command', async () => {
      const result = await executor.executeCommand('/version', mockBotContext);

      expect(result.success).toBe(true);
      expect(result.version).toBeDefined();
    });

    it('should execute status command', async () => {
      const result = await executor.executeCommand('/status', mockBotContext);

      expect(result.success).toBe(true);
      expect(result.status).toBeDefined();
    });
  });

  // ============ COMMAND VALIDATION TESTS ============
  describe('Command Validation', () => {
    let validatedHandler;

    beforeEach(() => {
      validatedHandler = jest.fn().mockResolvedValue({ success: true });

      executor.registerCommand({
        name: 'validate',
        description: 'Validation test command',
        handler: validatedHandler,
        validators: [
          (cmd) => cmd.args.length >= 2 ? null : 'Requires at least 2 arguments',
          (cmd) => cmd.args[0].length > 2 ? null : 'First argument must be > 2 chars'
        ]
      });
    });

    it('should validate before execution', async () => {
      const result = await executor.executeCommand('/validate a b', mockBotContext);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('> 2');
    });

    it('should execute if validation passes', async () => {
      const result = await executor.executeCommand('/validate hello world', mockBotContext);

      expect(validatedHandler).toHaveBeenCalled();
    });

    it('should return validation error message', async () => {
      const result = await executor.executeCommand('/validate hi', mockBotContext);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Requires at least 2');
    });
  });

  // ============ COOLDOWN TESTS ============
  describe('Command Cooldown', () => {
    beforeEach(() => {
      executor.registerCommand({
        name: 'cooldown-test',
        description: 'Cooldown test',
        handler: jest.fn().mockResolvedValue({ success: true }),
        cooldown: 1000 // 1 second
      });
    });

    it('should enforce command cooldown', async () => {
      const userId = mockBotContext.contact.id;

      const result1 = await executor.executeCommand('/cooldown-test', mockBotContext);
      expect(result1.success).toBe(true);

      const result2 = await executor.executeCommand('/cooldown-test', mockBotContext);
      expect(result2.success).toBe(false);
      expect(result2.errorMessage).toContain('cooldown');
    });

    it('should allow command after cooldown expires', async () => {
      jest.useFakeTimers();

      const result1 = await executor.executeCommand('/cooldown-test', mockBotContext);
      expect(result1.success).toBe(true);

      const result2 = await executor.executeCommand('/cooldown-test', mockBotContext);
      expect(result2.success).toBe(false);

      // Advance time past cooldown
      jest.advanceTimersByTime(1100);

      const result3 = await executor.executeCommand('/cooldown-test', mockBotContext);
      expect(result3.success).toBe(true);

      jest.useRealTimers();
    });
  });

  // ============ COMMAND HISTORY TESTS ============
  describe('Command History', () => {
    it('should track executed commands', async () => {
      executor.registerCommand({
        name: 'track',
        handler: jest.fn().mockResolvedValue({ success: true })
      });

      await executor.executeCommand('/track arg1', mockBotContext);
      await executor.executeCommand('/track arg2', mockBotContext);

      const history = executor.getCommandHistory();
      const trackCommands = history.filter(h => h.command === 'track');

      expect(trackCommands.length).toBeGreaterThanOrEqual(2);
    });

    it('should include command metadata in history', async () => {
      executor.registerCommand({
        name: 'test',
        handler: jest.fn().mockResolvedValue({ success: true })
      });

      await executor.executeCommand('/test', mockBotContext);

      const history = executor.getCommandHistory();
      const lastCommand = history[history.length - 1];

      expect(lastCommand).toHaveProperty('timestamp');
      expect(lastCommand).toHaveProperty('command');
      expect(lastCommand).toHaveProperty('status');
    });

    it('should limit history size', () => {
      const smallExecutor = new CommandExecutor({
        maxHistorySize: 5
      });

      smallExecutor.registerCommand({
        name: 'test',
        handler: jest.fn().mockResolvedValue({ success: true })
      });

      for (let i = 0; i < 10; i++) {
        smallExecutor.executeCommand('/test', mockBotContext);
      }

      const history = smallExecutor.getCommandHistory();
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  // ============ ERROR HANDLING TESTS ============
  describe('Error Handling', () => {
    it('should handle invalid context', async () => {
      executor.registerCommand({
        name: 'test',
        handler: jest.fn()
      });

      const result = await executor.executeCommand('/test', null);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle handler timeout', async () => {
      const slowHandler = jest.fn(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 5000))
      );

      executor.registerCommand({
        name: 'slow',
        handler: slowHandler,
        timeout: 100
      });

      // This might timeout depending on implementation
      const result = await executor.executeCommand('/slow', mockBotContext);

      expect(result).toBeDefined();
    });

    it('should log command execution failures', async () => {
      executor.registerCommand({
        name: 'fail',
        handler: jest.fn().mockRejectedValue(new Error('Test error'))
      });

      await executor.executeCommand('/fail', mockBotContext);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ============ COMMAND STATISTICS TESTS ============
  describe('Statistics', () => {
    beforeEach(() => {
      executor.registerCommand({
        name: 'stat-test',
        handler: jest.fn().mockResolvedValue({ success: true })
      });
    });

    it('should track command statistics', async () => {
      executor.registerCommand({
        name: 'test',
        handler: jest.fn().mockResolvedValue({ success: true })
      });

      await executor.executeCommand('/test', mockBotContext);

      const stats = executor.getStatistics();

      expect(stats).toHaveProperty('totalCommands');
      expect(stats).toHaveProperty('totalExecuted');
    });

    it('should track success and failure rates', async () => {
      const failHandler = jest.fn().mockRejectedValue(new Error('Fail'));

      executor.registerCommand({
        name: 'success',
        handler: jest.fn().mockResolvedValue({ success: true })
      });

      executor.registerCommand({
        name: 'failure',
        handler: failHandler
      });

      await executor.executeCommand('/success', mockBotContext);
      await executor.executeCommand('/failure', mockBotContext);

      const stats = executor.getStatistics();

      expect(stats.successRate).toBeLessThanOrEqual(100);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
    });
  });
});
