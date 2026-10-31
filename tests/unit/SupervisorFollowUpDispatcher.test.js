import {
  formatSupervisorAssignmentMessage,
  dispatchSupervisorReminder,
} from '../../src/outreach/SupervisorFollowUpDispatcher.js';

describe('SupervisorFollowUpDispatcher', () => {
  it('formats detailed follow-up assignment message for sub-agent', () => {
    const text = formatSupervisorAssignmentMessage({
      ownerName: 'Rashid Al Nuaimi',
      clientPhone: '+971501234567',
      community: 'Damac Hills 2',
      unit: 'Camellia Villa 42',
      lastInteractionAt: 1672531199000,
      agentName: 'Agent Arslan',
    });

    expect(text).toContain('Supervisor Follow-Up Assignment');
    expect(text).toContain('Hello Agent Arslan');
    expect(text).toContain('Rashid Al Nuaimi');
    expect(text).toContain('+971501234567');
    expect(text).toContain('Damac Hills 2');
    expect(text).toContain('Camellia Villa 42');
    expect(text).toContain('Prior Chat Activity');
  });

  it('delivers supervisor reminder via supervisor client', async () => {
    const mockPrimaryClient = {
      sendMessage: jest.fn().mockResolvedValue({ id: { id: 'msg-supervisor-123' } }),
    };

    const res = await dispatchSupervisorReminder({
      clientInfo: { name: 'Rashid Al Nuaimi', phone: '+971501234567', community: 'Damac Hills 2' },
      targetAgentPhone: '+971589969886',
      agentName: 'Agent Linda',
      primaryClient: mockPrimaryClient,
    });

    expect(res.ok).toBe(true);
    expect(res.messageId).toBe('msg-supervisor-123');
    expect(mockPrimaryClient.sendMessage).toHaveBeenCalledWith(
      '971589969886@c.us',
      expect.stringContaining('Supervisor Follow-Up Assignment'),
      { allowClosedCirclePrompt: true }
    );
  });
});
