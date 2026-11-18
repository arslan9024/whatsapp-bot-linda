export function computeSeenDelayMs(length: number): number {
  return Math.min(8000, Math.max(1200, length * 45));
}
export default computeSeenDelayMs;
