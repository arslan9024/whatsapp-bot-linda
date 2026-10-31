import { ClosedCircleGuard } from '../../src/core/ClosedCircleGuard.js';
import { lidPhoneStore } from '../../src/linking/InboundLinkingHelpers.js';

describe('ClosedCircleGuard (Strict Dev Phase Safety Shield)', () => {
  let guard;
  let mockAcm;

  beforeEach(() => {
    mockAcm = {
      getMasterPhoneNumber: () => '+971505760056',
      getAllAccounts: () => [
        { phoneNumber: '+971505760056', role: 'primary' },
        { phoneNumber: '+971559156636', role: 'primary' },
        { phoneNumber: '+971589969886', role: 'primary' },
        { phoneNumber: '+971505110636', role: 'primary' },
      ],
    };

    guard = new ClosedCircleGuard({ accountConfigManager: mockAcm });
  });

  describe('isMasterRecipient', () => {
    it('allows all master account phone numbers in various formats', () => {
      expect(guard.isMasterRecipient('+971505760056')).toBe(true);
      expect(guard.isMasterRecipient('971505760056')).toBe(true);
      expect(guard.isMasterRecipient('971505760056@c.us')).toBe(true);
      expect(guard.isMasterRecipient('971505760056:12@c.us')).toBe(true);
      expect(guard.isMasterRecipient('+971559156636')).toBe(true);
      expect(guard.isMasterRecipient('971559156636@c.us')).toBe(true);
      expect(guard.isMasterRecipient('+971505110636')).toBe(true);
    });

    it('strictly blocks non-master numbers and unknown contacts', () => {
      expect(guard.isMasterRecipient('+971509999999')).toBe(false);
      expect(guard.isMasterRecipient('971509999999@c.us')).toBe(false);
      expect(guard.isMasterRecipient('971509999999:5@c.us')).toBe(false);
      expect(guard.isMasterRecipient('+1234567890')).toBe(false);
      expect(guard.isMasterRecipient(null)).toBe(false);
      expect(guard.isMasterRecipient('')).toBe(false);
    });

    it('strictly blocks group chats during dev phase', () => {
      expect(guard.isMasterRecipient('120363024823904@g.us')).toBe(false);
    });

    it('resolves mapped WhatsApp privacy LIDs to master numbers', () => {
      lidPhoneStore.set('91702450733229', '+971589969886');
      expect(guard.isMasterRecipient('91702450733229@lid')).toBe(true);

      // Unmapped LID is blocked
      expect(guard.isMasterRecipient('99999999999999@lid')).toBe(false);
    });
  });

  describe('protectClient', () => {
    it('permits sending messages to master accounts', async () => {
      const originalSend = jest.fn().mockResolvedValue({ id: 'sent-1' });
      const mockClient = {
        sendMessage: originalSend,
      };

      guard.protectClient(mockClient, '+971505760056');

      const result = await mockClient.sendMessage('971559156636@c.us', 'Hello master');
      expect(result).toEqual({ id: 'sent-1' });
      expect(originalSend).toHaveBeenCalledWith('971559156636@c.us', 'Hello master', undefined);
    });

    it('blocks sending messages to non-master recipients', async () => {
      const originalSend = jest.fn().mockResolvedValue({ id: 'sent-1' });
      const mockClient = {
        sendMessage: originalSend,
      };

      guard.protectClient(mockClient, '+971505760056');

      await expect(
        mockClient.sendMessage('971509999999@c.us', 'Hello non-master')
      ).rejects.toThrow('ClosedCircleGuard');

      expect(originalSend).not.toHaveBeenCalled();
    });
  });

  describe('protectMessage', () => {
    it('permits replying to master accounts', async () => {
      const originalReply = jest.fn().mockResolvedValue({ id: 'reply-1' });
      const mockMsg = {
        from: '971559156636@c.us',
        reply: originalReply,
      };

      guard.protectMessage(mockMsg);

      const result = await mockMsg.reply('Hello master reply');
      expect(result).toEqual({ id: 'reply-1' });
      expect(originalReply).toHaveBeenCalledWith('Hello master reply', undefined, undefined);
    });

    it('blocks replying to non-master contacts', async () => {
      const originalReply = jest.fn().mockResolvedValue({ id: 'reply-1' });
      const mockMsg = {
        from: '971509999999@c.us',
        reply: originalReply,
      };

      guard.protectMessage(mockMsg);

      await expect(mockMsg.reply('Hello unauthorized')).rejects.toThrow('ClosedCircleGuard');
      expect(originalReply).not.toHaveBeenCalled();
    });
  });
});
