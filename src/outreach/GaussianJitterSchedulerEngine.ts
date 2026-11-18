export function computeNextDispatchDelay(targetWpm = 42, lengthChars = 90): number {
  const baseDelayMs = (lengthChars / 5 / targetWpm) * 60 * 1000;
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1 || 0.001)) * Math.cos(2.0 * Math.PI * u2);
  return Math.max(900, Math.round(baseDelayMs + z * 350));
}
export default computeNextDispatchDelay;
