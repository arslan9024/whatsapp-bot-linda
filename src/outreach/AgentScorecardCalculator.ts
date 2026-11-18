export function calculateAgentScore(dispatched: number, replies: number): number {
  if (!dispatched) return 100;
  return Math.min(100, Math.round((replies / dispatched) * 100));
}
export default calculateAgentScore;
