/**
 * ChromiumIdleGhostEmulation.js
 * 
 * Single responsibility: Execute periodic subtle scroll/cursor micro-movements to simulate active human presence.
 * Category: 2️⃣ Domain / Feature (src/connection/)
 * Law: Single Purpose File Law (< 350 lines). NEVER kills node.exe.
 */

export class ChromiumIdleGhostEmulation {
  constructor({ minIntervalMs = 60000, maxIntervalMs = 180000 } = {}) {
    this.minIntervalMs = minIntervalMs;
    this.maxIntervalMs = maxIntervalMs;
  }

  generateGhostAction() {
    const actions = ['SCROLL_DOWN', 'SCROLL_UP', 'MOUSE_MOVE_SLIGHT', 'IDLE_PAUSE'];
    const selected = actions[Math.floor(Math.random() * actions.length)];

    return {
      action: selected,
      deltaY: selected.includes('SCROLL') ? Math.floor(Math.random() * 250) - 100 : 0,
      nextDelayMs: Math.floor(Math.random() * (this.maxIntervalMs - this.minIntervalMs)) + this.minIntervalMs,
      executedAt: Date.now(),
    };
  }
}

export default new ChromiumIdleGhostEmulation();

