/**
 * 24/7 Linda Bot memory heap guard (Point 70).
 */
export function isHeapWithinLimit(heapUsedBytes: number, maxMb = 512): boolean {
  return heapUsedBytes / (1024 * 1024) <= maxMb;
}
