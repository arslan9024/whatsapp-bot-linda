import { getOrganicGreeting, sendHumanizedMessage } from '../../src/outreach/HumanizedMessageSender.js';
import { SupervisorFollowUpTracker } from '../../src/outreach/SupervisorFollowUpTracker.js';
import path from 'path';
import fs from 'fs';

describe('HumanizedMessageSender & SupervisorFollowUpTracker', () => {
  const testFollowupFile = path.resolve('data', 'outreach', 'test-pending-followups.json');

  beforeEach(() => {
    if (fs.existsSync(testFollowupFile)) {
      try {
        fs.unlinkSync(testFollowupFile);
      } catch (_) {}
    }
  });

  afterAll(() => {
    if (fs.existsSync(testFollowupFile)) {
      try {
        fs.unlinkSync(testFollowupFile);
      } catch (_) {}
    }
  });

  describe('getOrganicGreeting', () => {
    it('generates varied greetings containing owner name', () => {
      const greeting = getOrganicGreeting('Fatima Al Zaabi');
      expect(greeting).toContain('Fatima Al Zaabi');
      expect(greeting).toMatch(/(Good (morning|afternoon|evening)|Hello|Hi)/);
    });

    it('handles empty owner name gracefully', () => {
      const greeting = getOrganicGreeting('');
      expect(greeting).not.toContain('undefined');
      expect(greeting.length).toBeGreaterThan(10);
    });
  });

  describe('sendHumanizedMessage', () => {
    it('dispatches message with instant option enabled in tests', async () => {
      const mockClient = {
        sendMessage: jest.fn().mockResolvedValue({ id: { id: 'msg-hum-1' } }),
      };

      const result = await sendHumanizedMessage(
        mockClient,
        '971501234567@c.us',
        'Good afternoon!',
        { instant: true }
      );

      expect(result.id.id).toBe('msg-hum-1');
      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        '971501234567@c.us',
        'Good afternoon!',
        expect.objectContaining({ allowClosedCirclePrompt: true })
      );
    });
  });

  describe('SupervisorFollowUpTracker', () => {
    it('records assignments and tracks SLA status', () => {
      const tracker = new SupervisorFollowUpTracker(testFollowupFile);

      const entry = tracker.recordAssignment({
        ownerName: 'Rashid Al Nuaimi',
        clientPhone: '+971501234567',
        assignedAgentPhone: '+971589969886',
        agentName: 'Junior Agent 2',
        community: 'Damac Hills 2',
        unit: 'Victoria 12',
      });

      expect(entry).toBeDefined();
      expect(entry.status).toBe('pending');

      const pending = tracker.getPendingAssignments();
      expect(pending.length).toBe(1);
      expect(pending[0].ownerName).toBe('Rashid Al Nuaimi');
      expect(pending[0].isOverdue).toBe(false);
      expect(pending[0].slaLabel).toContain('/ 24h');

      // Marking completed updates status
      const completed = tracker.markCompleted('+971501234567');
      expect(completed).toBe(true);
      expect(tracker.getPendingAssignments().length).toBe(0);
    });
  });
});
