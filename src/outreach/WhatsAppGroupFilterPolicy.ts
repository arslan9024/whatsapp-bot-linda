export function allowGroupBroadcast(isGroup: boolean): boolean {
  return !isGroup; // 1-to-1 direct messaging only
}
export default allowGroupBroadcast;
