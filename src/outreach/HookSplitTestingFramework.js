/**
 * HookSplitTestingFramework.js
 * 
 * Single responsibility: Multi-arm bandit split tester for outbound message intro hooks.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class HookSplitTestingFramework {
  constructor({ hooks = [] } = {}) {
    /** @type {Map<string, { sent: number, replied: number }>} */
    this.hooks = new Map();
    hooks.forEach(h => this.registerHook(h));
  }

  registerHook(hookText) {
    if (!this.hooks.has(hookText)) {
      this.hooks.set(hookText, { sent: 0, replied: 0 });
    }
  }

  selectHook() {
    const list = Array.from(this.hooks.keys());
    if (!list.length) return null;

    // Epsilon-greedy: 80% select top converting, 20% explore
    if (Math.random() > 0.2) {
      let bestHook = list[0];
      let bestRate = -1;

      for (const [hook, stats] of this.hooks.entries()) {
        const rate = stats.sent > 0 ? stats.replied / stats.sent : 0.1;
        if (rate > bestRate) {
          bestRate = rate;
          bestHook = hook;
        }
      }
      return bestHook;
    }

    return list[Math.floor(Math.random() * list.length)];
  }

  recordDispatch(hookText) {
    if (!this.hooks.has(hookText)) this.registerHook(hookText);
    this.hooks.get(hookText).sent++;
  }

  recordResponse(hookText) {
    if (this.hooks.has(hookText)) {
      this.hooks.get(hookText).replied++;
    }
  }
}

export default new HookSplitTestingFramework();

