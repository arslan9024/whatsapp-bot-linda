import { auditClientChat, auditCrossAccountHistory } from '../../src/outreach/DeepChatHistoryAuditor.js';

describe('DeepChatHistoryAuditor (Cross-Account Deep Audit)', () => {
  it('detects prior conversation via Puppeteer Store evaluation', async () => {
    const mockPupPage = {
      evaluate: jest.fn().mockResolvedValue({
        found: true,
        jid: '971501234567@c.us',
        messageCount: 5,
        lastTimestamp: 1600000000000,
        lastBodySnippet: 'Yes, looking for a 3-bedroom villa',
      }),
    };

    const mockClient = {
      pupPage: mockPupPage,
      getContactLidAndPhone: jest.fn().mockResolvedValue([{ lid: '123456@lid', pn: '971501234567' }]),
    };

    const result = await auditClientChat(mockClient, '971501234567');
    expect(result).not.toBeNull();
    expect(result.found).toBe(true);
    expect(result.messageCount).toBe(5);
    expect(result.lastBodySnippet).toContain('3-bedroom villa');
  });

  it('detects prior conversation via fallback getChats()', async () => {
    const mockClient = {
      pupPage: null, // no Puppeteer page available
      getChats: jest.fn().mockResolvedValue([
        {
          id: { user: '971501234567', _serialized: '971501234567@c.us' },
          timestamp: 1670000000,
          lastMessage: { body: 'Hello interested in Damac', fromMe: false },
        },
      ]),
    };

    const result = await auditClientChat(mockClient, '971501234567');
    expect(result).not.toBeNull();
    expect(result.found).toBe(true);
    expect(result.lastBodySnippet).toBe('Hello interested in Damac');
  });

  it('returns null if chat exists but has no real messages (empty draft placeholder)', async () => {
    const mockPupPage = {
      evaluate: jest.fn().mockResolvedValue(null),
    };

    const mockClient = {
      pupPage: mockPupPage,
      getContactLidAndPhone: jest.fn().mockResolvedValue([]),
    };

    const result = await auditClientChat(mockClient, '971509999999');
    expect(result).toBeNull();
  });

  it('audits across multiple accounts and maps to the correct sub-agent line', async () => {
    const mockClientAgentA = {
      pupPage: { evaluate: jest.fn().mockResolvedValue(null) },
    };

    const mockClientAgentB = {
      pupPage: {
        evaluate: jest.fn().mockResolvedValue({
          found: true,
          jid: '971553633595@c.us',
          messageCount: 3,
          lastTimestamp: 1680000000000,
          lastBodySnippet: 'Follow up later please',
        }),
      },
    };

    const accountClients = new Map([
      ['+971505760056', mockClientAgentA],
      ['+971589969886', mockClientAgentB],
    ]);

    const mockAcm = {
      getAccountByPhone: jest.fn((p) => ({
        phoneNumber: p,
        displayName: p.includes('9886') ? 'Agent Sarah' : 'Linda Master',
      })),
    };

    const audit = await auditCrossAccountHistory('971553633595', {
      accountClients,
      accountConfigManager: mockAcm,
    });

    expect(audit.hasPriorChat).toBe(true);
    expect(audit.accountPhone).toBe('+971589969886');
    expect(audit.accountName).toBe('Agent Sarah');
  });

  it('returns false when no accounts have any chat history', async () => {
    const mockClient = {
      pupPage: { evaluate: jest.fn().mockResolvedValue(null) },
    };

    const accountClients = new Map([['+971505760056', mockClient]]);

    const audit = await auditCrossAccountHistory('971500000000', {
      accountClients,
      accountConfigManager: null,
    });

    expect(audit.hasPriorChat).toBe(false);
    expect(audit.accountPhone).toBeNull();
  });
});

