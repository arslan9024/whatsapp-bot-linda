export function captureMetrics(activeBots: number, sentTotal: number) {
  return { activeBots, sentTotal, timestamp: Date.now() };
}
export default captureMetrics;
