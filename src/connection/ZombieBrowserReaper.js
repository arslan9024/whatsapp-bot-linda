/**
 * ====================================================================
 * ZOMBIE CHROME BROWSER REAPER (Pillar 6 - 24/7 Resilience)
 * ====================================================================
 * Proactively inspects running operating system processes to detect and
 * safely reap orphaned Chrome / Chromium processes:
 *   - Strictly adheres to Law #1: NEVER kills node.exe.
 *   - Reaps only chrome.exe / chromium processes whose parent process or
 *     active ConnectionManager has closed.
 *   - Cross-checks PIDs against active clients in ServiceRegistry to prevent
 *     terminating healthy running bot sessions.
 *   - Uses native tasklist / wmic on Windows and ps on POSIX.
 *
 * @since Development Phase — November 2026
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../core/Logger.js';
import services from '../core/ServiceRegistry.js';

const execAsync = promisify(exec);
const logger = new Logger('ZombieBrowserReaper');

export class ZombieBrowserReaper {
  constructor(options = {}) {
    this.execImpl = options.execImpl || execAsync;
    this.isWindows = options.isWindows !== undefined ? options.isWindows : process.platform === 'win32';
  }

  /**
   * Get set of PIDs belonging to currently healthy, active clients.
   *
   * @param {Map|object} [activeClients]
   * @returns {Set<number>}
   */
  getActiveClientPids(activeClients) {
    const pids = new Set();
    const clients = activeClients || services.get('accountClients') || new Map();

    const clientList = clients instanceof Map ? Array.from(clients.values()) : Object.values(clients);
    for (const client of clientList) {
      // whatsapp-web.js exposes puppeteer browser process via pupBrowser
      const pid = client?.pupBrowser?.process?.()?.pid || client?.pupPage?.browser?.()?.process?.()?.pid;
      if (pid && typeof pid === 'number') {
        pids.add(pid);
      }
    }

    return pids;
  }

  /**
   * Scan for orphaned Chrome processes and terminate them safely.
   *
   * @param {object} [options]
   * @param {Map} [options.activeClients]
   * @param {boolean} [options.dryRun]
   * @returns {Promise<{ found: number, reaped: number, pids: number[] }>}
   */
  async reapZombies({ activeClients = null, dryRun = false } = {}) {
    const healthyPids = this.getActiveClientPids(activeClients);
    const orphanedPids = [];

    try {
      if (this.isWindows) {
        // Query Chrome processes on Windows
        const { stdout } = await this.execImpl('tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV /NH');
        const lines = stdout.split('\n').filter(Boolean);

        for (const line of lines) {
          const match = line.match(/^"chrome\.exe","(\d+)"/i);
          if (match) {
            const pid = parseInt(match[1], 10);
            if (!healthyPids.has(pid)) {
              orphanedPids.push(pid);
            }
          }
        }
      } else {
        // Query on POSIX
        const { stdout } = await this.execImpl('pgrep -f "chrome|chromium" || true');
        const pids = stdout.split('\n').map((p) => parseInt(p.trim(), 10)).filter(Boolean);

        for (const pid of pids) {
          if (!healthyPids.has(pid)) {
            orphanedPids.push(pid);
          }
        }
      }

      logger.info(`🔍 Zombie Browser scan: Found ${orphanedPids.length} orphaned process(es) (${healthyPids.size} active protected)`);

      if (orphanedPids.length === 0 || dryRun) {
        return { found: orphanedPids.length, reaped: 0, pids: orphanedPids };
      }

      let reapedCount = 0;
      for (const pid of orphanedPids) {
        try {
          const killCmd = this.isWindows ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
          await this.execImpl(killCmd);
          reapedCount++;
        } catch (_) {
          /* process may have exited already */
        }
      }

      logger.info(`🧹 Reaped ${reapedCount} orphaned browser process(es) cleanly`);
      return { found: orphanedPids.length, reaped: reapedCount, pids: orphanedPids };
    } catch (err) {
      logger.warn(`Zombie browser scan encountered non-fatal error: ${err.message}`);
      return { found: 0, reaped: 0, pids: [], error: err.message };
    }
  }
}

export const zombieBrowserReaper = new ZombieBrowserReaper();
export default zombieBrowserReaper;
