import { ZombieBrowserReaper } from '../../src/connection/ZombieBrowserReaper.js';

describe('ZombieBrowserReaper (Pillar 6 - Safe Orphaned Browser Cleanup)', () => {
  it('detects and reaps orphaned Chrome processes while protecting active clients on Windows', async () => {
    const mockOutput = [
      '"chrome.exe","1010","Console","1","50,000 K"',
      '"chrome.exe","2020","Console","1","60,000 K"',
      '"chrome.exe","3030","Console","1","55,000 K"',
    ].join('\r\n');

    const executedCommands = [];
    const mockExec = jest.fn().mockImplementation(async (cmd) => {
      executedCommands.push(cmd);
      if (cmd.includes('tasklist')) {
        return { stdout: mockOutput, stderr: '' };
      }
      return { stdout: 'SUCCESS', stderr: '' };
    });

    // Active client has PID 2020
    const activeClients = new Map();
    activeClients.set('+971501112222', {
      pupBrowser: { process: () => ({ pid: 2020 }) },
    });

    const reaper = new ZombieBrowserReaper({
      execImpl: mockExec,
      isWindows: true,
    });

    const res = await reaper.reapZombies({ activeClients });

    expect(res.found).toBe(2); // 1010 and 3030
    expect(res.reaped).toBe(2);
    expect(res.pids).toEqual([1010, 3030]);

    // Verify Law #1: Only chrome.exe taskkill was invoked, never node.exe
    for (const cmd of executedCommands) {
      expect(cmd).not.toContain('node.exe');
      if (cmd.startsWith('taskkill')) {
        expect(cmd).toMatch(/taskkill \/F \/PID (1010|3030)/);
      }
    }
  });

  it('supports dryRun mode without executing taskkill', async () => {
    const mockOutput = '"chrome.exe","4040","Console","1","50,000 K"';
    const mockExec = jest.fn().mockResolvedValue({ stdout: mockOutput, stderr: '' });

    const reaper = new ZombieBrowserReaper({
      execImpl: mockExec,
      isWindows: true,
    });

    const res = await reaper.reapZombies({ dryRun: true });

    expect(res.found).toBe(1);
    expect(res.reaped).toBe(0);
    expect(res.pids).toEqual([4040]);
    expect(mockExec).toHaveBeenCalledTimes(1); // Only tasklist, no kill
  });
});

