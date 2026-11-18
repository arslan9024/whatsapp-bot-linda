export function computeGaussianDelay(baseWpm: number = 42, lengthChars: number = 80): number {
  const words = lengthChars / 5;
  const standardTimeMs = (words / baseWpm) * 60 * 1000;
  const u = Math.random();
  const v = Math.random();
  const jitter = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(800, Math.round(standardTimeMs + jitter * 250));
}
export default computeGaussianDelay;
