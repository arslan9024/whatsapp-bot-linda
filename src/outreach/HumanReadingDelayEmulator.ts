export function calculateReadingDelayMs(textLength: number): number {
  return Math.min(7500, Math.max(1100, Math.round(textLength * 38)));
}
export default calculateReadingDelayMs;
