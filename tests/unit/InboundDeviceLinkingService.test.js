/**
 * Tests for InboundDeviceLinkingService (Phase 32)
 *
 * Verifies on-demand self-service WhatsApp device linking via inbound chat messages.
 */

import { EventEmitter } from 'node:events';

jest.mock('../../src/sessions/SessionManager.js', () => ({
  SessionManager: {
    resolveClientId: jest.fn((phone, metadata, config) => metadata?.clientId || config?.id || String(phone).replace(/^\+/, '')),
    canRestoreSession: jest.fn().mockReturnValue(true),
    hasSessionArtifacts: jest.fn().mockReturnValue(true),
  },
}));

import {
  InboundDeviceLinkingService,
  isDeviceLinkingRequest,
  extractSenderPhone,
} from '../../src/linking/InboundDeviceLinkingService.js';

describe('InboundDeviceLinkingService', () => {
  describe('isDeviceLinkingRequest', () => {
    it('matches user conversational requests', () => {
      expect(isDeviceLinkingRequest('Hi, Linda, can you add my device please')).toBe(true);
      expect(isDeviceLinkingRequest('Hi Linda, can you add my device')).toBe(true);
      expect(isDeviceLinkingRequest('can you add my device please')).toBe(true);
      expect(isDeviceLinkingRequest('please add my device')).toBe(true);
      expect(isDeviceLinkingRequest('add my device')).toBe(true);
      expect(isDeviceLinkingRequest('link my device')).toBe(true);
      expect(isDeviceLinkingRequest('add device')).toBe(true);
      expect(isDeviceLinkingRequest('link device')).toBe(true);
      expect(isDeviceLinkingRequest('connect my device')).toBe(true);
      expect(isDeviceLinkingRequest('pair my device')).toBe(true);
      expect(isDeviceLinkingRequest('link my phone')).toBe(true);
      expect(isDeviceLinkingRequest('register my device')).toBe(true);
    });

    it('matches direct commands', () => {
      expect(isDeviceLinkingRequest('!link-code')).toBe(true);
      expect(isDeviceLinkingRequest('!link-device')).toBe(true);
      expect(isDeviceLinkingRequest('!add-device')).toBe(true);
      expect(isDeviceLinkingRequest('!link')).toBe(true);
      expect(isDeviceLinkingRequest('linda link device')).toBe(true);
      expect(isDeviceLinkingRequest('linda add my device')).toBe(true);
    });

    it('ignores unrelated messages', () => {
      expect(isDeviceLinkingRequest('Hello Linda')).toBe(false);
      expect(isDeviceLinkingRequest('How are you doing today?')).toBe(false);
      expect(isDeviceLinkingRequest('what is my device status')).toBe(false);
      expect(isDeviceLinkingRequest('random text')).toBe(false);
      expect(isDeviceLinkingRequest('')).toBe(false);
      expect(isDeviceLinkingRequest(null)).toBe(false);
      expect(isDeviceLinkingRequest(undefined)).toBe(false);
    });
  });

  describe('extractSenderPhone', () => {
    it('extracts E.164 phone from standard 1-to-1 WhatsApp JID', () => {
      expect(extractSenderPhone('971589969886@c.us')).toBe('+971589969886');
      expect(extractSenderPhone('971505760056@c.us')).toBe('+971505760056');
    });

    it('handles multi-device suffix in JID', () => {
      expect(extractSenderPhone('971589969886:14@c.us')).toBe('+971589969886');
      expect(extractSenderPhone('971505760056:0@c.us')).toBe('+971505760056');
    });

    it('returns empty string for invalid inputs', () => {
      expect(extractSenderPhone('')).toBe('');
      expect(extractSenderPhone(null)).toBe('');
      expect(extractSenderPhone(undefined)).toBe('');
    });
  });

  describe('shouldHandle', () => {
    let service;
    const mockAcm = {
      getMasterPhoneNumber: () => '+971505760056',
    };

    beforeEach(() => {
      service = new InboundDeviceLinkingService({ accountConfigManager: mockAcm });
    });

    it('returns false for outgoing messages or groups', () => {
      expect(service.shouldHandle({ fromMe: true, body: 'add my device' }, '+971505760056')).toBe(false);
      expect(service.shouldHandle({ fromMe: false, isGroupMsg: true, from: '123@g.us', body: 'add my device' }, '+971505760056')).toBe(false);
      expect(service.shouldHandle({ fromMe: false, from: '123@g.us', body: 'add my device' }, '+971505760056')).toBe(false);
    });

    it('returns false if recipient is not the primary master', () => {
      expect(service.shouldHandle(
        { fromMe: false, from: '971589969886@c.us', body: 'add my device' },
        '+971553633595'
      )).toBe(false);
    });

    it('returns true for valid device linking requests sent to primary master', () => {
      expect(service.shouldHandle(
        { fromMe: false, from: '971589969886@c.us', body: 'Hi, Linda, can you add my device please' },
        '+971505760056'
      )).toBe(true);
    });
  });

  describe('handleMessage execution flow', () => {
    let service;
    let mockAcm;
    let mockAccountClients;
    let mockPrimaryClient;
    let mockCreatedClient;
    let mockDlm;
    let mockChm;
    let mockSsm;

    beforeEach(() => {
      mockAcm = {
        getMasterPhoneNumber: jest.fn().mockReturnValue('+971505760056'),
        getAccountByPhone: jest.fn((phone) => {
          if (phone === '+971589969886') {
            return {
              id: 'master_971589969886',
              displayName: 'Master (971589969886)',
              phoneNumber: '+971589969886',
              role: 'primary',
            };
          }
          if (phone === '+971505760056') {
            return {
              id: 'arslan-malik',
              displayName: 'Arslan Malik',
              phoneNumber: '+971505760056',
              role: 'primary',
            };
          }
          return null;
        }),
      };

      mockAccountClients = new Map();
      mockPrimaryClient = {
        sendMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      };

      mockCreatedClient = new EventEmitter();
      mockCreatedClient.options = { pairWithPhoneNumber: {} };

      mockDlm = {
        addDevice: jest.fn(),
      };
      mockChm = {
        registerClient: jest.fn(),
      };
      mockSsm = {
        getDeviceMetadata: jest.fn().mockReturnValue({}),
      };

      service = new InboundDeviceLinkingService({
        accountConfigManager: mockAcm,
        accountClients: mockAccountClients,
        createClient: jest.fn().mockResolvedValue(mockCreatedClient),
        setupClientFlow: jest.fn().mockReturnValue({
          initializationPromise: Promise.resolve(true),
        }),
        getFlowDeps: () => ({}),
        deviceLinkedManager: mockDlm,
        sessionStateManager: mockSsm,
        connectionManagers: new Map(),
        clientHealthMonitor: mockChm,
        codeTimeoutMs: 2000,
      });
    });

    it('rejects unauthorized phone numbers not in bots-config.json', async () => {
      const msg = {
        from: '971599999999@c.us',
        body: 'Hi, Linda, can you add my device please',
        reply: jest.fn().mockResolvedValue(true),
      };

      const result = await service.handleMessage(msg, mockPrimaryClient, '+971505760056');

      expect(result).toBe(true);
      expect(mockPrimaryClient.sendMessage).toHaveBeenCalledWith(
        '971599999999@c.us',
        expect.stringContaining('Unauthorized Device Request')
      );
      expect(service.createClient).not.toHaveBeenCalled();
    });

    it('rejects requests from the primary master itself', async () => {
      const msg = {
        from: '971505760056@c.us',
        body: 'add my device',
        reply: jest.fn().mockResolvedValue(true),
      };

      const result = await service.handleMessage(msg, mockPrimaryClient, '+971505760056');

      expect(result).toBe(true);
      expect(mockPrimaryClient.sendMessage).toHaveBeenCalledWith(
        '971505760056@c.us',
        expect.stringContaining('already online as Linda\'s active host')
      );
      expect(service.createClient).not.toHaveBeenCalled();
    });

    it('informs user if device is already active and connected', async () => {
      const activeClient = {
        getState: jest.fn().mockResolvedValue('CONNECTED'),
      };
      mockAccountClients.set('+971589969886', activeClient);

      const msg = {
        from: '971589969886@c.us',
        body: 'Hi, Linda, can you add my device please',
        reply: jest.fn().mockResolvedValue(true),
      };

      const result = await service.handleMessage(msg, mockPrimaryClient, '+971505760056');

      expect(result).toBe(true);
      expect(mockPrimaryClient.sendMessage).toHaveBeenCalledWith(
        '971589969886@c.us',
        expect.stringContaining('already online, linked, and active')
      );
      expect(service.createClient).not.toHaveBeenCalled();
    });

    it('blocks concurrent pairing attempts for the same phone', async () => {
      service.activeRequests.add('+971589969886');

      const msg = {
        from: '971589969886@c.us',
        body: 'Hi, Linda, can you add my device please',
        reply: jest.fn().mockResolvedValue(true),
      };

      const result = await service.handleMessage(msg, mockPrimaryClient, '+971505760056');

      expect(result).toBe(true);
      expect(mockPrimaryClient.sendMessage).toHaveBeenCalledWith(
        '971589969886@c.us',
        expect.stringContaining('Pairing in Progress')
      );
      expect(service.createClient).not.toHaveBeenCalled();
    });

    it('generates pairing code, dispatches to WhatsApp sender, and confirms when ready', async () => {
      const msg = {
        from: '971589969886@c.us',
        body: 'Hi, Linda, can you add my device please',
        reply: jest.fn().mockResolvedValue(true),
      };

      // Trigger message processing
      const handlePromise = service.handleMessage(msg, mockPrimaryClient, '+971505760056');

      // Allow async initial steps (acknowledgement, client creation, flow setup)
      await new Promise(resolve => setTimeout(resolve, 50));

      // 1. Initial acknowledgement was sent
      expect(mockPrimaryClient.sendMessage).toHaveBeenCalledWith(
        '971589969886@c.us',
        expect.stringContaining('Initiating Device Linking')
      );

      // 2. Client created & setup flow called in code mode
      expect(service.createClient).toHaveBeenCalled();
      expect(service.setupClientFlow).toHaveBeenCalledWith(
        mockCreatedClient,
        '+971589969886',
        expect.any(String),
        expect.objectContaining({ linkingMethod: 'code', isRestore: false }),
        expect.any(Object)
      );

      // 3. Client emits pairing code
      mockCreatedClient.emit('code', 'ABCD-1234');

      const result = await handlePromise;
      expect(result).toBe(true);

      // 4. Pairing code message sent to sender
      expect(mockPrimaryClient.sendMessage).toHaveBeenCalledWith(
        '971589969886@c.us',
        expect.stringContaining('ABCD-1234')
      );
      expect(mockPrimaryClient.sendMessage).toHaveBeenCalledWith(
        '971589969886@c.us',
        expect.stringContaining('Link with phone number instead')
      );

      // 5. When device is linked on the phone, ready is fired
      mockCreatedClient.emit('ready');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockPrimaryClient.sendMessage).toHaveBeenCalledWith(
        '971589969886@c.us',
        expect.stringContaining('Device Successfully Linked!')
      );
      expect(service.activeRequests.has('+971589969886')).toBe(false);
    });

    it('handles pairing code generation timeout gracefully', async () => {
      service.codeTimeoutMs = 100; // fast timeout

      const msg = {
        from: '971589969886@c.us',
        body: 'add my device',
        reply: jest.fn().mockResolvedValue(true),
      };

      const result = await service.handleMessage(msg, mockPrimaryClient, '+971505760056');
      expect(result).toBe(true);

      expect(mockPrimaryClient.sendMessage).toHaveBeenCalledWith(
        '971589969886@c.us',
        expect.stringContaining('timed out')
      );
      expect(service.activeRequests.has('+971589969886')).toBe(false);
    });
  });
});
