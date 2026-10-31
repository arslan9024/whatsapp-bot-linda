/**
 * Output/formatting helper methods for the bridge (mixin). Thin wrappers over
 * bridgeUtils so existing callers and tests keep using `bridge.captureOutput()` etc.
 */

import {
  normalizePhone,
  formatUptime,
  calculateHealthScore,
  captureConsoleOutput,
  chunkOutput,
} from './bridgeUtils.js';

export const outputMethods = {
  normalizePhone,

  _formatUptime: formatUptime,

  _calculateHealthScore: calculateHealthScore,

  captureOutput: captureConsoleOutput,

  async sendOutput(msg, output, fallback = 'No output') {
    if (!output || typeof output !== 'string' || !output.trim()) {
      await msg.reply(fallback);
      return;
    }
    for (const chunk of chunkOutput(output)) {
      await msg.reply(chunk);
    }
  },

  _trackCommand(command) {
    this.stats.totalCommands += 1;
    this.stats.lastCommand = command;
    this.stats.lastCommandTime = new Date();
    this.stats.commandsByName[command] = (this.stats.commandsByName[command] || 0) + 1;
  },
};

