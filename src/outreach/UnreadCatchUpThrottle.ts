export function calculateBatchWait(unreadCount: number): number {
  if (unreadCount > 20) return 4000;
  if (unreadCount > 5) return 2000;
  return 800;
}
export default calculateBatchWait;
