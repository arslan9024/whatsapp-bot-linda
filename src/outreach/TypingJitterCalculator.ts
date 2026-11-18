export function calculateJitter(baseDelay: number): number {
  return baseDelay + Math.floor(Math.random() * 200 - 100);
}
export default calculateJitter;
