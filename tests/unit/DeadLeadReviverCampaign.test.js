import { DeadLeadReviverCampaign } from '../../src/outreach/DeadLeadReviverCampaign.js';

describe('DeadLeadReviverCampaign (Pillar 5 - 30-Day Dormant Lead Re-engagement)', () => {
  it('identifies leads dormant > 30 days as eligible and sends humanized message', async () => {
    const mockClient = {
      sendMessage: jest.fn().mockResolvedValue({ id: 'msg_revive_123' }),
    };

    const campaign = new DeadLeadReviverCampaign({ inactivityThresholdDays: 30 });

    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const lead = {
      phone: '+971501234567',
      name: 'Ahmed',
      lastContactDate: fortyDaysAgo,
      status: 'CONTACTED',
    };

    const res = await campaign.reviveLead(mockClient, lead, { instant: true });

    expect(res.sent).toBe(true);
    expect(res.message).toContain('Ahmed');
    expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockClient.sendMessage).toHaveBeenCalledWith(
      '971501234567@c.us',
      expect.stringContaining('Ahmed'),
      expect.any(Object)
    );
  });

  it('rejects leads contacted recently (< 30 days ago)', async () => {
    const campaign = new DeadLeadReviverCampaign({ inactivityThresholdDays: 30 });

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const lead = {
      phone: '+971509998888',
      name: 'Sara',
      lastContactDate: tenDaysAgo,
      status: 'CONTACTED',
    };

    const evalRes = campaign.evaluateEligibility(lead);
    expect(evalRes.eligible).toBe(false);
    expect(evalRes.reason).toContain('recently_contacted');
  });

  it('strictly respects opt-out statuses (UNRESPONSIVE, DO_NOT_CALL)', async () => {
    const campaign = new DeadLeadReviverCampaign({ inactivityThresholdDays: 30 });

    const fiftyDaysAgo = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString();
    const lead = {
      phone: '+971503334444',
      name: 'John',
      lastContactDate: fiftyDaysAgo,
      status: 'UNRESPONSIVE',
    };

    const evalRes = campaign.evaluateEligibility(lead);
    expect(evalRes.eligible).toBe(false);
    expect(evalRes.reason).toContain('disqualified_by_status_UNRESPONSIVE');
  });
});
