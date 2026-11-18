export function selectBestAccountLine(accounts: { phone: string; sent: number; cap: number; connected: boolean }[]): string | null {
  const eligible = accounts.filter(a => a.connected && a.sent < a.cap);
  if (!eligible.length) return null;
  eligible.sort((a, b) => a.sent - b.sent);
  return eligible[0].phone;
}
export default selectBestAccountLine;
