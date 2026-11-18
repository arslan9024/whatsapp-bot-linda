export function matchAgentByCommunity(cluster: string): string {
  if (/Amazon|Coursetia/i.test(cluster)) return '+971505760056';
  return '+971503869886';
}
export default matchAgentByCommunity;
