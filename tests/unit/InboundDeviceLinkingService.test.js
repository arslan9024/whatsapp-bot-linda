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
  extractPhonesFromText,
  isLidJid,
  resolveSenderPhone,
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
    let mockConnManagers;

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

      mockConnManagers = new Map();

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
        connectionManagers: mockConnManagers,
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

    it('informs user if device is already active via ConnectionManager state CONNECTED', async () => {
      mockAccountClients.clear();
      mockConnManagers.set('+971589969886', { state: 'CONNECTED', isConnected: true });

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
      mockConnManagers.clear();
    });

    it('informs user if device is already active via client.info.wid', async () => {
      mockAccountClients.clear();
      mockAccountClients.set('+971589969886', {
        info: { wid: { user: '971589969886' } },
        getState: jest.fn().mockRejectedValue(new Error('Evaluation failed')),
      });

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
      mockAccountClients.clear();
    });

    it('informs user if device is already active via DeviceLinkedManager', async () => {
      mockAccountClients.clear();
      mockDlm.isDeviceOnline = jest.fn().mockReturnValue(true);

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
      mockDlm.isDeviceOnline = jest.fn().mockReturnValue(false);
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
      service.activeRequests.clear('+971589969886');
    });

    it('auto-expires stale active pairing requests after TTL', async () => {
      // Simulate an old pairing request from 10 minutes ago
      service.activeRequests.set('+971589969886', Date.now() - 600000);
      expect(service.activeRequests.isActive('+971589969886')).toBe(false);
      expect(service.activeRequests.has('+971589969886')).toBe(false);
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

    it('resolves sender phone automatically from WhatsApp LID via client.getContactLidAndPhone', async () => {
      const msg = {
        from: '91702450733229@lid',
        body: 'Hi, Linda, can you add my device please',
        reply: jest.fn().mockResolvedValue(true),
      };

      const mockClientWithLid = {
        sendMessage: jest.fn().mockResolvedValue(true),
        getContactLidAndPhone: jest.fn().mockResolvedValue([{ pn: '971589969886@c.us' }]),
      };

      const handlePromise = service.handleMessage(msg, mockClientWithLid, '+971505760056');
      await new Promise(resolve => setTimeout(resolve, 50));
      mockCreatedClient.emit('code', 'TEST-9999');
      const result = await handlePromise;

      expect(result).toBe(true);
      expect(mockClientWithLid.sendMessage).toHaveBeenCalledWith(
        '971589969886@c.us',
        expect.stringContaining('TEST-9999')
      );
    });

    it('resolves sender phone from message body when received via unmapped WhatsApp LID', async () => {
      const msg = {
        from: '91702450733229@lid',
        body: 'Hi Linda, can you add my device 0589969886 please',
        reply: jest.fn().mockResolvedValue(true),
      };

      const mockClientNoLidSupport = {
        sendMessage: jest.fn().mockResolvedValue(true),
      };

      const handlePromise = service.handleMessage(msg, mockClientNoLidSupport, '+971505760056');
      await new Promise(resolve => setTimeout(resolve, 50));
      mockCreatedClient.emit('code', 'BODY-5678');
      const result = await handlePromise;

      expect(result).toBe(true);
      expect(mockClientNoLidSupport.sendMessage).toHaveBeenCalledWith(
        '971589969886@c.us',
        expect.stringContaining('BODY-5678')
      );
    });

    it('prompts user with guidance when message is from unmapped LID without phone number', async () => {
      const msg = {
        from: '91709999999999@lid',
        body: 'add my device',
        reply: jest.fn().mockResolvedValue(true),
      };

      const result = await service.handleMessage(msg, mockPrimaryClient, '+971505760056');
      expect(result).toBe(true);
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining('WhatsApp Privacy ID Detected')
      );
    });
  });

  describe('InboundLinkingHelpers', () => {
    it('detects WhatsApp LIDs accurately', () => {
      expect(isLidJid('91702450733229@lid')).toBe(true);
      expect(isLidJid('91702450733229')).toBe(true);
      expect(isLidJid('971589969886@c.us')).toBe(false);
      expect(isLidJid('0589969886')).toBe(false);
    });

    it('extracts UAE phone numbers from arbitrary text strings', () => {
      expect(extractPhonesFromText('Hi Linda add 0589969886 please')).toEqual(['+971589969886']);
      expect(extractPhonesFromText('link +971589969886 now')).toEqual(['+971589969886']);
      expect(extractPhonesFromText('device 971589969886')).toEqual(['+971589969886']);
      expect(extractPhonesFromText('no phone in this message')).toEqual([]);
    });

    it('resolves direct phone JID without LID processing', async () => {
      const msg = { from: '971589969886@c.us' };
      const res = await resolveSenderPhone(msg);
      expect(res.phone).toBe('+971589969886');
      expect(res.isLid).toBe(false);
    });
  });
});
