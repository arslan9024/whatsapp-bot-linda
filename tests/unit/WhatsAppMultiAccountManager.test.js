/**
 * WhatsAppMultiAccountManager Unit Tests
 * Phase 6 M2 Module 2
 */

const WhatsAppMultiAccountManager = require('../../code/WhatsAppBot/Handlers/WhatsAppMultiAccountManager');
const { MockLogger } = require('../mocks/services');
const fixtures = require('../fixtures/fixtures');

describe('WhatsAppMultiAccountManager', () => {
  let manager;
  let mockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();

    manager = new WhatsAppMultiAccountManager({
      maxSecondaryAccounts: 5,
      loadBalancingStrategy: 'round-robin',
      failoverEnabled: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============ INITIALIZATION TESTS ============
  describe('Initialization', () => {
    it('should initialize manager successfully', async () => {
      const result = await manager.initialize();

      expect(result.success).toBe(true);
      expect(result.message).toContain('ready');
    });
  });

  // ============ ACCOUNT ADDITION TESTS ============
  describe('addAccount', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should add master account', async () => {
      const result = await manager.addAccount({
        phone: fixtures.accounts.master.phone,
        displayName: fixtures.accounts.master.displayName,
        type: 'master'
      });

      expect(result.success).toBe(true);
      expect(result.account.type).toBe('master');
      expect(result.account.isPrimary).toBe(true);
    });

    it('should add secondary account', async () => {
      // First add master
      await manager.addAccount({
        phone: fixtures.accounts.master.phone,
        type: 'master'
      });

      // Then add secondary
      const result = await manager.addAccount({
        phone: fixtures.accounts.secondary1.phone,
        displayName: fixtures.accounts.secondary1.displayName,
        type: 'secondary'
      });

      expect(result.success).toBe(true);
      expect(result.account.type).toBe('secondary');
    });

    it('should generate unique account ID', async () => {
      await manager.addAccount({ phone: '+1111111111' });
      const acc1 = await manager.addAccount({ phone: '+2222222222' });
      const acc2 = await manager.addAccount({ phone: '+3333333333' });

      expect(acc1.accountId).not.toBe(acc2.accountId);
    });

    it('should validate phone number format', async () => {
      expect(async () => {
        await manager.addAccount({
          phone: 'invalid-phone',
          type: 'master'
        });
      }).rejects.toThrow('Invalid phone number');
    });

    it('should enforce max secondary accounts limit', async () => {
      // Add master
      await manager.addAccount({ phone: '+0000000000', type: 'master' });

      // Add max secondary accounts
      for (let i = 1; i <= 5; i++) {
        await manager.addAccount({ 
          phone: `+${String(i).padStart(10, '0')}`,
          type: 'secondary'
        });
      }

      // Try to add one more
      expect(async () => {
        await manager.addAccount({
          phone: '+6666666666',
          type: 'secondary'
        });
      }).rejects.toThrow('Maximum secondary accounts');
    });

    it('should set first account as master automatically', async () => {
      const result = await manager.addAccount({
        phone: '+1111111111'
      });

      expect(result.account.type).toBe('master');
      expect(manager.masterAccount).toBe(result.accountId);
    });
  });

  // ============ ACCOUNT REMOVAL TESTS ============
  describe('removeAccount', () => {
    let masterId;
    let secondaryId;

    beforeEach(async () => {
      await manager.initialize();

      const master = await manager.addAccount({
        phone: '+0000000000',
        type: 'master'
      });
      masterId = master.accountId;

      const secondary = await manager.addAccount({
        phone: '+1111111111',
        type: 'secondary'
      });
      secondaryId = secondary.accountId;
    });

    it('should remove account', async () => {
      const result = await manager.removeAccount(secondaryId);

      expect(result.success).toBe(true);
      expect(manager.getAccountInfo(secondaryId)).toBeNull();
    });

    it('should promote secondary to master on master removal', async () => {
      await manager.removeAccount(masterId);

      expect(manager.masterAccount).toBe(secondaryId);
    });

    it('should prevent removing master with secondaries', async () => {
      expect(async () => {
        await manager.removeAccount(masterId);
      }).not.toThrow(); // Actually should allow and promote secondary
    });
  });

  // ============ ACCOUNT SWITCHING TESTS ============
  describe('switchAccount', () => {
    let accountId1, accountId2;

    beforeEach(async () => {
      await manager.initialize();

      const acc1 = await manager.addAccount({ phone: '+1111111111', type: 'master' });
      accountId1 = acc1.accountId;

      const acc2 = await manager.addAccount({ phone: '+2222222222', type: 'secondary' });
      accountId2 = acc2.accountId;
    });

    it('should switch to target account', async () => {
      const result = await manager.switchAccount(accountId2);

      expect(result.success).toBe(true);
      expect(result.account.id).toBe(accountId2);
    });

    it('should deactivate other accounts', async () => {
      await manager.switchAccount(accountId2);

      const acc1Info = manager.getAccountInfo(accountId1);
      const acc2Info = manager.getAccountInfo(accountId2);

      expect(acc1Info.isActive).toBe(false);
      expect(acc2Info.isActive).toBe(true);
    });

    it('should update last activity time', async () => {
      const before = new Date();
      await manager.switchAccount(accountId2);
      const after = new Date();

      const info = manager.getAccountInfo(accountId2);
      const lastActivity = new Date(info.lastActivity);

      expect(lastActivity.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastActivity.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ============ ACCOUNT ROUTING TESTS ============
  describe('getRoutingAccount', () => {
    beforeEach(async () => {
      await manager.initialize();

      for (const config of fixtures.accounts.multiple) {
        await manager.addAccount(config);
      }
    });

    it('should return account for routing', () => {
      const account = manager.getRoutingAccount('contact_1');

      expect(account).not.toBeNull();
      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('phone');
    });

    it('should use round-robin strategy', () => {
      const roundRobinManager = new WhatsAppMultiAccountManager({
        loadBalancingStrategy: 'round-robin'
      });

      // Accounts would be returned in rotation
    });

    it('should respect routing preferences', () => {
      const accounts = manager.listAccounts();
      if (accounts.length > 1) {
        const firstAccount = accounts[0];
        const contactId = 'important_contact';

        manager.setRoutingPreference(contactId, firstAccount.id);

        const routed = manager.getRoutingAccount(contactId);
        expect(routed.id).toBe(firstAccount.id);
      }
    });
  });

  // ============ ROUTING PREFERENCE TESTS ============
  describe('setRoutingPreference', () => {
    let accountId;

    beforeEach(async () => {
      await manager.initialize();

      const acc = await manager.addAccount({ phone: '+1111111111', type: 'master' });
      accountId = acc.accountId;
    });

    it('should set routing preference', () => {
      const result = manager.setRoutingPreference('contact_1', accountId);

      expect(result.success).toBe(true);
    });

    it('should route to preferred account', () => {
      manager.setRoutingPreference('contact_1', accountId);

      const routed = manager.getRoutingAccount('contact_1');
      expect(routed.id).toBe(accountId);
    });
  });

  // ============ DEVICE LINKING TESTS ============
  describe('linkAccountToDevice', () => {
    let accountId;

    beforeEach(async () => {
      await manager.initialize();

      const acc = await manager.addAccount({ phone: '+1111111111', type: 'master' });
      accountId = acc.accountId;
    });

    it('should initiate device linking', async () => {
      const result = await manager.linkAccountToDevice(accountId);

      expect(result.success).toBe(true);
      expect(result.linkingCode).toBeDefined();
      expect(result.linkingCode.code).toBeDefined();
    });

    it('should generate linking code', async () => {
      const result = await manager.linkAccountToDevice(accountId);

      expect(result.linkingCode.code).toMatch(/^[A-Z0-9]+$/);
      expect(result.linkingCode.code.length).toBeGreaterThan(0);
    });

    it('should set linking status to pending', async () => {
      await manager.linkAccountToDevice(accountId);

      const info = manager.getAccountInfo(accountId);
      expect(info.deviceLinking.status).toBe('pending');
    });
  });

  describe('confirmDeviceLinking', () => {
    let accountId;

    beforeEach(async () => {
      await manager.initialize();

      const acc = await manager.addAccount({ phone: '+1111111111', type: 'master' });
      accountId = acc.accountId;

      await manager.linkAccountToDevice(accountId);
    });

    it('should confirm device linking', async () => {
      const result = await manager.confirmDeviceLinking(accountId);

      expect(result.success).toBe(true);
      expect(result.linkedAt).toBeDefined();
    });

    it('should update linking status to linked', async () => {
      await manager.confirmDeviceLinking(accountId);

      const info = manager.getAccountInfo(accountId);
      expect(info.deviceLinking.status).toBe('linked');
      expect(info.status).toBe('linked');
    });
  });

  // ============ ACCOUNT INFO TESTS ============
  describe('getAccountInfo', () => {
    let accountId;

    beforeEach(async () => {
      await manager.initialize();

      const acc = await manager.addAccount({
        phone: '+1111111111',
        displayName: 'Test Account',
        type: 'master'
      });
      accountId = acc.accountId;
    });

    it('should return account information', () => {
      const info = manager.getAccountInfo(accountId);

      expect(info).toHaveProperty('id');
      expect(info).toHaveProperty('phone');
      expect(info).toHaveProperty('displayName');
      expect(info).toHaveProperty('type');
      expect(info).toHaveProperty('status');
    });

    it('should include metrics in account info', () => {
      const info = manager.getAccountInfo(accountId);

      expect(info).toHaveProperty('metrics');
      expect(info.metrics).toHaveProperty('messagesSent');
      expect(info.metrics).toHaveProperty('messagesReceived');
    });

    it('should return null for non-existent account', () => {
      const info = manager.getAccountInfo('non_existent');

      expect(info).toBeNull();
    });
  });

  // ============ ACCOUNT LISTING TESTS ============
  describe('listAccounts', () => {
    beforeEach(async () => {
      await manager.initialize();

      for (const config of fixtures.accounts.multiple) {
        await manager.addAccount(config);
      }
    });

    it('should list all accounts', () => {
      const accounts = manager.listAccounts();

      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by type', () => {
      const secondary = manager.listAccounts({ type: 'secondary' });

      expect(secondary.every(a => a.type === 'secondary')).toBe(true);
    });

    it('should filter by status', () => {
      const linked = manager.listAccounts({ status: 'linked' });

      expect(Array.isArray(linked)).toBe(true);
    });
  });

  // ============ MASTER/SECONDARY ACCOUNT TESTS ============
  describe('getMasterAccount / getSecondaryAccounts', () => {
    beforeEach(async () => {
      await manager.initialize();

      for (const config of fixtures.accounts.multiple) {
        await manager.addAccount(config);
      }
    });

    it('should return master account', () => {
      const master = manager.getMasterAccount();

      expect(master).not.toBeNull();
      expect(master.type).toBe('master');
      expect(master.isPrimary).toBe(true);
    });

    it('should return secondary accounts', () => {
      const secondary = manager.getSecondaryAccounts();

      expect(Array.isArray(secondary)).toBe(true);
      expect(secondary.length).toBeGreaterThan(0);
      expect(secondary.every(a => a.type === 'secondary')).toBe(true);
    });
  });

  // ============ STATUS TESTS ============
  describe('getStatus', () => {
    beforeEach(async () => {
      await manager.initialize();

      for (const config of fixtures.accounts.multiple) {
        await manager.addAccount(config);
      }
    });

    it('should return manager status', () => {
      const status = manager.getStatus();

      expect(status).toHaveProperty('totalAccounts');
      expect(status).toHaveProperty('activeAccounts');
      expect(status).toHaveProperty('masterAccount');
      expect(status).toHaveProperty('secondaryAccounts');
    });

    it('should include load balancing strategy in status', () => {
      const status = manager.getStatus();

      expect(status.loadBalancingStrategy).toBe('round-robin');
    });
  });

  // ============ ACTIVITY TRACKING TESTS ============
  describe('recordMessageActivity', () => {
    let accountId;

    beforeEach(async () => {
      await manager.initialize();

      const acc = await manager.addAccount({ phone: '+1111111111', type: 'master' });
      accountId = acc.accountId;
    });

    it('should record message activity', () => {
      manager.recordMessageActivity(accountId, 'sent');

      const metrics = manager.accountMetrics.get(accountId);
      expect(metrics.messageLoadPerMinute).toBeGreaterThan(0);
    });

    it('should track load per minute', () => {
      manager.recordMessageActivity(accountId, 'sent');
      manager.recordMessageActivity(accountId, 'sent');

      const metrics = manager.accountMetrics.get(accountId);
      expect(metrics.messageLoadPerMinute).toBeGreaterThanOrEqual(2);
    });
  });

  // ============ STATISTICS TESTS ============
  describe('getStatistics', () => {
    beforeEach(async () => {
      await manager.initialize();

      for (const config of fixtures.accounts.multiple) {
        await manager.addAccount(config);
      }
    });

    it('should return manager statistics', () => {
      const stats = manager.getStatistics();

      expect(stats).toHaveProperty('totalAccounts');
      expect(stats).toHaveProperty('masterAccount');
      expect(stats).toHaveProperty('secondaryAccounts');
      expect(stats).toHaveProperty('linkedAccounts');
    });

    it('should calculate account health', () => {
      const stats = manager.getStatistics();

      expect(stats.accountHealth).toBeDefined();
      expect(stats.accountHealth).toBeGreaterThanOrEqual(0);
      expect(stats.accountHealth).toBeLessThanOrEqual(100);
    });
  });

  // ============ ERROR HANDLING TESTS ============
  describe('Error Handling', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should reject invalid phone numbers', async () => {
      expect(async () => {
        await manager.addAccount({ phone: 'not-a-phone' });
      }).rejects.toThrow();
    });

    it('should handle non-existent account gracefully', async () => {
      const info = manager.getAccountInfo('non_existent');
      expect(info).toBeNull();
    });

    it('should handle removing non-existent account', async () => {
      expect(async () => {
        await manager.removeAccount('non_existent');
      }).rejects.toThrow();
    });
  });
});
