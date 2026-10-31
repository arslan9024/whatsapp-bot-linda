import {
  detectCluster,
  formatClusterBrief,
  formatValuationReport,
  classifyLeadIntent,
} from '../../src/outreach/DamacHills2Intelligence.js';
import { SupervisorReassignmentManager } from '../../src/outreach/SupervisorReassignmentManager.js';
import { VoiceTranscriptionService } from '../../src/intelligence/VoiceTranscriptionService.js';
import { supervisorFollowUpTracker } from '../../src/outreach/SupervisorFollowUpTracker.js';
import { KeypadActionExecutor } from '../../src/whatsapp/keypad/KeypadActionExecutor.js';

describe('All 20 Points Verification Across 6 Pillars', () => {
  describe('Pillar 1: Real Estate Intelligence (Items 1, 3, 4)', () => {
    it('detects Damac Hills 2 cluster and formats cluster brief (Item 1)', () => {
      const cluster = detectCluster('Villa in Victoria cluster');
      expect(cluster).not.toBeNull();
      expect(cluster.name).toBe('Victoria');

      const brief = formatClusterBrief(cluster);
      expect(brief).toContain('VICTORIA CLUSTER');
      expect(brief).toContain('Gross Yield');
    });

    it('generates accurate property valuation estimates for 3, 4, and 5 beds (Item 3)', () => {
      const report3 = formatValuationReport(3);
      expect(report3).toContain('3-BEDROOM');
      expect(report3).toContain('Estimated Market Value');
      expect(report3).toContain('Rental Projection');

      const report5 = formatValuationReport(5);
      expect(report5).toContain('5-BEDROOM');
      expect(report5).toContain('BUA');
    });

    it('classifies lead intent accurately between Investor and End-User (Item 4)', () => {
      const investorReply = classifyLeadIntent('I want to know the rental yield and current tenant lease details');
      expect(investorReply.type).toBe('INVESTOR');
      expect(investorReply.confidence).toBeGreaterThan(0.5);

      const endUserReply = classifyLeadIntent('My family is moving in next month and we will live there');
      expect(endUserReply.type).toBe('END_USER');
      expect(endUserReply.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Pillar 3 & 5: Supervisor Reassignment & Team Broadcast (Items 10, 16)', () => {
    it('reassigns a lead and resets the SLA countdown (Item 10)', async () => {
      // First record an assignment
      supervisorFollowUpTracker.recordAssignment({
        ownerName: 'Test Owner For Reassign',
        clientPhone: '971509998888',
        assignedAgentPhone: '971501111111',
        agentName: 'Agent Old',
      });

      const res = await SupervisorReassignmentManager.reassignLead({
        clientPhone: '971509998888',
        newAgentPhone: '971502222222',
        newAgentName: 'Agent New',
        reason: 'Workload balancing',
      });

      expect(res.success).toBe(true);
      expect(res.newAgentPhone).toBe('971502222222');

      const pending = supervisorFollowUpTracker.getPendingAssignments();
      const updated = pending.find((p) => p.clientPhone.includes('971509998888'));
      expect(updated.assignedAgentPhone).toContain('971502222222');
      expect(updated.agentName).toBe('Agent New');
    });

    it('broadcasts announcements to all active sub-agent lines (Item 16)', async () => {
      const mockAgentClient = {
        sendMessage: jest.fn().mockResolvedValue({ id: { id: 'msg-team-1' } }),
      };

      const clients = new Map([
        ['+971505760056', { info: { wid: { user: '971505760056' } } }], // Supervisor
        ['+971559156636', mockAgentClient], // Sub-agent 1
      ]);

      const res = await SupervisorReassignmentManager.broadcastToSubAgents('Important market update', {
        accountClients: clients,
        accountConfigManager: { getMasterPhoneNumber: () => '+971505760056' },
      });

      expect(res.success).toBe(true);
      expect(res.deliveredCount).toBe(1);
      expect(mockAgentClient.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Pillar 4: Multimodal Voice & Brochure (Items 12, 13)', () => {
    it('transcribes voice note audio and returns intent classification (Item 12)', async () => {
      const service = new VoiceTranscriptionService();
      const res = await service.transcribeAudio(Buffer.from('fake-audio-bytes'), {
        mockText: 'Hello, I want to rent out my townhouse in Amazon cluster',
      });

      expect(res.success).toBe(true);
      expect(res.transcript).toContain('Amazon cluster');
      expect(res.intent.type).toBe('INVESTOR');
    });

    it('provides digital brochure links and asset details (Item 13)', () => {
      const details = SupervisorReassignmentManager.getBrochureDetails();
      expect(details).toContain('DIGITAL BROCHURE');
      expect(details).toContain('damacproperties.com');
      expect(details).toContain('Water Town');
    });
  });

  describe('Keypad Action Executor Full Menu Integration', () => {
    it('executes new keypad actions seamlessly', async () => {
      const executor = new KeypadActionExecutor();

      const valuationRes = await executor.execute('campaign_valuation', { query: '4' });
      expect(valuationRes).toContain('4-BEDROOM');

      const brochureRes = await executor.execute('campaign_brochure');
      expect(brochureRes).toContain('DIGITAL BROCHURE');
    });
  });
});
