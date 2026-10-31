import { AgentWorkingHoursRoster } from '../../src/accounts/AgentWorkingHoursRoster.js';

describe('AgentWorkingHoursRoster (Pillar 4 - Shift & Lead Balancing)', () => {
  it('correctly validates working hours inside Dubai schedule (e.g. 2 PM Tuesday)', () => {
    const roster = new AgentWorkingHoursRoster();

    // 2026-11-03 is Tuesday, 10:00 UTC = 14:00 (2 PM) Dubai time
    const tuesdayAfternoon = new Date('2026-11-03T10:00:00Z');
    expect(roster.isWorkingHours(tuesdayAfternoon)).toBe(true);

    // 20:00 UTC = 00:00 (Midnight) Dubai time
    const midnight = new Date('2026-11-03T20:00:00Z');
    expect(roster.isWorkingHours(midnight)).toBe(false);
  });

  it('balances lead assignment round-robin across active agents', () => {
    const roster = new AgentWorkingHoursRoster();
    roster.registerAgent({ phone: '+971501111111', name: 'Agent Sarah' });
    roster.registerAgent({ phone: '+971502222222', name: 'Agent Tariq' });
    roster.registerAgent({ phone: '+971503333333', name: 'Agent Mike', isOnLeave: true });

    // Ensure available agents exclude on-leave
    expect(roster.getAvailableAgents().length).toBe(2);

    const midDay = new Date('2026-11-03T10:00:00Z');

    const first = roster.getNextOnDutyAgent(midDay);
    expect(first.assigned).toBe(true);
    expect(first.agent.name).toBe('Agent Sarah');

    const second = roster.getNextOnDutyAgent(midDay);
    expect(second.assigned).toBe(true);
    expect(second.agent.name).toBe('Agent Tariq');

    const third = roster.getNextOnDutyAgent(midDay);
    expect(third.assigned).toBe(true);
    expect(third.agent.name).toBe('Agent Sarah'); // Rotates back
  });

  it('triggers off-hours auto reply when inquiry arrives outside business hours', () => {
    const roster = new AgentWorkingHoursRoster();
    roster.registerAgent({ phone: '+971501111111', name: 'Agent Sarah' });

    const nightTime = new Date('2026-11-03T21:00:00Z'); // 1 AM Dubai time
    const res = roster.getNextOnDutyAgent(nightTime);

    expect(res.assigned).toBe(false);
    expect(res.offHours).toBe(true);
    expect(res.autoReplyText).toContain('offline');
  });
});

