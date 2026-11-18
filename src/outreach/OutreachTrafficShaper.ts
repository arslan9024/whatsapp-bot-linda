export function shapeTrafficInterval(baseMs: number): number {
  const jitter = (Math.random() - 0.5) * 500;
  return Math.round(baseMs + jitter);
}
export default shapeTrafficInterval;
