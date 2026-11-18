export function adaptStepMs(failureCount: number): number {
  return failureCount * 2500;
}
export default adaptStepMs;
