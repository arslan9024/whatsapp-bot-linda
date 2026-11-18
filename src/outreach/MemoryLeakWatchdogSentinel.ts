export function evaluateHeapThreshold(maxMb = 1250): { safe: boolean; heapMb: number } {
  const heapMb = Math.round(process.memoryUsage().heapUsed / 1048576);
  return { safe: heapMb < maxMb, heapMb };
}
export default evaluateHeapThreshold;
