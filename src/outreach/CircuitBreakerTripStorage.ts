const breakerCounters = new Map<string, number>();

export function recordSendFailure(phone: string): number {
  const cur = (breakerCounters.get(phone) || 0) + 1;
  breakerCounters.set(phone, cur);
  return cur;
}

export function resetSendFailures(phone: string): void {
  breakerCounters.delete(phone);
}

export function isCircuitTripped(phone: string, threshold = 5): boolean {
  return (breakerCounters.get(phone) || 0) >= threshold;
}
export default { recordSendFailure, resetSendFailures, isCircuitTripped };
