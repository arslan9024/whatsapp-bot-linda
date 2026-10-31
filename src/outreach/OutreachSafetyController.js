/**
 * ====================================================================
 * OUTREACH SAFETY CONTROLLER (Pillar 5 - One-Tap Safe Pause)
 * ====================================================================
 * Emergency circuit switch to immediately halt or resume all cold outreach:
 *   - Persists pause status to data/outreach/safety-state.json
 *   - Synchronously checked before any message is dispatched.
 *
 * @since Development Phase — October 2026
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../core/Logger.js';

const logger = new Logger('OutreachSafetyController');

export class OutreachSafetyController {
  constructor(options = {}) {
    this.stateFile = options.stateFile || path.resolve('data', 'outreach', 'safety-state.json');
  }

  getState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const raw = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        return raw;
      }
    } catch (_) {}
    return { paused: false, pausedAt: null, reason: null };
  }

  isPaused() {
    return Boolean(this.getState().paused);
  }

  pause(reason = 'Manual pause requested') {
    const state = {
      paused: true,
      pausedAt: new Date().toISOString(),
      reason,
    };
    try {
      fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf8');
      logger.warn(`🛑 Cold outreach PAUSED: ${reason}`);
    } catch (err) {
      logger.error(`Failed to save pause state: ${err.message}`);
    }
    return state;
  }

  resume() {
    const state = {
      paused: false,
      resumedAt: new Date().toISOString(),
    };
    try {
      fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf8');
      logger.info('🟢 Cold outreach RESUMED');
    } catch (err) {
      logger.error(`Failed to save resume state: ${err.message}`);
    }
    return state;
  }
}

export const outreachSafetyController = new OutreachSafetyController();
export default outreachSafetyController;

