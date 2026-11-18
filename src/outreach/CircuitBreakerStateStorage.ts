const breakerState = new Map<string, boolean>();

export function setCircuitOpen(phone: string, open: boolean): void {
  breakerState.set(phone, open);
}

export function isCircuitOpen(phone: string): boolean {
  return breakerState.get(phone) || false;
}
export default { setCircuitOpen, isCircuitOpen };
