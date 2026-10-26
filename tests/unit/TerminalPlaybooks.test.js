import TerminalNumberMenu from '../../src/terminal/TerminalNumberMenu.js';
import TerminalPlaybooks, { PLAYBOOKS } from '../../src/terminal/TerminalPlaybooks.js';

describe('Terminal playbooks (problem → numbered steps)', () => {
  let menu;
  let master;
  let playbooks;

  beforeEach(() => {
    menu = new TerminalNumberMenu({
      accountConfigManager: { getAllAccounts: () => [] },
      deviceManager: { getAllDevices: () => [] },
    }, jest.fn());
    menu.refresh(false);
    master = '+15551234567';
    playbooks = new TerminalPlaybooks(menu, () => master, key => (key === 'p1' ? 3 : 0));
  });

  test('every step points at a runnable menu action that matches its ready command', () => {
    PLAYBOOKS.forEach((playbook, index) => {
      expect(playbook.id).toBe(index + 1);
      for (const step of playbook.steps) {
        const node = menu.nodeAt(step.code.split('.').map(Number));
        expect(node?.command).toBeTruthy();
        if (step.command) expect(step.command.startsWith(node.command)).toBe(true);
      }
    });
  });

  test('summary lines show steps by code with run counters', () => {
    const [first] = playbooks.summaryLines();
    expect(first).toBe('P1 Restore master (offline but still linked) ×3: 1.16 recover → 1.9 relink master → 2.1 link-code');
    expect(playbooks.summaryLines()).toHaveLength(PLAYBOOKS.length);
  });

  test('resolves listing, details and runnable steps with the master phone filled in', () => {
    expect(playbooks.resolve('p').lines[0]).toContain('LINDA PLAYBOOKS');
    expect(playbooks.resolve('P1').lines.join('\n')).toContain('p1.1  [1.16] recover +15551234567');
    expect(playbooks.resolve('p1.1')).toEqual({ id: 1, input: 'recover +15551234567' });
    expect(playbooks.resolve('p1.2')).toEqual({ id: 1, input: 'relink master +15551234567' });
    expect(playbooks.resolve('p1.3')).toEqual({ id: 1, input: '2.1' });
    expect(playbooks.resolve('p8.1')).toEqual({ id: 8, input: '8.2' });
    expect(playbooks.resolve('p1.9').lines[0]).toContain('steps 1-3');
    expect(playbooks.resolve('p99').lines[0]).toContain('No playbook P99');
    expect(playbooks.resolve('recover +1555')).toBeNull();
    expect(playbooks.resolve('1.16')).toBeNull();
  });

  test('without a master, master steps fall back to the menu code that asks for the phone', () => {
    master = null;
    expect(playbooks.resolve('p1.1')).toEqual({ id: 1, input: '1.16' });
    expect(playbooks.resolve('p1').lines.join('\n')).toContain('recover (asks for values)');
  });
});
