/**
 * Dead-man switch watchdog for Linda WhatsApp sessions (Point 62).
 */
export class SessionWatchdog {
  private lastHeartbeatMs = Date.now();

  beat(nowMs = Date.now()): void {
    this.lastHeartbeatMs = nowMs;
  }

  isStale(maxSilenceMs = 120_000, nowMs = Date.now()): boolean {
    return nowMs - this.lastHeartbeatMs > maxSilenceMs;
  }
}
