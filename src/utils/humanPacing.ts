/**
 * Anti-ban humanized pacing & warm-up quota calculator for Linda Bot (Point 57).
 */
export function computeHumanTypingDelayMs(messageLength: number, jitterSeed = Math.random()): number {
  const base = Math.min(4500, Math.max(600, messageLength * 35));
  const jitter = Math.round((jitterSeed - 0.5) * 400);
  return Math.max(400, base + jitter);
}

export function getWarmupDailyQuota(accountAgeDays: number): number {
  if (accountAgeDays <= 3) return 20;
  if (accountAgeDays <= 7) return 50;
  if (accountAgeDays <= 14) return 120;
  return 300;
}
